import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Clock, Users, ArrowRight } from 'lucide-react';
import { getRecipes, getAllergens } from '../lib/api';
import { Recipe, Allergen } from '../lib/types';
import RecipeCard from '../components/RecipeCard';
import AddRecipeModal from '../components/AddRecipeModal';
import { parseTimeToMinutes, formatMinutes } from '../lib/utils';
import { formatServings } from '../lib/scaling';

const Dashboard = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipesAndAllergens();
  }, []);

  const fetchRecipesAndAllergens = async () => {
    try {
      setLoading(true);
      const data = await getRecipes();
      setRecipes(data);
    } catch (err) {
      setError('Failed to load recipes.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.ingredients.some(i => i.text.toLowerCase().includes(searchTerm.toLowerCase()));

      if (activeFilter === 'All') return matchesSearch;
      // Basic category matching logic (can be expanded)
      return matchesSearch;
    });
  }, [recipes, searchTerm, activeFilter]);

  // Recipe of the day logic
  const recipeOfTheDay = useMemo(() => {
    if (recipes.length === 0) return null;

    // Seed random with today's date so it stays constant for the day
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);

    // Filter favorites first
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
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">What to cook today?</h1>
          <p className="text-slate-500 mt-1">Discover your next favorite meal.</p>
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

          {(() => {
            const featuredTotal = parseTimeToMinutes(recipeOfTheDay.prep_time) + parseTimeToMinutes(recipeOfTheDay.cook_time);

            return (
              <Link to={`/recipe/${recipeOfTheDay.id}`} className="block relative group overflow-hidden rounded-2xl md:rounded-3xl h-[360px] shadow-xl ring-1 ring-black/5 bg-slate-800">
                <img
                  src={recipeOfTheDay.image_url || 'https://placehold.co/1200x800/F8E8EE/C9A9A6?text=LMeals'}
                  alt={recipeOfTheDay.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/1200x800/F8E8EE/C9A9A6?text=LMeals';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-white text-3xl md:text-5xl font-bold mb-2 leading-tight shadow-sm text-balance">{recipeOfTheDay.title}</h3>
                  <div className="flex items-center gap-4 text-slate-200 font-medium drop-shadow-sm">
                    {featuredTotal > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock size={18} className="text-p-peach" />
                        <span>{formatMinutes(featuredTotal)}</span>
                      </div>
                    )}
                    {recipeOfTheDay.servings && (
                      <div className="flex items-center gap-2">
                        <Users size={18} className="text-p-sky" />
                        <span>{formatServings(recipeOfTheDay.servings, 1, recipeOfTheDay.yield_unit)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })()}
        </div>
      )}

      {/* All Recipes Grid */}
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center justify-between">
        All Recipes
        <span className="text-sm font-normal text-slate-400">{filteredRecipes.length} results</span>
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              id={recipe.id}
              title={recipe.title}
              imageUrl={recipe.image_url ?? undefined}
              hasAllergens={recipe.has_allergens || false}
              cookTime={recipe.cook_time ?? undefined}
              prepTime={recipe.prep_time ?? undefined}
              servings={recipe.servings}
              yieldUnit={recipe.yield_unit}
              isFavorite={recipe.is_favorite || false}
              onFavoriteChange={() => fetchRecipesAndAllergens()}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
