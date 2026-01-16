from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    instructions = Column(JSON)  # List of strings
    prep_time = Column(String, nullable=True)
    cook_time = Column(String, nullable=True)
    servings = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    source_url = Column(String, unique=True, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    ingredients = relationship("Ingredient", back_populates="recipe", cascade="all, delete-orphan")

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))

    recipe = relationship("Recipe", back_populates="ingredients")

class Allergen(Base):
    __tablename__ = "allergens"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

class MealPlanEntry(Base):
    __tablename__ = "meal_plan_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)

    recipe = relationship("Recipe")

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1) # Singleton: only one row in this table
    groq_api_key = Column(String, nullable=True)
    groq_model = Column(String, nullable=True, default="llama3-70b-8192")
