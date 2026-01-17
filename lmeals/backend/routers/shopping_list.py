from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import date

import crud
import schemas
from database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/shopping-list", response_model=List[str])
def get_shopping_list(start_date: date, end_date: date, db: Session = Depends(get_db)):
    """
    Generates a shopping list by aggregating unique ingredients from all recipes
    within the specified date range in the meal plan.
    """
    entries = crud.get_meal_plan_entries(db, start_date=str(start_date), end_date=str(end_date))

    # Using a set to store unique ingredient texts
    unique_ingredients = set()

    for entry in entries:
        for ingredient in entry.recipe.ingredients:
            unique_ingredients.add(ingredient.text)

    return sorted(list(unique_ingredients))
