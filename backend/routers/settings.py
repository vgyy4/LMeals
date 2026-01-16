from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import crud, schemas
from database import SessionLocal

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/settings", response_model=schemas.Setting)
def read_settings(db: Session = Depends(get_db)):
    """
    Retrieve the current application settings.
    """
    settings = crud.get_settings(db)
    return settings

@router.post("/settings", response_model=schemas.Setting)
def update_settings(settings: schemas.SettingUpdate, db: Session = Depends(get_db)):
    """
    Update the application settings.
    """
    return crud.create_or_update_settings(db=db, settings=settings)
