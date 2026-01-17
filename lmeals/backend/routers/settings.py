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

@router.post("/settings/verify-groq")
def verify_groq_key(setting: schemas.SettingCreate):
    """
    Verifies the Groq API key by making a simple request to the Groq API.
    """
    import requests
    try:
        headers = {
            "Authorization": f"Bearer {setting.value}",
            "Content-Type": "application/json"
        }
        # Using a lightweight model just to check auth
        data = {
            "messages": [{"role": "user", "content": "ping"}],
            "model": "llama3-8b-8192" 
        }
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", json=data, headers=headers)
        if response.status_code == 200:
            return {"status": "success", "message": "API Key is valid!"}
        else:
            return {"status": "error", "message": f"Invalid API Key. Status: {response.status_code}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/settings/groq-models")
def get_groq_models(db: Session = Depends(get_db)):
    """
    Fetches available models from Groq API using the stored API key.
    """
    import requests
    api_key_setting = crud.get_setting(db, key="GROQ_API_KEY")
    if not api_key_setting or not api_key_setting.value:
        raise HTTPException(status_code=400, detail="Groq API Key not set")
    
    try:
        headers = {
            "Authorization": f"Bearer {api_key_setting.value}",
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
