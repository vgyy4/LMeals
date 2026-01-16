import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRecipe } from '../lib/api';
import { Recipe } from '../lib/types';
import { CheckSquare, Square, Clock, Users, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { updateRecipeWithAi, getAllergens } from '../lib/api';
import { isRtlLang } from '../lib/utils';
import { Allergen } from '../lib/types';

const RecipeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [hasAllergens, setHasAllergens] = useState(false);

  useEffect(() => {
    const fetchRecipeAndAllergens = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [recipeData, allergensData] = await Promise.all([
          getRecipe(Number(id)),
          getAllergens(),
        ]);
        setRecipe(recipeData);
        setAllergens(allergensData);

        const recipeIngredients = recipeData.ingredients.map(i => i.text.toLowerCase());
        const doesHaveAllergens = allergensData.some(allergen =>
            recipeIngredients.some(ingredient => ingredient.includes(allergen.name.toLowerCase()))
        );
        setHasAllergens(doesHaveAllergens);

      } catch (err) {
        setError('Failed to load recipe.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipeAndAllergens();
  }, [id]);

  const handleIngredientToggle = (ingredientId: number) => {
    const newCheckedIngredients = new Set(checkedIngredients);
    if (newCheckedIngredients.has(ingredientId)) {
      newCheckedIngredients.delete(ingredientId);
    } else {
      newCheckedIngredients.add(ingredientId);
    }
    setCheckedIngredients(newCheckedIngredients);
  };

  const handleUpdateWithAi = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const updatedRecipe = await updateRecipeWithAi(Number(id));
      setRecipe(updatedRecipe);
    } catch (err) {
      setError('Failed to update recipe with AI.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading recipe...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (!recipe) {
    return <div className="text-center p-8">Recipe not found.</div>;
  }

  const totalTime = (parseInt(recipe.prep_time || '0') || 0) + (parseInt(recipe.cook_time || '0') || 0);
  const isRtl = isRtlLang(recipe.title);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <Link to="/" className="flex items-center gap-2 text-sage-green font-semibold mb-6 hover:underline">
        <ArrowLeft size={20} />
        Back to Dashboard
      </Link>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {recipe.image_url && (
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-64 object-cover" />
        )}
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{recipe.title}</h1>
            <button
              onClick={handleUpdateWithAi}
              className="flex items-center gap-2 px-4 py-2 bg-periwinkle-blue text-gray-800 font-semibold rounded-lg hover:bg-opacity-80 transition-colors"
            >
              <RefreshCw size={20} />
              Re-create with AI
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600 mb-6">
            {totalTime > 0 && (
                <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span>{totalTime} minutes</span>
                </div>
            )}
            {recipe.servings && (
                <div className="flex items-center gap-2">
                    <Users size={20} />
                    <span>{recipe.servings}</span>
                </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b-2 border-soft-rose pb-2">Ingredients</h2>
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => handleIngredientToggle(ingredient.id)}
                  >
                    {checkedIngredients.has(ingredient.id) ? <CheckSquare className="text-sage-green" /> : <Square className="text-gray-400" />}
                    <span className={`text-gray-800 ${checkedIngredients.has(ingredient.id) ? 'line-through text-gray-500' : ''}`}>
                      {ingredient.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b-2 border-periwinkle-blue pb-2">Instructions</h2>
              <ol className="space-y-4 list-decimal list-inside">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="text-gray-800 leading-relaxed">
                    {instruction}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailPage;
