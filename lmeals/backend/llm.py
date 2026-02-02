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
    You are an expert recipe data extractor. Your task is to extract recipe data from the provided text and return ONLY a strict JSON object with the following keys: 
    - "title": (string)
    - "ingredients": (list of strings - TAG **ALL** QUANTITIES. Wrap **EVERY SINGLE** numerical quantity in [[qty:VALUE]]. Example: "[[qty:4.25]] cups ([[qty:281]]g) all-purpose flour" or "[[qty:2]] large eggs".)
    - "instructions": (list of strings - BE HIGHLY DETAILED. Tag numerical quantities for ingredients only. Do NOT tag times/temps.)
    - "prep_time": (string)
    - "cook_time": (string)
    - "servings": (string - just the numeric part if possible, e.g. "4")
    - "yield_unit": (string - the unit of measurement, e.g. "servings", "cookies", "people", "bowls", "muffins"). Default to "servings" if unclear.
    - "image_url": (string)

    CRITICAL INGREDIENT TAGGING RULES:
    1. Wrap **EVERY** number that represents a quantity, volume, or weight in [[qty:VALUE]]. 
    2. If an ingredient has BOTH volume and weight (e.g., "1 cup (100g)"), tag BOTH: "[[qty:1]] cup ([[qty:100]]g)".
    3. Convert fractions to decimals inside tags (e.g., 1/2 -> [[qty:0.5]], 4 1/4 -> [[qty:4.25]]).
    4. ALLOW RANGES: Format as [[qty:MIN-MAX]] (e.g., "[[qty:10-15]]g" or "[[qty:1-2]] cups").
    5. Tag standalone numbers: "[[qty:2]] eggs", "[[qty:3.5]] oz chocolate", "[[qty:165]]g sugar".
    6. Be as granular and step-by-step as possible in the instructions.

    SERVINGS & YIELD LOGIC:
    1. If multiple units are available (e.g. "Serves 4 people" and "Makes 20 cookies"), prioritize the unit that is **MOST RELEVANT TO THE RESIPE TITLE/CONTENT**. (e.g. If the recipe is "Chocolate Chip Cookies", choose "Cookies" and "20". If the recipe is "Spicy Noodles", choose "People" or "Servings" even if "cookies" is mentioned elsewhere).
    2. If multiple sizes/yields are provided for the SAME unit:
       - If > 2 options (e.g. 24 small, 20 med, 15 large): Choose the **MEDIAN** (middle value, e.g. 20).
       - If exactly 2 options (e.g. 24 small, 20 large): Choose the **AVERAGE** rounded to the nearest whole number (e.g. 22).

    IMPORTANT JSON FORMATTING RULES:
    - Use strict JSON format.
    - All property names and string values MUST be enclosed in standard double quotes (").
    - DO NOT use smart quotes / curly quotes (“ or ”) anywhere in the JSON keys or values.
    - Escape internal quotes properly.
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

def extract_recipe_from_text(text: str, metadata: dict = None):
    """
    Uses Groq to extract recipe data from ANY raw text (html text or transcript).
    Optionally accepts metadata (like video description) to improve context.
    """
    client, model = get_groq_client()
    if not client:
        return None

    system_prompt = """
    You are an expert recipe data extractor. Your task is to extract recipe data from the provided text and return ONLY a strict JSON object with the following keys: 
    - "title": (string)
    - "ingredients": (list of strings - TAG **ALL** QUANTITIES. Wrap **EVERY SINGLE** numerical quantity in [[qty:VALUE]]. Example: "[[qty:4.25]] cups ([[qty:281]]g) all-purpose flour" or "[[qty:2]] large eggs".)
    - "instructions": (list of strings - BE HIGHLY DETAILED. Tag numerical quantities for ingredients only. Do NOT tag times/temps.)
    - "prep_time": (string)
    - "cook_time": (string)
    - "servings": (string - just the numeric part if possible, e.g. "4")
    - "yield_unit": (string - the unit of measurement, e.g. "servings", "cookies", "people", "bowls", "muffins"). Default to "servings" if unclear.
    - "image_url": (string)

    CRITICAL INGREDIENT TAGGING RULES:
    1. Wrap **EVERY** number that represents a quantity, volume, or weight in [[qty:VALUE]]. 
    2. If an ingredient has BOTH volume and weight (e.g., "1 cup (100g)"), tag BOTH: "[[qty:1]] cup ([[qty:100]]g)".
    3. Convert fractions to decimals inside tags (e.g., 1/2 -> [[qty:0.5]], 4 1/4 -> [[qty:4.25]]).
    4. ALLOW RANGES: Format as [[qty:MIN-MAX]] (e.g., "[[qty:10-15]]g" or "[[qty:1-2]] cups").
    5. Tag standalone numbers: "[[qty:2]] eggs", "[[qty:3.5]] oz chocolate", "[[qty:165]]g sugar".
    6. Be as granular and step-by-step as possible in the instructions.

    SERVINGS & YIELD LOGIC:
    1. If multiple units are available (e.g. "Serves 4 people" and "Makes 20 cookies"), prioritize the unit that is **MOST RELEVANT TO THE RESIPE TITLE/CONTENT**. (e.g. If the recipe is "Chocolate Chip Cookies", choose "Cookies" and "20". If the recipe is "Spicy Noodles", choose "People" or "Servings" even if "cookies" is mentioned elsewhere).
    2. If multiple sizes/yields are provided for the SAME unit:
       - If > 2 options (e.g. 24 small, 20 med, 15 large): Choose the **MEDIAN** (middle value, e.g. 20).
       - If exactly 2 options (e.g. 24 small, 20 large): Choose the **AVERAGE** rounded to the nearest whole number (e.g. 22).

    IMPORTANT JSON FORMATTING RULES:
    - Use strict JSON format.
    - All property names and string values MUST be enclosed in standard double quotes (").
    - DO NOT use smart quotes / curly quotes (“ or ”) anywhere in the JSON keys or values.
    - Escape internal quotes properly.
    """

    user_content = f"Extract recipe from this text:\n\n{text}"
    
    # Append metadata context if available (e.g. video descriptions)
    if metadata:
        if metadata.get("description"):
            user_content += f"\n\nAdditional Context (Video Description):\n{metadata['description']}"
        if metadata.get("title"):
            user_content += f"\n\nVideo Title: {metadata['title']}"

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            model=model,
            response_format={"type": "json_object"},
        )
        return json.loads(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Error extracting recipe from text: {e}")
        return None

def transcribe_audio(file_path: str) -> str:
    """
    Transcribes an audio file using Groq's Whisper v3 large.
    """
    client, _ = get_groq_client()
    if not client:
        return ""

    try:
        with open(file_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(file_path), file.read()),
                model="whisper-large-v3",
                response_format="json",
            )
            return transcription.text
    except Exception as e:
        print(f"Error transcribing audio {file_path}: {e}")
        return ""

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


