from sqlalchemy.orm import Session
import models, schemas

# Recipe CRUD operations
def get_recipe(db: Session, recipe_id: int):
    return db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()

def get_recipe_by_source_url(db: Session, source_url: str):
    return db.query(models.Recipe).filter(models.Recipe.source_url == source_url).first()

def get_recipes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Recipe).offset(skip).limit(limit).all()

def create_recipe(db: Session, recipe: schemas.RecipeCreate):
    db_recipe = models.Recipe(
        title=recipe.title,
        instructions=recipe.instructions,
        prep_time=recipe.prep_time,
        cook_time=recipe.cook_time,
        servings=recipe.servings,
        image_url=str(recipe.image_url) if recipe.image_url else None,
        source_url=str(recipe.source_url),
        notes=recipe.notes
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    for ingredient_data in recipe.ingredients:
        db_ingredient = models.Ingredient(**ingredient_data.dict(), recipe_id=db_recipe.id)
        db.add(db_ingredient)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

def update_recipe(db: Session, recipe_id: int, recipe: schemas.RecipeCreate):
    db_recipe = get_recipe(db, recipe_id)
    if db_recipe:
        for key, value in recipe.dict().items():
            setattr(db_recipe, key, value)
        db.commit()
        db.refresh(db_recipe)
    return db_recipe

def delete_recipe(db: Session, recipe_id: int):
    db_recipe = get_recipe(db, recipe_id)
    if db_recipe:
        db.delete(db_recipe)
        db.commit()
    return db_recipe

# Allergen CRUD operations
def get_allergen(db: Session, allergen_id: int):
    return db.query(models.Allergen).filter(models.Allergen.id == allergen_id).first()

def get_allergen_by_name(db: Session, name: str):
    return db.query(models.Allergen).filter(models.Allergen.name == name).first()

def get_allergens(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Allergen).offset(skip).limit(limit).all()

def create_allergen(db: Session, allergen: schemas.AllergenCreate):
    db_allergen = models.Allergen(name=allergen.name)
    db.add(db_allergen)
    db.commit()
    db.refresh(db_allergen)
    return db_allergen

def delete_allergen(db: Session, allergen_id: int):
    db_allergen = get_allergen(db, allergen_id)
    if db_allergen:
        db.delete(db_allergen)
        db.commit()
    return db_allergen
