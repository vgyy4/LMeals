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
    You are an expert recipe data extractor. Your task is to extract recipe data from the provided HTML text and return ONLY a strict JSON object with the following keys: "title", "ingredients" (which must be a list of strings), "instructions" (also a list of strings), "prep_time" (as a string), "cook_time" (as a string), "servings" (as a string), and "image_url" (as a string).

    Do not include any introductory text, explanations, or markdown formatting around the JSON. Your output must be parsable by a standard JSON parser.
    """

    # Truncate HTML to prevent context length errors (Groq has token limits)
    # Most recipe info is in the first 50k characters anyway
    max_html_length = 50000
    if len(html) > max_html_length:
        html = html[:max_html_length] + "\n... [HTML truncated due to length]"

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": f"Here is the HTML content:\n\n{html}",
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
