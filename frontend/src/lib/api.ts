import axios from 'axios';
import { Recipe, ScrapeRequest, ScrapeResponse, Allergen, GroqSettings } from './types';

const API_BASE_URL = 'http://localhost:8000/api';

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

export const scrapeWithAi = async (url: string, settings: GroqSettings): Promise<ScrapeResponse> => {
    const response = await api.post('/scrape-with-ai', { url, settings });
    return response.data;
};

export const deleteRecipe = async (id: number): Promise<void> => {
    await api.delete(`/recipes/${id}`);
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