def generate_instruction_template(instructions: list[str]) -> list[str]:
    """
    Uses Groq to create a 'Smart Template' for recipe instructions.
    Identifies ingredient quantities and wraps them in [[qty:NUMBER]] while
    strictly ignoring temperatures, times, and tool sizes.
    """
    client, model = get_groq_client()
    if not client:
        return instructions

    system_prompt = """
    You are an expert recipe editor. Your task is to transform recipe instructions into "Smart Templates" by tagging ONLY the ingredient quantities.
    
    RULES:
    1. Wrap numerical ingredient quantities (and fractions) in [[qty:VALUE]]. 
       Example: "Add 100g flour" -> "Add [[qty:100]]g flour".
       Example: "Pour 1 1/2 cups water" -> "Pour [[qty:1.5]] cups water".
    2. NEVER tag oven temperatures (e.g., 350°F, 200°C).
    3. NEVER tag cooking durations (e.g., 20 minutes, 1 hour).
    4. NEVER tag equipment sizes (e.g., 9-inch pan, 2-liter pot).
    5. Return ONLY a JSON object with a single key "templated_instructions" containing the list of modified strings.
    """

    user_prompt = f"Recipe Instructions:\n" + "\n".join([f"{i+1}. {text}" for i, text in enumerate(instructions)])

    try:
        print(f"Calling Groq to generate instruction template for {len(instructions)} steps.")
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=model,
            response_format={"type": "json_object"}
        )
        
        data = json.loads(completion.choices[0].message.content)
        templated = data.get("templated_instructions", [])
        
        if len(templated) == len(instructions):
            # Clean up potential list numbering if AI added it
            cleaned = []
            for t in templated:
                import re
                cleaned.append(re.sub(r'^\d+\.\s*', '', t))
            return cleaned
            
        print(f"Warning: AI returned {len(templated)} steps but original had {len(instructions)}. Falling back.")
        return instructions
    except Exception as e:
        print(f"Error generating instruction template: {e}")
        return instructions


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


