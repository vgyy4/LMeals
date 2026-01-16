import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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

  if (loading && !recipes.length) {
    return <div className="text-center p-8">Loading recipes...</div>;
  }

  return (
    <div>
      {isModalOpen && <AddRecipeModal onClose={() => setIsModalOpen(false)} onRecipeAdded={fetchRecipesAndAllergens} />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Recipes Dashboard</h2>
        <button onClick={() => setIsModalOpen(true)} className="bg-soft-rose text-gray-800 font-semibold py-2 px-4 rounded-lg flex items-center hover:bg-opacity-80 transition-colors">
          <Plus className="me-2" />
          Add Recipe
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recipes.map(recipe => (
          <RecipeCard
            key={recipe.id}
            id={recipe.id}
            title={recipe.title}
            imageUrl={recipe.image_url || undefined}
            hasAllergens={checkForAllergens(recipe)}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
