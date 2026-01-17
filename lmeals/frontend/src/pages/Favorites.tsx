import { useState, useEffect } from 'react';
import { getFavoriteRecipes } from '../lib/api';
import { Recipe } from '../lib/types';
import RecipeCard from '../components/RecipeCard';

const FavoritesPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        const favoriteRecipes = await getFavoriteRecipes();
        setRecipes(favoriteRecipes);
      } catch (err) {
        setError('Failed to load favorite recipes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  return (
    <div className="p-4 md:p-8 lg:px-12">
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-8">Your Favorite Recipes</h1>
      {loading ? (
        <p>Loading favorites...</p>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">{error}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              id={recipe.id}
              title={recipe.title}
              imageUrl={recipe.image_url || undefined}
              hasAllergens={false} // We don't have allergen info here, so we'll just pass false
              cookTime={recipe.cook_time || undefined}
              prepTime={recipe.prep_time || undefined}
              isFavorite={recipe.is_favorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
