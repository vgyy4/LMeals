from recipe_scrapers import scrape_me
from recipe_scrapers._exceptions import WebsiteNotImplementedError
import requests

def scrape_with_library(url: str):
    """
    Scrapes a recipe from a URL using the recipe-scrapers library.
    Fetches HTML first with a browser-like User-Agent to avoid bot detection.
    Strictly uses official support only (Standard Mode).
    """
    print(f"DEBUG: Attempting to scrape URL with library: {url}")
    
    html = get_html(url)
    if not html:
        return None

    try:
        # Use scrape_me with pre-fetched HTML if possible.
        # This is compatible with most versions of the library.
        try:
            scraper = scrape_me(url, html=html)
        except TypeError:
            # Fallback for even older versions that don't support the 'html' argument
            scraper = scrape_me(url)
        
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
    Fetches the raw HTML content of a URL using a browser-like User-Agent.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching HTML for {url}: {e}")
        return None
