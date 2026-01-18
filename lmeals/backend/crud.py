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
    # Verify recipe exists to avoid IntegrityError
    db_recipe = get_recipe(db, entry.recipe_id)
    if not db_recipe:
        # We can raise an error or return None. 
        # Since CRUD usually returns the created object, returning None might be ambiguous if not handled.
        # But raising an exception here is safer than letting DB do it.
        # Ideally, we let the router handle the 404. 
        # Let's return None and update router.
        return None

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

# Setting CRUD operations
def get_setting(db: Session, key: str):
    return db.query(models.Setting).filter(models.Setting.key == key).first()

def get_settings(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Setting).offset(skip).limit(limit).all()

def create_setting(db: Session, setting: schemas.SettingCreate):
    db_setting = models.Setting(key=setting.key, value=setting.value)
    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting

def update_setting(db: Session, key: str, value: str):
    db_setting = get_setting(db, key)
    if db_setting:
        db_setting.value = value
        db.commit()
        db.refresh(db_setting)
    else:
        db_setting = models.Setting(key=key, value=value)
        db.add(db_setting)
        db.commit()
        db.refresh(db_setting)
    return db_setting
