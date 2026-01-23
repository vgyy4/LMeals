from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile
from sqlalchemy.orm import Session
from typing import List

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
    url = str(scrape_request.url)
    recipe_data = {}
    is_video_audio = any(domain in url for domain in ["youtube.com", "youtu.be", "vimeo.com", "spotify.com", "facebook.com", "instagram.com"])

    candidate_images = []
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

            extracted = llm.extract_recipe_from_text(transcript)
            if not extracted:
                raise HTTPException(status_code=500, detail="AI failed to extract recipe from transcript.")
            
            recipe_data.update(extracted)
            
            # 4. Generate Thumbnail Gallery for Videos
            # SIMPLIFIED: Using hardcoded timestamps as requested (0s, 5s, 10s, 15s)
            if metadata.get("duration", 0) > 0:
                print("Generating candidates using hardcoded timestamps...")
                timestamps = [0, 5, 10, 15]
                # Ensure timestamps are within duration
                timestamps = [t for t in timestamps if t <= metadata["duration"]]
                
                candidate_images = audio_processor.capture_frames(url, timestamps)
                
                # GRACEFUL DEGRADATION: If frame capture failed, just use the thumbnail
                if not candidate_images and metadata["thumbnail"]:
                    print("DEBUG: Frame capture failed, using only the default thumbnail")
                    candidate_images = [metadata["thumbnail"]]
                elif metadata["thumbnail"]:
                    # Keep original thumbnail as first option if it exists
                    candidate_images.insert(0, metadata["thumbnail"])

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
    if candidate_images:
        # For the preview (schemas.Recipe), we need mock IDs
        recipe_data["ingredients"] = [{"text": i, "id": 0, "recipe_id": 0} for i in ingredients_list]
    else:
        # For creation (schemas.RecipeCreate), we just need the text
        recipe_data["ingredients"] = [{"text": i} for i in ingredients_list]
    
    # Handle empty image_url
    if not recipe_data.get("image_url"):
        recipe_data["image_url"] = None

    # For videos with gallery, don't create yet - let user choose first
    if candidate_images:
        return schemas.ScrapeResponse(
            status="needs_image_selection", 
            recipe=schemas.Recipe(**{**recipe_data, "id": 0, "created_at": "2024-01-01T00:00:00"}), # Mock ID for schema
            candidate_images=candidate_images
        )

    # Standard download and create path for non-videos or videos without gallery
    if recipe_data.get("image_url"):
        local_image = assets.download_image(str(recipe_data["image_url"]))
        if local_image:
            recipe_data["image_url"] = local_image

    recipe_create = schemas.RecipeCreate(**recipe_data)
    new_recipe = crud.create_recipe(db, recipe=recipe_create)
    
    # Start background templating
    background_tasks.add_task(background_generate_template, new_recipe.id)
    
    return {"status": "success", "recipe": new_recipe}


@router.post("/finalize-scrape", response_model=schemas.ScrapeResponse)
def finalize_scrape(request: schemas.FinalizeScrapeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Creates a recipe after the user has selected an image from the gallery.
    Moves the chosen image to final storage and cleans up others.
    """
    recipe_dict = request.recipe_data.dict()
    
    # Process the chosen image
    chosen_image = request.chosen_image
    final_image_url = None
    
    if chosen_image:
        if chosen_image.startswith("http"):
            # External thumbnail chosen
            final_image_url = assets.download_image(chosen_image)
        else:
            # Temporary candidate or uploaded image chosen - move to final dir
            import shutil
            import uuid
            import os
            
            # Extract filename and determine destination
            filename = os.path.basename(chosen_image)
            final_filename = f"{uuid.uuid4()}.jpg"
            src = os.path.join(assets.STATIC_DIR, chosen_image)
            dest = os.path.join(assets.IMAGES_DIR, final_filename)
            
            try:
                if os.path.exists(src):
                    shutil.copy2(src, dest)
                    final_image_url = f"images/recipes/{final_filename}"
                    print(f"DEBUG: Moved chosen image {src} -> {dest}")
            except Exception as e:
                print(f"Error moving chosen image: {e}")

    recipe_dict["image_url"] = final_image_url
    recipe_create = schemas.RecipeCreate(**recipe_dict)
    new_recipe = crud.create_recipe(db, recipe=recipe_create)
    
    # Cleanup all candidates
    for cand in request.candidates_to_cleanup:
        try:
            full_path = os.path.join(assets.STATIC_DIR, cand)
            if os.path.exists(full_path):
                os.remove(full_path)
        except:
            pass
            
    # Start background templating
    background_tasks.add_task(background_generate_template, new_recipe.id)
    
    return {"status": "success", "recipe": new_recipe}


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
