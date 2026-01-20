import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import AddRecipeModal from '../components/AddRecipeModal';
import { getRecipes, getAllergens } from '../lib/api';
import { Recipe, Allergen } from '../lib/types';

const Dashboard = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchRecipesAndAllergens = async () => {
    try {
      setLoading(true);
      setError(null);
      const [recipesData, allergensData] = await Promise.all([getRecipes(), getAllergens()]);
      setRecipes(recipesData);
      setAllergens(allergensData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Could not load recipes. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipesAndAllergens();
  }, []);

  const checkForAllergens = (recipe: Recipe): boolean => {
    // Use backend-computed has_allergens field if available (includes multilingual translation)
    if (recipe.has_allergens !== undefined && recipe.has_allergens !== null) {
      return recipe.has_allergens;
    }

    // Fallback to client-side checking (for backwards compatibility or if backend check not available)
    if (!allergens.length) return false;

    const recipeIngredients = recipe.ingredients.map(i => i.text.toLowerCase());

    return allergens.some(allergen => {
      // Collect all keywords (name + keyword variants)
      const checks = [allergen.name.toLowerCase(), ...(allergen.keywords || []).map(k => k.toLowerCase())];

      // Check if any ingredient contains any of the allergen keywords
      const hasMatch = recipeIngredients.some(ingredient => {
        // Check all keyword variants
        return checks.some(check => ingredient.includes(check));
      });

      if (hasMatch) {
        console.log(`Allergen '${allergen.name}' detected in recipe '${recipe.title}'`);
      }

      return hasMatch;
    });
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = recipe.title.toLowerCase().includes(searchTermLower) ||
        recipe.ingredients.some(i => i.text.toLowerCase().includes(searchTermLower));

      if (!matchesSearch) return false;

      const parseTime = (t: string | null) => parseInt(t || '0', 10);
      const totalTime = parseTime(recipe.prep_time) + parseTime(recipe.cook_time);
      const titleLower = recipe.title.toLowerCase();

      if (activeFilter === 'Quick & Easy') {
        // Only include if time is known and short (< 30m)
        return totalTime > 0 && totalTime <= 30;
      }
      if (activeFilter === 'Dessert') {
        return titleLower.includes('dessert') || titleLower.includes('cake') || titleLower.includes('cookie') || titleLower.includes('pie') || titleLower.includes('ice cream');
      }
      if (activeFilter === 'Breakfast') {
        return titleLower.includes('breakfast') || titleLower.includes('pancake') || titleLower.includes('egg') || titleLower.includes('waffle') || titleLower.includes('oat') || titleLower.includes('morning');
      }
      if (activeFilter === 'Lunch') {
        // Heuristic: sandwich, salad, wrap, etc.
        return titleLower.includes('lunch') || titleLower.includes('sandwich') || titleLower.includes('salad') || titleLower.includes('wrap') || titleLower.includes('burger');
      }
      if (activeFilter === 'Dinner') {
        // Broad catch, or maybe items that are main dishes? Hard to classify without tags.
        // For now, exclude obvious desserts/breakfasts if possible, or just look for "dinner", "steak", "pasta", "chicken"
        return titleLower.includes('dinner') || titleLower.includes('steak') || titleLower.includes('pasta') || titleLower.includes('chicken') || titleLower.includes('beef') || titleLower.includes('stew') || titleLower.includes('soup');
      }

      return true;
    });
  }, [recipes, searchTerm, activeFilter]);

  // Recipe of the day logic
  const recipeOfTheDay = useMemo(() => {
    if (recipes.length === 0) return null;

    // Seed random with today's date so it stays constant for the day
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);

    // Filterfavorites first
    const favorites = recipes.filter(r => r.is_favorite);
    const pool = favorites.length > 0 ? favorites : recipes;

    // Simple pseudo-random index
    const index = seed % pool.length;
    return pool[index];
  }, [recipes]);

  const categories = ['All', 'Quick & Easy', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'];

  return (
    <div className="p-4 md:p-8 lg:px-12 max-w-7xl mx-auto">
      {isModalOpen && <AddRecipeModal onClose={() => setIsModalOpen(false)} onRecipeAdded={fetchRecipesAndAllergens} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">What to cook today?</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Discover your next favorite meal.</p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="bg-p-mint text-emerald-900 font-bold py-2.5 px-5 rounded-full flex items-center gap-2 hover:bg-emerald-100 transition-all shadow-sm active:scale-95 border border-p-mint/50">
          <Plus size={20} className="text-emerald-700" />
          <span>Add Recipe</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-6 mb-10">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search recipes, ingredients, tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-12 ps-12 pe-4 rounded-xl bg-white border border-p-sky/30 focus:border-p-mint focus:ring-4 focus:ring-p-mint/20 transition-all shadow-sm text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={16} className="text-slate-400 mr-2" />
          {categories.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`h-9 px-4 rounded-full font-medium text-sm transition-all whitespace-nowrap border ${activeFilter === filter
                ? 'bg-p-sky text-blue-900 border-p-sky shadow-sm transform scale-105'
                : 'bg-white text-slate-500 border-p-sky/20 hover:border-p-sky/50 hover:bg-p-surface'
                }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe of the day */}
      {recipeOfTheDay && !searchTerm && activeFilter === 'All' && (
        <div className="mb-12 animate-fadeIn">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-p-peach text-orange-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">Featured</span>
            <h2 className="text-xl font-bold text-slate-800">Recipe of the Day</h2>
          </div>

          <Link to={`/recipe/${recipeOfTheDay.id}`} className="block relative group overflow-hidden rounded-2xl md:rounded-3xl h-[360px] shadow-xl ring-1 ring-black/5">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105" style={{ backgroundImage: `url(${recipeOfTheDay.image_url || '/placeholder-recipe.jpg'})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className="text-white text-3xl md:text-5xl font-bold mb-2 leading-tight shadow-sm">{recipeOfTheDay.title}</h3>
              {recipeOfTheDay.prep_time && <p className="text-slate-200 font-medium flex items-center gap-2">{recipeOfTheDay.prep_time} prep</p>}
            </div>
          </Link>
        </div>
      )}

      {error && <div className="bg-p-rose/30 border-l-4 border-p-coral text-red-800 px-4 py-3 rounded-r mb-6 shadow-sm" role="alert">{error}</div>}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeFilter === 'All' ? 'All Recipes' : `${activeFilter} Recipes`}</h2>
        <span className="text-slate-400 text-sm font-medium">{filteredRecipes.length} results</span>
      </div>

      {loading && !recipes.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              id={recipe.id}
              title={recipe.title}
              imageUrl={recipe.image_url || undefined}
              hasAllergens={checkForAllergens(recipe)}
              cookTime={recipe.cook_time || undefined}
              prepTime={recipe.prep_time || undefined}
              isFavorite={recipe.is_favorite || false}
            />
          ))}
          {filteredRecipes.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400">
              <p>No recipes match your criteria.</p>
              <button onClick={() => { setSearchTerm(''); setActiveFilter('All'); }} className="text-p-coral font-bold mt-2 hover:underline">Clear filters</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
