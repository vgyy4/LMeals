from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import crud
import schemas
import scraper as scraper_service
import llm
from database import SessionLocal

router = APIRouter()

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/scrape", response_model=schemas.ScrapeResponse)
def scrape_recipe(scrape_request: schemas.ScrapeRequest, db: Session = Depends(get_db)):
    """
    Scrapes a recipe from a URL. First attempts to use a standard library,
    if that fails, it returns the raw HTML for the client to decide on using AI.
    """
    # Check if the recipe already exists
    existing_recipe = crud.get_recipe_by_source_url(db, source_url=str(scrape_request.url))
    if existing_recipe:
        return {"status": "exists", "recipe": existing_recipe}

    # Attempt to scrape with the library
    recipe_data = scraper_service.scrape_with_library(str(scrape_request.url))
    if recipe_data:
        recipe_create = schemas.RecipeCreate(**recipe_data, source_url=scrape_request.url)
        new_recipe = crud.create_recipe(db, recipe_create)
        return {"status": "success", "recipe": new_recipe}

    # If the library fails, get the HTML and let the user decide
    html = scraper_service.get_html(str(scrape_request.url))
    if html:
        return {"status": "ai_required", "html": html, "message": "Standard import failed. Try with advanced AI import?"}
    
    return {"status": "failed", "message": "Could not retrieve content from the URL."}


@router.post("/scrape-with-ai", response_model=schemas.ScrapeResponse)
def scrape_with_ai(request: schemas.ScrapeRequest, settings: schemas.GroqSettings, db: Session = Depends(get_db)):
    """
    Uses the Groq API to extract recipe data from HTML and creates a new recipe.
    """
    html = scraper_service.get_html(str(request.url))
    if not html:
        raise HTTPException(status_code=400, detail="Could not fetch HTML from the provided URL.")

    try:
        recipe_data = llm.extract_with_groq(html, api_key=settings.api_key, model=settings.model)
        if recipe_data:
            # Add the source_url to the data before creating the recipe
            recipe_data['source_url'] = str(request.url)
            
            # The ingredients from the LLM are a list of strings, need to convert them
            ingredients_list = recipe_data.get("ingredients", [])
            recipe_data["ingredients"] = [{"text": i} for i in ingredients_list]

            recipe_create = schemas.RecipeCreate(**recipe_data)
            new_recipe = crud.create_recipe(db, recipe_create)
            return {"status": "success", "recipe": new_recipe}
        
        raise HTTPException(status_code=500, detail="Failed to extract recipe data using the AI.")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Catch potential rate limit errors etc.
        error_message = str(e)
        status_code = 500
        if "rate limit" in error_message.lower():
            status_code = 429 # Too Many Requests
            error_message = "Groq API rate limit exceeded. Please check your account and try again in a few minutes."
        
        raise HTTPException(status_code=status_code, detail=error_message)


@router.get("/recipes", response_model=List[schemas.Recipe])
def read_recipes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    recipes = crud.get_recipes(db, skip=skip, limit=limit)
    return recipes

@router.get("/recipes/{recipe_id}", response_model=schemas.Recipe)
def read_recipe(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    if db_recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db_recipe

@router.put("/recipes/{recipe_id}/scrape-with-ai", response_model=schemas.Recipe)
def update_recipe_with_ai(recipe_id: int, settings: schemas.GroqSettings, db: Session = Depends(get_db)):
    """
    Re-scrapes a recipe's source URL using the Groq API and updates the existing recipe.
    """
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    html = scraper_service.get_html(db_recipe.source_url)
    if not html:
        raise HTTPException(status_code=400, detail="Could not fetch HTML from the recipe's source URL.")

    try:
        recipe_data = llm.extract_with_groq(html, api_key=settings.api_key, model=settings.model)
        if recipe_data:
            recipe_data['source_url'] = db_recipe.source_url
            ingredients_list = recipe_data.get("ingredients", [])
            recipe_data["ingredients"] = [{"text": i} for i in ingredients_list]

            recipe_update = schemas.RecipeCreate(**recipe_data)
            updated_recipe = crud.update_recipe(db, recipe_id=recipe_id, recipe=recipe_update)
            return updated_recipe

        raise HTTPException(status_code=500, detail="Failed to extract recipe data using the AI.")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_message = str(e)
        status_code = 500
        if "rate limit" in error_message.lower():
            status_code = 429
            error_message = "Groq API rate limit exceeded."

        raise HTTPException(status_code=status_code, detail=error_message)


@router.delete("/recipes/{recipe_id}", response_model=schemas.Recipe)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = crud.delete_recipe(db, recipe_id=recipe_id)
    if db_recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db_recipe
