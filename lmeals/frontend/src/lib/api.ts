import axios from 'axios';
import { Recipe, ScrapeRequest, ScrapeResponse, Allergen, GroqSettings, MealPlanEntry } from './types';

const API_BASE_URL = 'api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Recipe Endpoints
export const getRecipes = async (): Promise<Recipe[]> => {
    const response = await api.get('/recipes');
    return response.data;
};

export const getRecipe = async (id: number): Promise<Recipe> => {
    const response = await api.get(`/recipes/${id}`);
    return response.data;
};

export const scrapeRecipe = async (url: string): Promise<ScrapeResponse> => {
    const response = await api.post('/scrape', { url });
    return response.data;
};

export const scrapeWithAi = async (url: string, mode: string = 'deep'): Promise<ScrapeResponse> => {
    const response = await api.post('/scrape-ai', { url, mode });
    return response.data;
};

export const deleteRecipe = async (id: number): Promise<void> => {
    await api.delete(`/recipes/${id}`);
};

export const updateRecipeWithAi = async (id: number): Promise<Recipe> => {
    const response = await api.put(`/recipes/${id}/scrape-ai`);
    return response.data;
};

export const getFavoriteRecipes = async (): Promise<Recipe[]> => {
    const response = await api.get('/recipes/favorites');
    return response.data;
};

export const setFavoriteStatus = async (id: number, isFavorite: boolean): Promise<Recipe> => {
    const response = await api.put(`/recipes/${id}/favorite?is_favorite=${isFavorite}`);
    return response.data;
};

// Allergen Endpoints
export const getAllergens = async (): Promise<Allergen[]> => {
    const response = await api.get('/allergens');
    return response.data;
};

export const createAllergen = async (name: string): Promise<Allergen> => {
    const response = await api.post('/allergens', { name });
    return response.data;
};

export const deleteAllergen = async (id: number): Promise<void> => {
    await api.delete(`/allergens/${id}`);
};

// Meal Plan Endpoints
export const getMealPlanEntries = async (startDate: string, endDate: string): Promise<any[]> => {
    const response = await api.get('/meal-plan', { params: { start_date: startDate, end_date: endDate } });
    return response.data;
};

export const createMealPlanEntry = async (date: string, recipeId: number, mealType: string = 'Dinner'): Promise<any> => {
    const response = await api.post('/meal-plan', { date, recipe_id: recipeId, meal_type: mealType });
    return response.data;
};

export const deleteMealPlanEntry = async (id: number): Promise<void> => {
    await api.delete(`/meal-plan/${id}`);
};

// Shopping List Endpoints
export const getShoppingList = async (startDate: string, endDate: string): Promise<string[]> => {
    const response = await api.get('/shopping-list', { params: { start_date: startDate, end_date: endDate } });
    return response.data;
};

// Settings Endpoints
export const getSettings = async (): Promise<any[]> => {
    const response = await api.get('/settings');
    return response.data;
};

export const saveSetting = async (key: string, value: string): Promise<any> => {
    const response = await api.post('/settings', { key, value });
    return response.data;
};

export const verifyGroqKey = async (apiKey: string): Promise<{ status: string; message: string }> => {
    const response = await api.post('/settings/verify-groq', { key: 'GROQ_API_KEY', value: apiKey });
    return response.data;
};

export const getGroqModels = async (apiKey?: string): Promise<{ status: string; models: string[] }> => {
    const params = apiKey ? { api_key: apiKey } : {};
    const response = await api.get('/settings/groq-models', { params });
    return response.data;
};
