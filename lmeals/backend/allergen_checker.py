"""
Allergen checking with multilingual translation support.
"""
from sqlalchemy.orm import Session
import models
import translator
import llm

def check_recipe_allergens(recipe: models.Recipe, allergens: list[models.Allergen]) -> bool:
    """
    Check if a recipe contains any allergens using keyword detection 
    and AI-based verification to prevent false positives.
    """
    if not allergens or not recipe.ingredients:
        return False
    
    # Get all allergen keywords and names
    all_keywords = []
    allergen_names = []
    for allergen in allergens:
        allergen_names.append(allergen.name)
        all_keywords.extend(allergen.keywords or [allergen.name.lower()])
    
    # Check each ingredient
    for ingredient in recipe.ingredients:
        # Stage 1: Fast keyword check
        if translator.ingredient_contains_allergen(ingredient.text, all_keywords):
            # Stage 2: AI verification to avoid false positives (like 'peanut butter' vs 'milk')
            if llm.verify_allergens_with_ai(ingredient.text, allergen_names):
                return True
    
    return False
