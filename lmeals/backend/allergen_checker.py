"""
Allergen checking with multilingual translation support.
"""
from sqlalchemy.orm import Session
import models
import translator

def check_recipe_allergens(recipe: models.Recipe, allergens: list[models.Allergen]) -> bool:
    """
    Check if a recipe contains any allergens using multilingual translation.
    
    Args:
        recipe: The recipe to check
        allergens: List of allergen objects with keywords
        
    Returns:
        True if the recipe contains any allergens
    """
    if not allergens or not recipe.ingredients:
        return False
    
    # Get all allergen keywords
    all_keywords = []
    for allergen in allergens:
        all_keywords.extend(allergen.keywords or [allergen.name.lower()])
    
    # Check each ingredient
    for ingredient in recipe.ingredients:
        if translator.ingredient_contains_allergen(ingredient.text, all_keywords):
            return True
    
    return False
