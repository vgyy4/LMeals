from groq import Groq
import json
import os

def extract_with_groq(html: str, api_key: str, model: str):
    """
    Uses the Groq API to extract recipe data from HTML.
    Returns a dictionary of recipe data or None if extraction fails.
    """
    if not api_key:
        api_key = os.environ.get("GROQ_API_KEY")
    
    if not api_key:
        raise ValueError("Groq API key is not set.")

    client = Groq(api_key=api_key)

    system_prompt = """
    You are an expert recipe data extractor. Your task is to extract recipe data from the provided HTML text and return ONLY a strict JSON object with the following keys: "title", "ingredients" (which must be a list of strings), "instructions" (also a list of strings), "prep_time" (as a string), "cook_time" (as a string), "servings" (as a string), and "image_url" (as a string).

    Do not include any introductory text, explanations, or markdown formatting around the JSON. Your output must be parsable by a standard JSON parser.
    """

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
        return recipe_data
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON response from Groq: {e}")
        return None
    except Exception as e:
        print(f"An error occurred with the Groq API call: {e}")
        return None
