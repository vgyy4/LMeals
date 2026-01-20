from recipe_scrapers import scrape_me
from recipe_scrapers._exceptions import WebsiteNotImplementedError
import requests

def scrape_with_library(url: str):
    """
    Scrapes a recipe from a URL using the recipe-scrapers library.
    Strictly uses official support only (wild_mode=False).
    """
    print(f"DEBUG: Attempting to scrape URL with library: {url}")
    try:
        # Use a real browser user agent for the fetch
        scraper = scrape_me(url, wild_mode=False)
        
        # Extract fields safely
        try:
            ingredients = scraper.ingredients()
            instructions = scraper.instructions()
            title = scraper.title()
        except Exception as e:
            print(f"DEBUG: Error extracting essential fields from {url}: {e}")
            return None

        # Check for essential fields
        if not ingredients or not instructions:
            print(f"DEBUG: Missing ingredients or instructions for {url}")
            return None
            
        # Get image and yield, handle empty strings for HttpUrl validation
        image_url = scraper.image()
        if not image_url or not image_url.strip():
            image_url = None

        return {
            "title": title,
            "instructions": scraper.instructions_list(),
            "prep_time": scraper.prep_time(),
            "cook_time": scraper.cook_time(),
            "servings": scraper.yields(),
            "image_url": image_url,
            "ingredients": [{"text": i} for i in ingredients],
            "source_url": url
        }
    except WebsiteNotImplementedError:
        print(f"DEBUG: Website not officially supported by library: {url}")
        return None
    except Exception as e:
        print(f"DEBUG: Unexpected scraping error for {url}: {e}")
        return None

def get_html(url: str):
    """
    Fetches the raw HTML content of a URL.
    """
    try:
        response = requests.get(url, headers={'User-Agent': 'LMeals Recipe Scraper'})
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching HTML for {url}: {e}")
        return None
