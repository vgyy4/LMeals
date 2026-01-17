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

@router.get("", response_model=List[schemas.Setting])
def read_settings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    settings = crud.get_settings(db, skip=skip, limit=limit)
    return settings

@router.post("", response_model=schemas.Setting)
def create_or_update_setting(setting: schemas.SettingCreate, db: Session = Depends(get_db)):
    return crud.update_setting(db=db, key=setting.key, value=setting.value)

@router.post("/verify-groq")
def verify_groq_key(setting: schemas.SettingCreate):
    """
    Verifies the Groq API key by attempting to list models.
    This is more reliable than chat completions as it doesn't depend on a specific model name.
    """
    import requests
    try:
        headers = {
            "Authorization": f"Bearer {setting.value}",
            "Content-Type": "application/json"
        }
        # Listing models is a standard way to check auth for OpenAI-compatible APIs
        response = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
        
        if response.status_code == 200:
            return {"status": "success", "message": "API Key is valid!"}
        elif response.status_code == 401:
            return {"status": "error", "message": "Invalid API Key (401 Unauthorized)."}
        else:
            return {"status": "error", "message": f"Verification failed. Status: {response.status_code}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/groq-models")
def get_groq_models(db: Session = Depends(get_db), api_key: str = None):
    """
    Fetches available models from Groq API.
    If api_key is provided, uses it directly. Otherwise, fetches from database.
    """
    import requests
    
    # Use provided key or fetch from database
    if not api_key:
        api_key_setting = crud.get_setting(db, key="GROQ_API_KEY")
        if not api_key_setting or not api_key_setting.value:
            raise HTTPException(status_code=400, detail="Groq API Key not set")
        api_key = api_key_setting.value
    
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        response = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
        if response.status_code == 200:
            models_data = response.json()
            # Filter for chat models if needed, or just return all
            return {"status": "success", "models": [m["id"] for m in models_data.get("data", [])]}
        else:
             raise HTTPException(status_code=response.status_code, detail="Failed to fetch models from Groq")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{key}", response_model=schemas.Setting)
def read_setting(key: str, db: Session = Depends(get_db)):
    db_setting = crud.get_setting(db, key=key)
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return db_setting
