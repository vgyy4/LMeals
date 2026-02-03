from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional

import crud, schemas, scraper, llm, allergen_checker, audio_processor, assets
import os
from database import SessionLocal
from assets import STATIC_DIR

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def background_generate_template(recipe_id: int):
    """Background task to generate instruction template for a recipe."""
    db = SessionLocal()
    try:
        recipe = crud.get_recipe(db, recipe_id=recipe_id)
        if recipe and recipe.instructions and not recipe.instruction_template:
            print(f"Background: Generating template for recipe {recipe_id}")
            template = llm.generate_instruction_template(recipe.instructions)
            if template:
                # Update manually to avoid full schema validation if needed
                recipe.instruction_template = template
                db.commit()
                print(f"Background: Template generated for recipe {recipe_id}")
    except Exception as e:
        print(f"Background Error: Failed to generate template for recipe {recipe_id}: {e}")
    finally:
        db.close()

def background_upgrade_frame_quality(source_url: str, timestamp: float, image_path: str):
    """Background task to upgrade a low-res frame to high-res."""
    import os
    import assets
    
    try:
        # Build absolute path to the image
        abs_path = os.path.join(assets.STATIC_DIR, image_path)
        
        if not os.path.exists(abs_path):
            print(f"Background: Image not found for upgrade: {abs_path}")
            return
            
        print(f"Background: Starting high-res upgrade for {image_path} at {timestamp}s...")
        success = audio_processor.download_high_res_frame(source_url, timestamp, abs_path)
        
        if success:
            print(f"Background: High-res upgrade successful for {image_path}")
        else:
            print(f"Background: High-res upgrade failed for {image_path}, keeping low-res version")
            
    except Exception as e:
        print(f"Background Error: Failed to upgrade frame quality: {e}")


