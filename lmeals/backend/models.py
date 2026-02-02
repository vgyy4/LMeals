from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON, Date, Boolean
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
    active_time = Column(String, nullable=True) # Hands-on time (e.g. "1 hour")
    total_time = Column(String, nullable=True)  # Wall-clock time (e.g. "15 hours")
    servings = Column(String, nullable=True)
    yield_unit = Column(String, nullable=True, server_default='servings')
    instruction_template = Column(JSON, nullable=True) # List of strings with [[qty:NUMBER]]
    image_url = Column(String, nullable=True)
    source_url = Column(String, unique=True, index=True)
    notes = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False)
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
    keywords = Column(JSON, default=list)

class MealPlanEntry(Base):
    __tablename__ = "meal_plan_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)

    recipe = relationship("Recipe")
    meal_type = Column(String, default="Dinner")

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)
