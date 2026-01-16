from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime

# Ingredient Schemas
class IngredientBase(BaseModel):
    text: str

class IngredientCreate(IngredientBase):
    pass

class Ingredient(IngredientBase):
    id: int
    recipe_id: int

    class Config:
        orm_mode = True

# Recipe Schemas
class RecipeBase(BaseModel):
    title: str
    instructions: Optional[List[str]] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    servings: Optional[str] = None
    image_url: Optional[HttpUrl] = None
    source_url: HttpUrl
    notes: Optional[str] = None

class RecipeCreate(RecipeBase):
    ingredients: List[IngredientCreate]

class Recipe(RecipeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    ingredients: List[Ingredient] = []

    class Config:
        orm_mode = True

# Allergen Schemas
class AllergenBase(BaseModel):
    name: str

class AllergenCreate(AllergenBase):
    pass

class Allergen(AllergenBase):
    id: int

    class Config:
        orm_mode = True

# Scraping Schemas
class ScrapeRequest(BaseModel):
    url: HttpUrl

class ScrapeResponse(BaseModel):
    status: str
    recipe: Optional[Recipe] = None
    message: Optional[str] = None
    html: Optional[str] = None # To send to Groq if needed

# Groq Settings Schema
class GroqSettings(BaseModel):
    api_key: str
    model: str
