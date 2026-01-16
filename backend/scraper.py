from recipe_scrapers import scrape_me
from recipe_scrapers._exceptions import WebsiteNotImplementedError
import requests

def scrape_with_library(url: str):
    """
    Scrapes a recipe from a URL using the recipe-scrapers library.
    Returns a dictionary of recipe data or None if scraping fails or is incomplete.
    """
    try:
        scraper = scrape_me(url, wild_mode=True)
        
        # Check for essential fields
        if not scraper.ingredients() or not scraper.instructions():
            return None
            
        return {
            "title": scraper.title(),
            "instructions": scraper.instructions_list(),
            "prep_time": scraper.prep_time(),
            "cook_time": scraper.cook_time(),
            "servings": scraper.yields(),
            "image_url": scraper.image(),
            "ingredients": [{"text": i} for i in scraper.ingredients()],
            "source_url": url
        }
    except WebsiteNotImplementedError:
        # This is expected when a site isn't supported, we'll fall back to Groq
        return None
    except Exception as e:
        print(f"An unexpected error occurred during scraping: {e}")
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