def identify_dish_timestamps(transcript: str, duration: int) -> list[int]:
    """
    Uses Groq to identify 3-5 timestamps (in seconds) where the finished dish 
    is likely presented in the video based on the transcript.
    """
    client, model = get_groq_client()
    if not client:
        # Fallback: Just pick points in the last 20% of the video
        start = int(duration * 0.8)
        return [start + (i * (duration - start) // 4) for i in range(4)]

    system_prompt = f"""
    You are an expert video editor. Analyzing a recipe video transcript, identify 3-5 specific timestamps (in seconds) where the finished dish is most likely being presented or served beautifully.
    
    RULES:
    1. Search for "teaser" moments in the first 30 seconds where the end result is often shown.
    2. Search for the main "reveal" or "tasting" at the end of the video (final 20%).
    3. Look for keywords like: "look at that", "plating", "serve", "finished", "tasting", "delicious", "pod to bar", "ready to eat".
    4. The video duration is {duration} seconds.
    5. Return ONLY a JSON object: {{"timestamps": [sec1, sec2, sec3]}}
    6. Ensure timestamps are within the video duration and distinct.
    """

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transcript:\n\n{transcript}"}
            ],
            model=model,
            response_format={"type": "json_object"}
        )
        
        data = json.loads(completion.choices[0].message.content)
        timestamps = data.get("timestamps", [])
        
        # Validation
        valid_timestamps = [int(t) for t in timestamps if isinstance(t, (int, float)) and 0 <= t <= duration]
        
        if not valid_timestamps:
            # Fallback
            start = int(duration * 0.8)
            fallback = [start + (i * (duration - start) // 4) for i in range(4)]
            print(f"DEBUG: No valid timestamps found by AI, using fallback: {fallback}")
            return fallback
            
        print(f"DEBUG: AI identified timestamps: {valid_timestamps[:5]}")
        return valid_timestamps[:5]
    except Exception as e:
        print(f"Error identifying timestamps: {e}")
        start = int(duration * 0.8)
        return [start + (i * (duration - start) // 4) for i in range(4)]


def extract_recipe_link(description: str, video_title: str = "") -> str | None:
    """
    Uses AI to identify recipe URLs (web pages or PDFs) in a video description.
    Returns the most relevant recipe URL or None if not found.
    """
    client, model = get_groq_client()
    if not client or not description:
        return None

    system_prompt = """
    You are an expert at analyzing video descriptions to find recipe links.
    Your task is to identify if there is a recipe link (web page or PDF) in the video description that matches the video's subject.
    
    RULES:
    1. Look for URLs that point to recipe websites, blog posts, or PDF files.
    2. Prioritize links that contain keywords like "recipe", "ingredients", "instructions".
    3. **CRITICAL: Ensure the link is for the SAME recipe as the video title provided.**
    4. Ignore links to social media profiles, Patreon, merchandise, or unrelated videos.
    5. Return ONLY the most relevant recipe URL.
    6. Return null if no matching recipe link is found.
    
    Response format: Return a valid JSON object with the key "recipe_url".
    Example: {"recipe_url": "https://example.com/recipe.pdf"} or {"recipe_url": null}
    """

    try:
        user_content = f"Video Title: {video_title}\n\nVideo Description:\n\n{description}"
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            model=model,
            response_format={"type": "json_object"}
        )
        
        data = json.loads(completion.choices[0].message.content)
        url = data.get("recipe_url")
        
        if url and isinstance(url, str) and url.startswith("http"):
            print(f"DEBUG: Found recipe link in description: {url}")
            return url
            
        print("DEBUG: No recipe link found in description")
        return None
    except Exception as e:
        print(f"Error extracting recipe link: {e}")
        return None
