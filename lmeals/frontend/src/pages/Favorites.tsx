import { useState, useEffect } from 'react';
import { getFavoriteRecipes, getAllergens } from '../lib/api';
import { Recipe, Allergen } from '../lib/types';
import RecipeCard from '../components/RecipeCard';

const FavoritesPage = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        const [favoriteRecipes, allergensData] = await Promise.all([
          getFavoriteRecipes(),
          getAllergens()
        ]);
        setRecipes(favoriteRecipes);
        setAllergens(allergensData);
      } catch (err) {
        setError('Failed to load favorite recipes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  // Check if a recipe has allergens
  const checkForAllergens = (recipe: Recipe): boolean => {
    if (recipe.has_allergens !== undefined && recipe.has_allergens !== null) {
      return recipe.has_allergens;
    }

    if (!allergens.length) return false;
    const recipeIngredients = recipe.ingredients.map(i => i.text.toLowerCase());
    return allergens.some(allergen => {
      const checks = [allergen.name.toLowerCase(), ...(allergen.keywords || []).map(k => k.toLowerCase())];
      return recipeIngredients.some(ingredient => checks.some(check => ingredient.includes(check)));
    });
  };

  return (
    <div className="p-4 md:p-8 lg:px-12 max-w-7xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-8">Your Favorite Recipes</h1>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 px-4 py-3 rounded-r shadow-sm" role="alert">{error}</div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 text-lg">No favorite recipes yet. Start adding some! ❤️</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {recipes.map(recipe => (
            <div
              key={recipe.id}
              className={`transition-all duration-500 ${removingIds.has(recipe.id) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            >
              <RecipeCard
                id={recipe.id}
                title={recipe.title}
                imageUrl={recipe.image_url || undefined}
                hasAllergens={checkForAllergens(recipe)}
                cookTime={recipe.cook_time || undefined}
                prepTime={recipe.prep_time || undefined}
                isFavorite={true}
                onFavoriteChange={(id, isFavorite) => {
                  if (!isFavorite) {
                    // Add to removing set for animation
                    setRemovingIds(prev => new Set(prev).add(id));
                    // Remove from list after animation
                    setTimeout(() => {
                      setRecipes(prev => prev.filter(r => r.id !== id));
                      setRemovingIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                      });
                    }, 500);
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
