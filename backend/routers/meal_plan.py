from fastapi import APIRouter, Depends, HTTPException
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

@router.get("/meal-plan", response_model=List[schemas.MealPlanEntry])
def read_meal_plan_entries(start_date: date, end_date: date, db: Session = Depends(get_db)):
    return crud.get_meal_plan_entries(db, start_date=str(start_date), end_date=str(end_date))

@router.post("/meal-plan", response_model=schemas.MealPlanEntry)
def create_meal_plan_entry(entry: schemas.MealPlanEntryCreate, db: Session = Depends(get_db)):
    return crud.create_meal_plan_entry(db, entry=entry)

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

@router.delete("/meal-plan/{entry_id}", response_model=schemas.MealPlanEntry)
def delete_meal_plan_entry(entry_id: int, db: Session = Depends(get_db)):
    db_entry = crud.delete_meal_plan_entry(db, entry_id=entry_id)
    if db_entry is None:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")
    return db_entry