@router.post("/scrape", response_model=schemas.ScrapeResponse)
def scrape_recipe(scrape_request: schemas.ScrapeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Scrapes a recipe from a URL.
    1. Tries to scrape using the recipe-scrapers library.
    2. If that fails, returns a status indicating AI is required.
    Note: Duplicate URL check removed to allow multiple recipes from same source.
    """
    try:
        # Ensure url is a string before passing to scraper
        recipe_data = scraper.scrape_with_library(str(scrape_request.url))
        if recipe_data:
            # Download image locally
            if recipe_data.get("image_url"):
                local_image = assets.download_image(str(recipe_data["image_url"]))
                if local_image:
                    recipe_data["image_url"] = local_image
            
            recipe_create = schemas.RecipeCreate(**recipe_data)
            new_recipe = crud.create_recipe(db, recipe=recipe_create)
            
            # Start background templating
            background_tasks.add_task(background_generate_template, new_recipe.id)
            
            # Manually construct and validate response to avoid hidden 500 errors in response validation
            response_obj = schemas.ScrapeResponse(status="success", recipe=new_recipe)
            return response_obj
    except Exception as e:
        print(f"ERROR during scraping execution: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Scraping failed: {str(e)}")
    
    # If library scraping fails, signal to the frontend that AI is an option
    return schemas.ScrapeResponse(status="ai_required", message="Standard scraping failed. Would you like to try with AI?")


@router.post("/scrape-ai")
def scrape_ai(scrape_request: schemas.ScrapeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Scrapes a recipe from a URL using AI. 
    Supports standard HTML pages and Video/Audio sources.
    Can detect and return multiple recipes from the same source.
    Note: Duplicate URL check removed to allow multiple recipes from same source.
    """
    url = str(scrape_request.url)
    recipe_data = {}
    is_video_audio = any(domain in url for domain in ["youtube.com", "youtu.be", "vimeo.com", "spotify.com", "facebook.com", "instagram.com"])

    if is_video_audio:
        try:
            print(f"Video/Audio detected: {url}")
            metadata = audio_processor.get_video_metadata(url)
            recipe_data["title"] = metadata["title"]
            recipe_data["image_url"] = metadata["thumbnail"] 
            
            transcript = ""
            scraped_image = None
            
            # 1. OPTIMIZATION: Check description for recipe link FIRST
            # If found, use it and SKIP slow audio transcription
            description = metadata.get("description", "")
            if description:
                print("Checking description for recipe links...")
                # Pass the video title to help the AI find the RELEVANT link
                recipe_link = llm.extract_recipe_link(description, video_title=metadata.get("title", ""))
                
                if recipe_link:
                    print(f"Found recipe link: {recipe_link}")
                    scraped_data = audio_processor.scrape_recipe_from_link(recipe_link)
                    
                    if scraped_data:
                        if scraped_data.get("html"):
                            # Treat the scraped content as the "transcript" for the AI
                            print("Using scraped content instead of audio transcription.")
                            transcript = f"Title: {metadata['title']}\n\n[RECIPE CONTENT FROM {recipe_link}]:\n{scraped_data['html']}"
                            
                        if scraped_data.get("image_url"):
                            print(f"Found image in scraped content: {scraped_data['image_url']}")
                            scraped_image = scraped_data["image_url"]
                            
            # 2. If no recipe link content, fallback to Subtitles/Audio
            if not transcript:
                # Try subtitles first
                subtitles = metadata.get("subtitles", {})
                if subtitles:
                    print("Fetching existing subtitles/captions...")
                    transcript = audio_processor.get_subtitle_text(url)
                    
                # Fallback to audio transcription
                if not transcript:
                    print("No active subtitles found. Proceeding with transcription...")
                    audio_file = audio_processor.download_audio(url)
                    chunks = audio_processor.chunk_audio(audio_file)
                    
                    texts = []
                    for chunk in chunks:
                        texts.append(llm.transcribe_audio(chunk))
                    
                    transcript = "\n".join(texts)
                    audio_processor.cleanup_files([audio_file] + chunks)

            # 3. Final fallback to description if everything else fails
            if not transcript:
                transcript = f"Title: {metadata['title']}\nDescription: {metadata['description']}"

            # Pass metadata (especially description) to help the AI when transcript is poor
            extracted = llm.extract_recipe_from_text(transcript, metadata=metadata)
            if not extracted:
                raise HTTPException(status_code=500, detail="AI failed to extract recipe from transcript.")
            
            # extracted is now an ARRAY of recipe dicts
            recipes_array = extracted
            
            # Store video frame candidates for later use
            # 4. Use Default Thumbnail if available
            default_thumbnail = metadata.get("thumbnail")

            # 5. Generate preview frames (0s, 5s, 10s, 15s)
            print(f"Generating preview frames for {url}...")
            candidates = audio_processor.capture_video_frames(url)
            
            # 6. If scraped image available, REPLACE the last option (15s frame) with it
            if scraped_image:
                print(f"Downloading scraped image from {scraped_image}...")
                scraped_img_local = assets.download_image(scraped_image)
                if scraped_img_local:
                    if candidates:
                        removed = candidates.pop() # Remove the last one (15s)
                        print(f"Removed 15s frame candidate: {removed}")
                    candidates.append(scraped_img_local)
                    print(f"Added scraped image as candidate: {scraped_img_local}")
            
        except Exception as e:
            print(f"ERROR: Video/Audio processing failed for {url}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Video/Audio processing error: {str(e)}")
    else:
        # Standard HTML Scraping
        html = scraper.get_html(scrape_request.url)
        if not html:
            raise HTTPException(status_code=400, detail="Could not fetch HTML from the URL.")

        try:
            extracted = llm.extract_with_groq(html)
            if not extracted:
                raise HTTPException(status_code=500, detail="AI failed to extract recipe data.")
            
            # extracted is now an ARRAY of recipe dicts
            recipes_array = extracted
            candidates = []  # No video frames for HTML
            default_thumbnail = None
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Now handle the array: single recipe = create immediately, multiple = return for selection
    print(f"DEBUG: AI returned {len(recipes_array)} recipe(s)")
    if len(recipes_array) == 1:
        # SINGLE RECIPE PATH (Backward Compatible)
        recipe_data = recipes_array[0]
        recipe_data['source_url'] = scrape_request.url

        # Sanitize ingredients
        ingredients_list = recipe_data.get("ingredients", [])
        sanitized_ingredients = []
        for i in ingredients_list:
            if isinstance(i, list):
                sanitized_ingredients.append(" ".join(str(x) for x in i))
            elif isinstance(i, dict):
                sanitized_ingredients.append(i.get("text", i.get("name", str(i))))
            else:
                sanitized_ingredients.append(str(i))
        recipe_data["ingredients"] = [{"text": i} for i in sanitized_ingredients]
        
        # Sanitize instructions
        instructions_list = recipe_data.get("instructions", [])
        sanitized_instructions = []
        for inst in instructions_list:
            if isinstance(inst, list):
                 sanitized_instructions.append(" ".join(str(x) for x in inst))
            elif isinstance(inst, dict):
                 sanitized_instructions.append(inst.get("text", str(inst)))
            else:
                 sanitized_instructions.append(str(inst))
        recipe_data["instructions"] = sanitized_instructions
        
        # Handle image - use default_thumbnail if available
        if not recipe_data.get("image_url") and default_thumbnail:
            recipe_data["image_url"] = default_thumbnail
        elif not recipe_data.get("image_url"):
            recipe_data["image_url"] = None
            
        # Download image if present
        if recipe_data.get("image_url"):
            local_image = assets.download_image(str(recipe_data["image_url"]))
            if local_image:
                recipe_data["image_url"] = local_image
                if candidates and local_image not in candidates:
                    candidates.insert(0, local_image)

        # Create recipe in DB
        recipe_create = schemas.RecipeCreate(**recipe_data)
        new_recipe = crud.create_recipe(db, recipe=recipe_create)
        
        # Start background templating
        background_tasks.add_task(background_generate_template, new_recipe.id)
        
        return schemas.ScrapeResponse(
            status="success", 
            recipe=new_recipe, 
            image_candidates=candidates if candidates else None
        )
    
    else:
        # MULTIPLE RECIPES PATH - Return as temporary objects for frontend selection
        # Don't create DB entries yet, let user select which ones to import
        temp_recipes = []
        
        for recipe_dict in recipes_array:
            recipe_dict['source_url'] = scrape_request.url
            
            # Sanitize ingredients
            ingredients_list = recipe_dict.get("ingredients", [])
            sanitized_ingredients = []
            for i in ingredients_list:
                if isinstance(i, list):
                    sanitized_ingredients.append(" ".join(str(x) for x in i))
                elif isinstance(i, dict):
                    sanitized_ingredients.append(i.get("text", i.get("name", str(i))))
                else:
                    sanitized_ingredients.append(str(i))
            recipe_dict["ingredients"] = [{"text": i} for i in sanitized_ingredients]
            
            # Sanitize instructions
            instructions_list = recipe_dict.get("instructions", [])
            sanitized_instructions = []
            for inst in instructions_list:
                if isinstance(inst, list):
                     sanitized_instructions.append(" ".join(str(x) for x in inst))
                elif isinstance(inst, dict):
                     sanitized_instructions.append(inst.get("text", str(inst)))
                else:
                     sanitized_instructions.append(str(inst))
            recipe_dict["instructions"] = sanitized_instructions
            
            # Set default thumbnail if no image
            if not recipe_dict.get("image_url") and default_thumbnail:
                recipe_dict["image_url"] = default_thumbnail
            elif not recipe_dict.get("image_url"):
                recipe_dict["image_url"] = None
            
            # Create temp recipe object (not saved to DB yet)
            temp_recipes.append(recipe_dict)
        
        # Return multi-recipe response for frontend selection
        return schemas.MultiRecipeResponse(
            status="multi_recipe",
            recipes=temp_recipes,
            image_candidates=candidates if candidates else None
        )


@router.post("/upload-temp-image")
async def upload_temp_image(file: UploadFile = File(...)):
    """
    Uploads a temporary image to the candidates directory for the gallery.
    """
    import assets
    import uuid
    import shutil
    import os
    
    output_dir = os.path.join(assets.IMAGES_DIR, "candidates")
    os.makedirs(output_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    # Keep original extension if possible
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"upload_{file_id}{ext}"
    filepath = os.path.join(output_dir, filename)
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        relative_path = f"images/recipes/candidates/{filename}"
        print(f"DEBUG: Manually uploaded image saved to {relative_path}")
        return {"status": "success", "url": relative_path}
    except Exception as e:
        print(f"Error uploading temp image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def delayed_cleanup_files(files_to_delete: List[str], keep_file: Optional[str] = None):
    """
    Waits 10 seconds and deletes files.
    """
    import time
    import assets
    time.sleep(10)
    print(f"Background: Starting cleanup of {len(files_to_delete)} candidates...")
    
    for f in files_to_delete:
        if not f: continue
        # Don't delete the one we want to keep!
        if keep_file and f == keep_file:
            continue
            
        assets.delete_image(f)

@router.post("/cleanup-images")
def cleanup_images_endpoint(payload: schemas.CleanupRequest, background_tasks: BackgroundTasks):
    """
    Triggers background deletion of rejected image candidates.
    """
    background_tasks.add_task(delayed_cleanup_files, payload.files_to_delete, payload.keep_file)
    return {"status": "queued"}

@router.post("/finalize-scrape", response_model=schemas.ScrapeResponse)
def finalize_scrape(payload: schemas.FinalizeScrapeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Finalizes a scrape by setting the chosen image and cleaning up candidates.
    Moves the chosen image from candidates/ to images/ to make it permanent.
    """
    import shutil
    import os
    import assets
    
    recipe_id = payload.recipe_data.id
    chosen_image = payload.chosen_image
    
    # 1. Update the recipe in DB
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # 2. If chosen image is in candidates, move it to permanent storage
    final_image_path = chosen_image
    if "candidates/" in chosen_image:
        try:
            filename = os.path.basename(chosen_image)
            source_path = os.path.join(assets.IMAGES_DIR, "candidates", filename)
            dest_filename = filename.replace("upload_", "").replace("frame_", "selected_")
            dest_path = os.path.join(assets.IMAGES_DIR, dest_filename)
            
            if os.path.exists(source_path):
                # CHECK FOR FRAME CANDIDATE
                import re
                # Candidate filename format: {uuid}_frame_{timestamp}s.jpg
                match = re.search(r'_frame_(\d+(\.\d+)?)s', filename)
                
                # Move the low-res frame immediately
                shutil.move(source_path, dest_path)
                final_image_path = f"images/recipes/{dest_filename}"
                print(f"DEBUG: Moved candidate image to permanent storage: {final_image_path}")
                
                # If it's a video frame, trigger background upgrade to high-res
                if match:
                    try:
                        timestamp = float(match.group(1))
                        source_url = payload.recipe_data.source_url
                        
                        if source_url:
                            # Schedule background upgrade - this will overwrite the file with high-res
                            print(f"DEBUG: Scheduling background high-res upgrade for frame at {timestamp}s...")
                            background_tasks.add_task(
                                background_upgrade_frame_quality,
                                str(source_url),
                                timestamp,
                                final_image_path
                            )
                    except Exception as e:
                        print(f"ERROR scheduling background upgrade: {e}")
        except Exception as e:
            print(f"ERROR moving candidate image: {e}")
            # Fallback: keep the original path if move fails
            pass

    # Update DB
    db_recipe.image_url = final_image_path
    db.commit()
    db.refresh(db_recipe)
    
    # 3. Trigger cleanup for other candidates
    if payload.candidates_to_cleanup:
        # We pass the full list and the original chosen path (before move) to keep
        # Wait, if we moved it, the source path doesn't exist anymore anyway.
        # But delayed_cleanup uses delete_image which prepends IMAGES_DIR...
        # Let's ensure candidate cleanup works.
        background_tasks.add_task(delayed_cleanup_files, payload.candidates_to_cleanup, chosen_image)
        
    return schemas.ScrapeResponse(status="success", recipe=db_recipe)


@router.post("/finalize-multi-scrape")
def finalize_multi_scrape(
    payload: schemas.FinalizeMultiScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Finalizes a multi-recipe scrape by batch-creating recipes with assigned images.
    """
    created_recipes = []
    
    for idx, recipe_dict in enumerate(payload.recipes_data):
        # Get assigned image for this recipe
        assigned_image = payload.image_assignments.get(str(idx))  # JSON keys are strings
        
        # Handle image assignment
        if assigned_image and "candidates/" in assigned_image:
            # Image is in temp candidates folder, move to permanent storage
            try:
                # Extract just the filename from the candidates path
                candidate_filename = os.path.basename(assigned_image)
                
                # Create new filename for permanent storage
                name_parts = candidate_filename.rsplit('_frame_', 1)
                prefix = name_parts[0] if len(name_parts) > 1 else candidate_filename.split('.')[0]
                ext = candidate_filename.split('.')[-1]
                new_filename = f"{prefix}_selected.{ext}"
                
                # Full paths
                # Full paths
                import assets
                candidates_dir = os.path.join(assets.STATIC_DIR, "images", "recipes", "candidates")
                images_dir = os.path.join(assets.STATIC_DIR, "images", "recipes")
                old_path = os.path.join(candidates_dir, candidate_filename)
                new_path = os.path.join(images_dir, new_filename)
                
                # Move file
                import shutil
                shutil.copy2(old_path, new_path)
                
                # Return relative path
                final_image_path = f"images/recipes/{new_filename}"
                recipe_dict["image_url"] = final_image_path
                print(f"DEBUG: Moved candidate to: {final_image_path}")
            except Exception as e:
                print(f"ERROR: Failed to move candidate image: {e}")
                recipe_dict["image_url"] = None
        elif assigned_image:
            # Image is already in permanent storage
            recipe_dict["image_url"] = assigned_image
        else:
            # No image assigned
            recipe_dict["image_url"] = None
        
        # Create recipe in DB - convert dict to RecipeCreate
        try:
            recipe_create = schemas.RecipeCreate(**recipe_dict)
            new_recipe = crud.create_recipe(db, recipe=recipe_create)
            created_recipes.append(new_recipe)
            
            # Start background templating for this recipe
            background_tasks.add_task(background_generate_template, new_recipe.id)
        except Exception as e:
            print(f"Error creating recipe {idx}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to create recipe: {str(e)}")
    
    return {
        "status": "success",
        "created_count": len(created_recipes),
        "recipes": created_recipes
    }



@router.get("/recipes", response_model=List[schemas.Recipe])
def read_recipes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    recipes = crud.get_recipes(db, skip=skip, limit=limit)
    
    # Get all allergens once for efficiency
    allergens = crud.get_allergens(db)
    
    # Add has_allergens to each recipe using translation-based checking
    for recipe in recipes:
        recipe.has_allergens = allergen_checker.check_recipe_allergens(recipe, allergens)
    
    return recipes

@router.get("/recipes/favorites", response_model=List[schemas.Recipe])
def read_favorite_recipes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    recipes = crud.get_favorite_recipes(db, skip=skip, limit=limit)
    
    # Get all allergens once for efficiency
    allergens = crud.get_allergens(db)
    
    # Add has_allergens to each recipe using translation-based checking
    for recipe in recipes:
        recipe.has_allergens = allergen_checker.check_recipe_allergens(recipe, allergens)
    
    return recipes

@router.get("/recipes/{recipe_id}", response_model=schemas.Recipe)
def read_recipe(recipe_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    if db_recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Auto-generate template if missing when reading
    if db_recipe.instructions and not db_recipe.instruction_template:
        background_tasks.add_task(background_generate_template, db_recipe.id)
        
    return db_recipe

@router.put("/recipes/{recipe_id}/favorite", response_model=schemas.Recipe)
def set_recipe_favorite(recipe_id: int, is_favorite: bool, db: Session = Depends(get_db)):
    db_recipe = crud.set_favorite_status(db, recipe_id=recipe_id, is_favorite=is_favorite)
    if db_recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db_recipe

@router.put("/recipes/{recipe_id}/scrape-ai", response_model=schemas.Recipe)
def update_recipe_with_ai(recipe_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Re-scrapes a recipe's source URL using the Groq API and updates the existing recipe.
    """
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    html = scraper.get_html(db_recipe.source_url)
    if not html:
        raise HTTPException(status_code=400, detail="Could not fetch HTML from the recipe's source URL.")

    recipe_data = llm.extract_with_groq(html)
    if not recipe_data:
        raise HTTPException(status_code=500, detail="AI failed to extract recipe data.")

    recipe_data['source_url'] = db_recipe.source_url
    ingredients_list = recipe_data.get("ingredients", [])
    recipe_data["ingredients"] = [{"text": i} for i in ingredients_list]

    # Reset template so it regenerates
    recipe_data["instruction_template"] = None

    # Download image locally
    if recipe_data.get("image_url"):
        # Cleanup old image if it was local
        if db_recipe.image_url and not str(db_recipe.image_url).startswith("http"):
            assets.delete_image(str(db_recipe.image_url))
            
        local_image = assets.download_image(str(recipe_data["image_url"]))
        if local_image:
            recipe_data["image_url"] = local_image

    recipe_update = schemas.RecipeCreate(**recipe_data)
    updated_recipe = crud.update_recipe(db, recipe_id=recipe_id, recipe=recipe_update)
    
    # Start background templating
    background_tasks.add_task(background_generate_template, updated_recipe.id)
    
    return updated_recipe

@router.delete("/recipes/{recipe_id}", status_code=204)
def delete_recipe_endpoint(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = crud.get_recipe(db, recipe_id)
    if db_recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    crud.delete_recipe(db, recipe_id=recipe_id)
    return
