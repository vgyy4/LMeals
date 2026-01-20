from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import crud, schemas, scraper, llm, allergen_checker
from database import SessionLocal

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/scrape", response_model=schemas.ScrapeResponse)
def scrape_recipe(scrape_request: schemas.ScrapeRequest, db: Session = Depends(get_db)):
    """
    Scrapes a recipe from a URL.
    1. Checks if the recipe already exists.
    2. Tries to scrape using the recipe-scrapers library.
    3. If that fails, returns a status indicating AI is required.
    """
    existing_recipe = crud.get_recipe_by_source_url(db, source_url=str(scrape_request.url))
    if existing_recipe:
        return {"status": "exists", "recipe": existing_recipe}

    # Ensure url is a string before passing to scraper
    recipe_data = scraper.scrape_with_library(str(scrape_request.url))
    if recipe_data:
        recipe_create = schemas.RecipeCreate(**recipe_data)
        new_recipe = crud.create_recipe(db, recipe=recipe_create)
        return {"status": "success", "recipe": new_recipe}
    
    # If library scraping fails, signal to the frontend that AI is an option
    return {"status": "ai_required", "message": "Standard scraping failed. Would you like to try with AI?"}


@router.post("/scrape-ai", response_model=schemas.ScrapeResponse)
def scrape_ai(scrape_request: schemas.ScrapeRequest, db: Session = Depends(get_db)):
    """
    Scrapes a recipe from a URL using the Groq AI, after user confirmation.
    """
    html = scraper.get_html(scrape_request.url)
    if not html:
        raise HTTPException(status_code=400, detail="Could not fetch HTML from the URL.")

    try:
        recipe_data = llm.extract_with_groq(html)
        if not recipe_data:
            raise HTTPException(status_code=500, detail="AI failed to extract recipe data.")
    except Exception as e:
        error_message = str(e)
        status_code = 500
        if "rate limit" in error_message.lower():
            status_code = 429
            error_message = "Groq API rate limit exceeded."
        raise HTTPException(status_code=status_code, detail=error_message)

    # The data from the LLM needs to be shaped into our RecipeCreate schema
    recipe_data['source_url'] = scrape_request.url

    # Ingredients from LLM are a list of strings, but our schema expects a list of objects
    ingredients_list = recipe_data.get("ingredients", [])
    recipe_data["ingredients"] = [{"text": i} for i in ingredients_list]
    
    # Handle empty image_url (Pydantic HttpUrl doesn't accept empty strings)
    if not recipe_data.get("image_url"):
        recipe_data["image_url"] = None

    recipe_create = schemas.RecipeCreate(**recipe_data)
    new_recipe = crud.create_recipe(db, recipe=recipe_create)
    return {"status": "success", "recipe": new_recipe}


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
def read_recipe(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = crud.get_recipe(db, recipe_id=recipe_id)
    if db_recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db_recipe

@router.put("/recipes/{recipe_id}/favorite", response_model=schemas.Recipe)
def set_recipe_favorite(recipe_id: int, is_favorite: bool, db: Session = Depends(get_db)):
    db_recipe = crud.set_favorite_status(db, recipe_id=recipe_id, is_favorite=is_favorite)
    if db_recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db_recipe

@router.put("/recipes/{recipe_id}/scrape-ai", response_model=schemas.Recipe)
def update_recipe_with_ai(recipe_id: int, db: Session = Depends(get_db)):
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

    recipe_update = schemas.RecipeCreate(**recipe_data)
    updated_recipe = crud.update_recipe(db, recipe_id=recipe_id, recipe=recipe_update)
    return updated_recipe

@router.delete("/recipes/{recipe_id}", status_code=204)
def delete_recipe_endpoint(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = crud.get_recipe(db, recipe_id)
    if db_recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    crud.delete_recipe(db, recipe_id=recipe_id)
    return
