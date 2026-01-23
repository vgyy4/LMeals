import os
import uuid
import requests
from typing import Optional

# Path configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
IMAGES_DIR = os.path.join(STATIC_DIR, "images", "recipes")

# Ensure directory exists
os.makedirs(IMAGES_DIR, exist_ok=True)

def download_image(url: str) -> Optional[str]:
    """
    Downloads an image from a URL and saves it locally.
    Returns the relative path to be stored in the database,
    or None if the download fails.
    """
    if not url:
        return None
        
    try:
        # Avoid double-downloading if already local
        if url.startswith("images/recipes/"):
            return url
            
        print(f"DEBUG: Downloading image from {url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        }
        
        response = requests.get(url, headers=headers, stream=True, timeout=10)
        response.raise_for_status()
        
        # Determine file extension (default to jpg if unknown)
        content_type = response.headers.get("content-type", "").lower()
        ext = ".jpg"
        if "png" in content_type:
            ext = ".png"
        elif "webp" in content_type:
            ext = ".webp"
        elif "gif" in content_type:
            ext = ".gif"
        elif "jpeg" in content_type:
            ext = ".jpg"
            
        # Generate unique filename
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(IMAGES_DIR, filename)
        
        # Save file
        with open(filepath, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        # Return the relative path for the frontend
        relative_path = f"images/recipes/{filename}"
        print(f"DEBUG: Image saved to {relative_path}")
        return relative_path
        
    except Exception as e:
        print(f"DEBUG: Failed to download image from {url}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def delete_image(relative_path: str):
    """
    Deletes a local image file given its relative path.
    """
    if not relative_path or relative_path.startswith("http"):
        return
        
    try:
        # Path safety check
        filename = os.path.basename(relative_path)
        filepath = os.path.join(IMAGES_DIR, filename)
        
        if os.path.exists(filepath):
            os.remove(filepath)
            print(f"DEBUG: Deleted local image {filepath}")
        else:
            print(f"DEBUG: File not found for deletion: {filepath}")
            
    except Exception as e:
        print(f"DEBUG: Error deleting image {relative_path}: {e}")
