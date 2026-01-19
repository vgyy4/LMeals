"""
Script to update existing allergen keywords in the database.
Run this to fix the "milk" allergen that currently only has ["milk"] as keywords.
"""
import sys
sys.path.insert(0, '/config/lmeals/backend')

from database import SessionLocal
import crud
import llm

def update_allergen_keywords():
    db = SessionLocal()
    try:
        # Get all allergens
        allergens = crud.get_allergens(db)
        
        for allergen in allergens:
            print(f"\nProcessing allergen: {allergen.name}")
            print(f"Current keywords: {allergen.keywords}")
            
            # Regenerate keywords
            new_keywords = llm.expand_allergen_keywords(allergen.name)
            print(f"New keywords: {new_keywords}")
            
            # Update in database
            allergen.keywords = new_keywords
            db.commit()
            print(f"✓ Updated {allergen.name} in database")
        
        print("\n✅ All allergens updated successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_allergen_keywords()
