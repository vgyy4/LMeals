from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional

import crud, schemas, scraper, llm, allergen_checker, audio_processor, assets
from database import SessionLocal

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

@router.post("/scrape", response_model=schemas.ScrapeResponse)
def scrape_recipe(scrape_request: schemas.ScrapeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Scrapes a recipe from a URL.
    1. Checks if the recipe already exists.
    2. Tries to scrape using the recipe-scrapers library.
    3. If that fails, returns a status indicating AI is required.
    """
    existing_recipe = crud.get_recipe_by_source_url(db, source_url=str(scrape_request.url))
    if existing_recipe:
        # Trigger template generation if it's missing (legacy recipes)
        if not existing_recipe.instruction_template:
            background_tasks.add_task(background_generate_template, existing_recipe.id)
        return {"status": "exists", "recipe": existing_recipe}

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


@router.post("/scrape-ai", response_model=schemas.ScrapeResponse)
def scrape_ai(scrape_request: schemas.ScrapeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Scrapes a recipe from a URL using AI. 
    Supports standard HTML pages and Video/Audio sources.
    """
    # Check if URL already exists to avoid IntegrityError
    existing_recipe = crud.get_recipe_by_source_url(db, source_url=str(scrape_request.url))
    if existing_recipe:
        # Trigger template generation if missing
        if not existing_recipe.instruction_template:
            background_tasks.add_task(background_generate_template, existing_recipe.id)
        return schemas.ScrapeResponse(status="exists", recipe=existing_recipe, message="Recipe already exists.")

    url = str(scrape_request.url)
    recipe_data = {}
    is_video_audio = any(domain in url for domain in ["youtube.com", "youtu.be", "vimeo.com", "spotify.com", "facebook.com", "instagram.com"])

    if is_video_audio:
        try:
            print(f"Video/Audio detected: {url}")
            metadata = audio_processor.get_video_metadata(url)
            recipe_data["title"] = metadata["title"]
            recipe_data["image_url"] = metadata["thumbnail"] 
            
            # 1. Try subtitles first
            transcript = ""
            subtitles = metadata.get("subtitles", {})
            if subtitles:
                print("Fetching existing subtitles/captions...")
                transcript = audio_processor.get_subtitle_text(url)
                
            # 2. Fallback to audio transcription if subtitles were empty or missing
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
            
            recipe_data.update(extracted)
            
            # 4. Use Default Thumbnail if available
            if metadata.get("thumbnail"):
                recipe_data["image_url"] = metadata["thumbnail"]

            # 5. Capture additional frames for selection
            print("Capturing video frames for selection...")
            candidates = audio_processor.capture_video_frames(url)
            if candidates:
                # Add the original thumbnail to candidates if specific
                recipe_data["image_candidates"] = candidates
            
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
            recipe_data.update(extracted)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # The data from the LLM needs to be shaped into our RecipeCreate schema
    recipe_data['source_url'] = scrape_request.url

    # Ingredients from LLM are a list of strings, but our schema expects a list of objects
    ingredients_list = recipe_data.get("ingredients", [])
    sanitized_ingredients = []
    for i in ingredients_list:
        if isinstance(i, list):
            # If AI returns a list (e.g. [['qty:1']]), join it or take the first element
            sanitized_ingredients.append(" ".join(str(x) for x in i))
        elif isinstance(i, dict):
            # If AI returns a dict, try to get a 'text' or 'name' field, or stringify
            sanitized_ingredients.append(i.get("text", i.get("name", str(i))))
        else:
            sanitized_ingredients.append(str(i))
            
    recipe_data["ingredients"] = [{"text": i} for i in sanitized_ingredients]
    
    # Sanitize instructions to ensure they are all strings
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
    
    # Handle empty image_url
    if not recipe_data.get("image_url"):
        recipe_data["image_url"] = None

    # Standard download and create path
    # NOTE: If we have candidates, we might want to defer this download until the user chooses?
    # BUT for now, let's keep the default behavior: download the one the AI picked (thumbnail)
    # The frontend will allow overriding this.
    if recipe_data.get("image_url"):
        local_image = assets.download_image(str(recipe_data["image_url"]))
        if local_image:
            recipe_data["image_url"] = local_image
            
            # If we have candidates, add the downloaded thumbnail to the list if it's not already there
            # (Though candidates are usually distinct from the thumbnail URL, so we can just append)
            if recipe_data.get("image_candidates"):
                 # Make sure we don't duplicate
                 if local_image not in recipe_data["image_candidates"]:
                     recipe_data["image_candidates"].insert(0, local_image)

    recipe_create = schemas.RecipeCreate(**recipe_data)
    new_recipe = crud.create_recipe(db, recipe=recipe_create)
    
    # Start background templating
    background_tasks.add_task(background_generate_template, new_recipe.id)
    
    response_obj = schemas.ScrapeResponse(
        status="success", 
        recipe=new_recipe, 
        image_candidates=recipe_data.get("image_candidates")
    )
    return response_obj


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
                shutil.move(source_path, dest_path)
                final_image_path = f"images/recipes/{dest_filename}"
                print(f"DEBUG: Moved candidate image to permanent storage: {final_image_path}")
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
