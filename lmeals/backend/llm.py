from groq import Groq
import json
import os

from database import SessionLocal
import crud

def extract_with_groq(html: str):
    """
    Uses the Groq API to extract recipe data from HTML using credentials from environment variables or database settings.
    Returns a dictionary of recipe data or None if extraction fails.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    model = os.environ.get("GROQ_MODEL")

    if not api_key or not model:
        db = SessionLocal()
        try:
            if not api_key:
                setting = crud.get_setting(db, "GROQ_API_KEY")
                if setting:
                    api_key = setting.value
            if not model:
                setting = crud.get_setting(db, "GROQ_MODEL")
                if setting:
                    model = setting.value
                else:
                    model = "llama3-70b-8192" # Default if not in env or DB
        finally:
            db.close()

    if not api_key:
        print("GROQ_API_KEY environment variable is not set and not found in settings.")
        return None

    client = Groq(api_key=api_key)

    system_prompt = """
    You are an expert recipe data extractor. Your task is to extract recipe data from the provided text and return ONLY a strict JSON object with the following keys: "title", "ingredients" (which must be a list of strings), "instructions" (also a list of strings), "prep_time" (as a string), "cook_time" (as a string), "servings" (as a string), and "image_url" (as a string).

    Do not include any introductory text, explanations, or markdown formatting around the JSON. Your output must be parsable by a standard JSON parser.
    """

    # Extract only text from HTML to reduce tokens and improve accuracy
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.decompose()
    
    # Replace images with text placeholders containing src and alt
    for img in soup.find_all('img'):
        src = img.get('src', '')
        alt = img.get('alt', '')
        if src:
            img.replace_with(f" [IMAGE: src='{src}', alt='{alt}'] ")
    
    # Get text
    text = soup.get_text()
    
    # Break into lines and remove leading and trailing space on each
    lines = (line.strip() for line in text.splitlines())
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    # Drop blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": f"Here is the recipe text:\n\n{text}",
                },
            ],
            model=model,
            response_format={"type": "json_object"},
        )
        response_text = chat_completion.choices[0].message.content
        recipe_data = json.loads(response_text)

        # Basic validation of the returned data structure
        required_keys = ["title", "ingredients", "instructions"]
        if not all(key in recipe_data for key in required_keys):
            print("Groq response was missing one or more required keys.")
            return None

        # Ensure ingredients and instructions are lists
        if not isinstance(recipe_data.get("ingredients"), list) or not isinstance(recipe_data.get("instructions"), list):
            print("Groq response 'ingredients' or 'instructions' is not a list.")
            return None

        return recipe_data
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON response from Groq: {e}")
        return None
    except Exception as e:
        print(f"An error occurred with the Groq API call: {e}")
        return None
    except Exception as e:
        print(f"An error occurred with the Groq API call: {e}")
        return None

def get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    model = os.environ.get("GROQ_MODEL", "llama3-70b-8192")

    if not api_key:
        db = SessionLocal()
        try:
            setting = crud.get_setting(db, "GROQ_API_KEY")
            if setting:
                api_key = setting.value
            
            model_setting = crud.get_setting(db, "GROQ_MODEL")
            if model_setting:
                model = model_setting.value
        finally:
            db.close()

    if not api_key:
        return None, None
    
    return Groq(api_key=api_key), model

def expand_allergen_keywords(allergen_name: str) -> list[str]:
    """
    Uses Groq to generate a list of synonyms and related ingredients for a given allergen 
    in multiple languages, including common derived products.
    """
    # Fallback dictionaries for common allergens
    COMMON_ALLERGEN_KEYWORDS = {
        "milk": ["milk", "dairy", "butter", "cheese", "cream", "yogurt", "whey", "casein", "lactose", 
                 "lait", "leche", "milch", "latte", "חלב", "גבינה", "יוגורט", "beurre", "mantequilla",
                 "fromage", "queso", "crème", "parmesan", "cheddar", "mozzarella"],
        "egg": ["egg", "eggs", "albumin", "mayonnaise", "ביצה", "ביצים", "oeuf", "huevo"],
        "wheat": ["wheat", "flour", "gluten", "bread", "pasta", "semolina", "חיטה", "קמח", "blé", "trigo"],
        "soy": ["soy", "soya", "tofu", "edamame", "soybean", "סויה", "soja"],
        "peanut": ["peanut", "peanuts", "groundnut", "arachis", "בוטנים", "cacahuete", "arachide"],
        "tree nut": ["almond", "cashew", "walnut", "pecan", "hazelnut", "אגוז", "nuez", "noix"],
        "fish": ["fish", "salmon", "tuna", "cod", "דג", "poisson", "pescado"],
        "shellfish": ["shrimp", "crab", "lobster", "prawn", "shellfish", "seafood", "רכיכות"],
    }
    
    client, model = get_groq_client()
    if not client:
        print(f"Warning: No Groq client available for allergen '{allergen_name}'. Using fallback keywords.")
        # Check if we have a fallback for this allergen
        allergen_lower = allergen_name.lower()
        for key, keywords in COMMON_ALLERGEN_KEYWORDS.items():
            if allergen_lower in keywords or key in allergen_lower:
                print(f"Using fallback keywords for '{allergen_name}': {keywords}")
                return keywords
        return [allergen_lower]

    system_prompt = """
    You are an expert food safety assistant. Your task is to generate a comprehensive list of keywords associated with a specific allergen.
    Include:
    1. The allergen name itself in English.
    2. Common names of the allergen in ALL languages (do not limit to major ones; include as many as possible).
    3. Common ingredients that CONTAIN this allergen (e.g. for "Milk", include "butter", "cheese", "cream", "yogurt", "whey", "casein", "חלב", "גבינה", "יוגורט").
    4. Derived names (e.g. for "Wheat", include "flour", "gluten", "semolina", "קמח").

    Return ONLY a JSON object with a single key "keywords" which is a list of lowercase strings.
    Example input: "Milk"
    Example output: {"keywords": ["milk", "lait", "leche", "milch", "latte", "butter", "beurre", "mantequilla", "cheese", "fromage", "queso", "cream", "crème", "yogurt", "whey", "casein", "lactose"]}
    """

    try:
        print(f"Calling Groq API to expand keywords for allergen: '{allergen_name}'")
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Allergen: {allergen_name}"}
            ],
            model=model,
            response_format={"type": "json_object"}
        )
        
        response_content = completion.choices[0].message.content
        print(f"Groq API response for '{allergen_name}': {response_content}")
        
        data = json.loads(response_content)
        keywords = data.get("keywords", [])
        
        if not keywords or len(keywords) <= 1:
            print(f"Warning: Groq returned insufficient keywords for '{allergen_name}'. Response: {data}")
            # Use fallback
            allergen_lower = allergen_name.lower()
            for key, fallback_keywords in COMMON_ALLERGEN_KEYWORDS.items():
                if allergen_lower in fallback_keywords or key in allergen_lower:
                    print(f"Using fallback keywords for '{allergen_name}': {fallback_keywords}")
                    return fallback_keywords
        
        # Ensure the original name is included
        if allergen_name.lower() not in keywords:
            keywords.append(allergen_name.lower())
        
        result = list(set(keywords))  # Dedup
        print(f"Final keywords for '{allergen_name}': {result}")
        return result
    except Exception as e:
        print(f"Error expanding allergen keywords for '{allergen_name}': {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        
        # Use fallback on error
        allergen_lower = allergen_name.lower()
        for key, fallback_keywords in COMMON_ALLERGEN_KEYWORDS.items():
            if allergen_lower in fallback_keywords or key in allergen_lower:
                print(f"Using fallback keywords after error for '{allergen_name}': {fallback_keywords}")
                return fallback_keywords
        
        print(f"No fallback found for '{allergen_name}', returning just the allergen name")
        return [allergen_lower]


def verify_allergens_with_ai(ingredient_text: str, allergens: list[str]) -> bool:
    """
    Uses Groq to verify if an ingredient text actually contains any of the specified allergens.
    This helps prevent false positives like 'peanut butter' being flagged for a 'milk' allergy.
    """
    client, model = get_groq_client()
    
    # Common sense local check for the most frequent false positives
    # This ensures things like 'Peanut Butter' don't trigger 'Milk' warnings even without an AI key.
    safe_lowered = ingredient_text.lower()
    local_false_positives = {
        "milk": ["peanut butter", "coconut milk", "almond milk", "soy milk", "oat milk", "rice milk", "cashew milk", "cocoa butter", "shea butter", "nut butter"],
        "egg": ["eggplant"],
        "wheat": ["buckwheat", "water chestnut"],
    }
    
    for allergen in allergens:
        category = allergen.lower()
        if category in local_false_positives:
            for safe_item in local_false_positives[category]:
                if safe_item in safe_lowered:
                    # Final check: Does it contain the literal category name OUTSIDE of the safe phrase?
                    # Example: "Peanut butter with milk" should still trigger for milk.
                    # We check if the name exists separately from the safe item.
                    if category not in safe_lowered.replace(safe_item, ""):
                        print(f"Local Smart Verification: '{ingredient_text}' is safe for {category} (Known false positive: {safe_item})")
                        return False

    if not client:
        # If AI is unavailable, we've already done our local check above.
        # Still return True for anything else suspicious as a safety measure.
        return True 

    system_prompt = """
    You are a professional food safety and allergen expert. 
    Your task is to determine if a specific ingredient text contains any of the allergens listed by the user.
    
    CRITICAL RULE: You must ignore false positives where an allergen name is part of another safe food (e.g., 'Peanut Butter' does NOT contain milk/dairy, 'Coconut Milk' does NOT contain cow's milk).
    
    Respond ONLY with a JSON object: {"contains_allergen": true/false, "reason": "short explanation"}
    """

    user_prompt = f"""
    Ingredient: "{ingredient_text}"
    Check for these allergens: {', '.join(allergens)}
    
    Does this specific ingredient contain any of these allergens?
    """

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=model,
            response_format={"type": "json_object"}
        )
        
        data = json.loads(completion.choices[0].message.content)
        result = data.get("contains_allergen", True)
        print(f"AI Verification for '{ingredient_text}': {result} ({data.get('reason')})")
        return result
    except Exception as e:
        print(f"Error in AI allergen verification: {e}")
        return True # Fallback to True on error

