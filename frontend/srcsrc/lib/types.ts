export interface Ingredient {
  id: number;
  text: string;
  recipe_id: number;
}

export interface Recipe {
  id: number;
  title: string;
  instructions: string[];
  prep_time: string | null;
  cook_time: string | null;
  servings: string | null;
  image_url: string | null;
  source_url: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  ingredients: Ingredient[];
}

export interface Allergen {
  id: number;
  name: string;
}

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResponse {
  status: 'success' | 'exists' | 'ai_required' | 'failed';
  recipe?: Recipe;
  message?: string;
  html?: string;
}

export interface GroqSettings {
    api_key: string;
    model: string;
}
