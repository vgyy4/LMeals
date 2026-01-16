from sqlalchemy.orm import Session, joinedload
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

def get_favorite_recipes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Recipe).filter(models.Recipe.is_favorite == True).offset(skip).limit(limit).all()

def set_favorite_status(db: Session, recipe_id: int, is_favorite: bool):
    db_recipe = get_recipe(db, recipe_id)
    if db_recipe:
        db_recipe.is_favorite = is_favorite
        db.commit()
        db.refresh(db_recipe)
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

# Meal Plan CRUD operations
def get_meal_plan_entries(db: Session, start_date: str, end_date: str):
    return db.query(models.MealPlanEntry).filter(models.MealPlanEntry.date.between(start_date, end_date)).options(joinedload(models.MealPlanEntry.recipe).joinedload(models.Recipe.ingredients)).all()

def create_meal_plan_entry(db: Session, entry: schemas.MealPlanEntryCreate):
    db_entry = models.MealPlanEntry(**entry.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def delete_meal_plan_entry(db: Session, entry_id: int):
    db_entry = db.query(models.MealPlanEntry).filter(models.MealPlanEntry.id == entry_id).first()
    if db_entry:
        db.delete(db_entry)
        db.commit()
    return db_entry

# Settings CRUD operations
def get_settings(db: Session):
    """
    Retrieve the settings record. Since it's a singleton, always fetch the first one.
    If it doesn't exist, create it with default values.
    """
    db_settings = db.query(models.Setting).first()
    if not db_settings:
        db_settings = models.Setting()
        db.add(db_settings)
        db.commit()
        db.refresh(db_settings)
    return db_settings

def create_or_update_settings(db: Session, settings: schemas.SettingUpdate):
    """
    Update the singleton settings record.
    """
    db_settings = get_settings(db)
    update_data = settings.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_settings, key, value)
    db.commit()
    db.refresh(db_settings)
    return db_settings
