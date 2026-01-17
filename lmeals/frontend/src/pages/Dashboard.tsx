import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
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
    if (!allergens.length) return false;
    const recipeIngredients = recipe.ingredients.map(i => i.text.toLowerCase());
    return allergens.some(allergen =>
      recipeIngredients.some(ingredient => ingredient.includes(allergen.name.toLowerCase()))
    );
  };

  const filteredRecipes = recipes.filter(recipe => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = recipe.title.toLowerCase().includes(searchTermLower) ||
      recipe.ingredients.some(i => i.text.toLowerCase().includes(searchTermLower));

    // This is a placeholder for a real tagging system
    if (activeFilter !== 'All') {
      const totalTime = (parseInt(recipe.prep_time || '0') || 0) + (parseInt(recipe.cook_time || '0') || 0);
      if (activeFilter === 'Quick & Easy' && totalTime > 30) return false;
      if (activeFilter === 'Dessert' && !recipe.title.toLowerCase().includes('dessert')) return false; // Simple check
    }

    return matchesSearch;
  });

  const recipeOfTheDay = recipes.length > 0 ? recipes[0] : null;

  return (
    <div className="p-4 md:p-8 lg:px-12">
      {isModalOpen && <AddRecipeModal onClose={() => setIsModalOpen(false)} onRecipeAdded={fetchRecipesAndAllergens} />}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">What to cook today?</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-soft-rose text-white font-semibold py-2 px-4 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-colors shadow-md">
          <Plus />
          <span>Add Recipe</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center mb-8">
        <div className="relative flex-grow w-full">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search recipes or ingredients..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-14 ps-12 pe-4 rounded-2xl bg-white border-2 border-transparent focus:border-soft-rose focus:ring-0 shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Quick & Easy', 'Dessert'].map(filter => (
            <button key={filter} onClick={() => setActiveFilter(filter)} className={`h-10 px-5 rounded-full font-semibold text-sm transition-colors ${activeFilter === filter ? 'bg-sage-green text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe of the day */}
      {recipeOfTheDay && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Recipe of the Day</h2>
          <Link to={`/recipe/${recipeOfTheDay.id}`} className="block relative group overflow-hidden rounded-2xl md:rounded-3xl min-h-[300px] shadow-lg">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.6), transparent), url(${recipeOfTheDay.image_url})` }}></div>
            <div className="absolute bottom-0 p-6 md:p-8">
              <h3 className="text-white text-3xl md:text-4xl font-bold">{recipeOfTheDay.title}</h3>
            </div>
          </Link>
        </div>
      )}

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">{error}</div>}

      <h2 className="text-2xl font-bold text-gray-800 mb-4">All Recipes</h2>
      {loading && !recipes.length ? (
        <p>Loading recipes...</p>
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
              isFavorite={recipe.is_favorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
