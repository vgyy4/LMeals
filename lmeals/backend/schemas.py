from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional
from datetime import datetime, date

# Ingredient Schemas
class IngredientBase(BaseModel):
    text: str

class IngredientCreate(IngredientBase):
    pass

class Ingredient(IngredientBase):
    id: int
    recipe_id: int

    class Config:
        from_attributes = True

# Recipe Schemas
class RecipeBase(BaseModel):
    title: str
    instructions: Optional[List[str]] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    servings: Optional[str] = None
    yield_unit: Optional[str] = "servings"
    instruction_template: Optional[List[str]] = None
    image_url: Optional[str] = None
    source_url: str
    notes: Optional[str] = None
    is_favorite: bool = False

class RecipeCreate(RecipeBase):
    ingredients: List[IngredientCreate]

class Recipe(RecipeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    ingredients: List[Ingredient] = []
    has_allergens: Optional[bool] = None  # Computed field, not in DB

    class Config:
        from_attributes = True

# Allergen Schemas
class AllergenBase(BaseModel):
    name: str

class AllergenCreate(AllergenBase):
    pass

class Allergen(AllergenBase):
    id: int
    keywords: List[str] = []

    class Config:
        from_attributes = True

# Scraping Schemas
class ScrapeRequest(BaseModel):
    url: str

class ScrapeResponse(BaseModel):
    status: str
    recipe: Optional[Recipe] = None
    message: Optional[str] = None
    html: Optional[str] = None # To send to Groq if needed

# Groq Settings Schema
class GroqSettings(BaseModel):
    api_key: str
    model: str

# Meal Plan Schemas
class MealPlanEntryBase(BaseModel):
    date: date
    recipe_id: int
    meal_type: str = "Dinner"

class MealPlanEntryCreate(MealPlanEntryBase):
    pass

class MealPlanEntry(MealPlanEntryBase):
    id: int
    recipe: Recipe

    class Config:
        from_attributes = True

# Setting Schemas
class SettingBase(BaseModel):
    key: str
    value: str

class SettingCreate(SettingBase):
    pass

class Setting(SettingBase):
    class Config:
        orm_mode = True
