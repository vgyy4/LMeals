from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import crud
import schemas
from database import SessionLocal

router = APIRouter()

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import llm

@router.post("/allergens", response_model=schemas.Allergen)
def create_allergen(allergen: schemas.AllergenCreate, db: Session = Depends(get_db)):
    db_allergen = crud.get_allergen_by_name(db, name=allergen.name)
    if db_allergen:
        raise HTTPException(status_code=400, detail="Allergen already exists")
    
    # Expand keywords using LLM
    keywords = llm.expand_allergen_keywords(allergen.name)
    
    return crud.create_allergen(db=db, allergen=allergen, keywords=keywords)

@router.get("/allergens", response_model=List[schemas.Allergen])
def read_allergens(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    allergens = crud.get_allergens(db, skip=skip, limit=limit)
    return allergens

@router.delete("/allergens/{allergen_id}", response_model=schemas.Allergen)
def delete_allergen(allergen_id: int, db: Session = Depends(get_db)):
    db_allergen = crud.delete_allergen(db, allergen_id=allergen_id)
    if db_allergen is None:
        raise HTTPException(status_code=404, detail="Allergen not found")
    return db_allergen
