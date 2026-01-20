"""
Translation utility for multilingual allergen detection.
Uses deep-translator to translate ingredients to English for comparison.
"""
from deep_translator import GoogleTranslator
from functools import lru_cache
import re

# Language code mapping
LANGUAGE_CODES = {
    'he': 'hebrew',
    'en': 'english',
    'es': 'spanish',
    'fr': 'french',
    'de': 'german',
    'it': 'italian',
    'ar': 'arabic',
}

@lru_cache(maxsize=1000)
def translate_to_english(text: str) -> str:
    """
    Translate text to English using Google Translate (via deep-translator).
    Uses caching to avoid repeated translations of the same text.
    
    Args:
        text: The text to translate
        
    Returns:
        The translated text in English, or the original text if translation fails
    """
    if not text or not text.strip():
        return text
    
    # Quick check: if text is already mostly English characters, don't translate
    # This saves API calls for English text
    ascii_ratio = sum(1 for c in text if ord(c) < 128) / len(text)
    if ascii_ratio > 0.8:  # More than 80% ASCII characters
        return text.lower()
    
    try:
        translator = GoogleTranslator(source='auto', target='en')
        translated = translator.translate(text)
        print(f"Translated '{text}' → '{translated}'")
        return translated.lower() if translated else text.lower()
    except Exception as e:
        print(f"Translation failed for '{text}': {e}")
        return text.lower()

def normalize_ingredient(ingredient_text: str) -> list[str]:
    """
    Normalize an ingredient by returning both the original and translated versions.
    Also extracts just the ingredient name (removes quantities/measurements).
    
    Args:
        ingredient_text: The full ingredient text (e.g., "2 cups חלב")
        
    Returns:
        List of normalized ingredient variants to check
    """
    if not ingredient_text:
        return []
    
    # Remove common measurements and quantities
    # Pattern matches: numbers, fractions, measurements like 'cup', 'tbsp', 'g', 'ml', etc.
    cleaned = re.sub(r'\b\d+[\d\s\/\.\-]*\b', '', ingredient_text)  # Remove numbers
    cleaned = re.sub(r'\b(cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|lb|g|kg|ml|l|litre|liter|piece|pieces|clove|cloves)s?\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()
    
    results = []
    
    # Add original (lowercased)
    original_lower = ingredient_text.lower()
    results.append(original_lower)
    
    # Add cleaned version
    if cleaned and cleaned.lower() != original_lower:
        results.append(cleaned.lower())
    
    # Add translated version
    translated = translate_to_english(cleaned if cleaned else ingredient_text)
    if translated and translated not in results:
        results.append(translated)
    
    return results

def ingredient_contains_allergen(ingredient_text: str, allergen_keywords: list[str]) -> bool:
    """
    Check if an ingredient contains any allergen keywords.
    Translates the ingredient to English and checks against all keyword variants.
    
    Args:
        ingredient_text: The ingredient text to check
        allergen_keywords: List of allergen keywords (can be in multiple languages)
        
    Returns:
        True if the ingredient matches any allergen keyword
    """
    if not ingredient_text or not allergen_keywords:
        return False
    
    # Get all normalized variants of the ingredient
    ingredient_variants = normalize_ingredient(ingredient_text)
    
    # Check if any variant contains any allergen keyword
    for variant in ingredient_variants:
        for keyword in allergen_keywords:
            if re.search(rf'\b{re.escape(keyword.lower())}\b', variant, re.IGNORECASE):
                print(f"✓ Potential allergen detected: '{keyword}' found in '{variant}' (original: '{ingredient_text}')")
                return True
    
    return False
