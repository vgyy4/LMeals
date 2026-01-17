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

@router.get("/settings", response_model=List[schemas.Setting])
def read_settings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    settings = crud.get_settings(db, skip=skip, limit=limit)
    return settings

@router.get("/settings/{key}", response_model=schemas.Setting)
def read_setting(key: str, db: Session = Depends(get_db)):
    db_setting = crud.get_setting(db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return db_setting

@router.post("/settings", response_model=schemas.Setting)
def create_or_update_setting(setting: schemas.SettingCreate, db: Session = Depends(get_db)):
    return crud.update_setting(db=db, key=setting.key, value=setting.value)
