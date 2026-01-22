import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRecipe } from '../lib/api';
import { Recipe } from '../lib/types';
import { CheckSquare, Square, Clock, Users, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { updateRecipeWithAi, getAllergens } from '../lib/api';
import { isRtlLang, parseTimeToMinutes, formatMinutes } from '../lib/utils';
import { Allergen } from '../lib/types';
import ServingScaler from '../components/ServingScaler';
import { scaleIngredientText, scaleServings, scaleTemplate } from '../lib/scaling';

const RecipeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [hasAllergens, setHasAllergens] = useState(false);
  const [multiplier, setMultiplier] = useState(1);

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

  const totalMinutes = parseTimeToMinutes(recipe.prep_time) + parseTimeToMinutes(recipe.cook_time);
  const isRtl = isRtlLang(recipe.title);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <Link to="/" className="flex items-center gap-2 text-p-coral font-bold mb-6 hover:underline">
        <ArrowLeft size={20} />
        Back to Dashboard
      </Link>
      <div className="bg-white rounded-3xl shadow-sm border border-p-sky/10 overflow-hidden">
        {recipe.image_url && (
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-64 object-cover" />
        )}
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">{recipe.title}</h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-400 font-medium">
                {totalMinutes > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span>{formatMinutes(totalMinutes)}</span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-2">
                    <Users size={20} />
                    <span>{scaleServings(recipe.servings, multiplier)} {recipe.yield_unit || 'servings'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <button
                onClick={handleUpdateWithAi}
                className="flex items-center gap-2 px-6 py-2.5 bg-p-sky text-blue-900 font-bold rounded-xl hover:bg-blue-100 transition-all shadow-sm border border-p-sky/30"
              >
                <RefreshCw size={20} />
                Re-create with AI
              </button>

              {/* Animated Serving Scaler */}
              {recipe.servings && (
                <ServingScaler
                  originalServings={recipe.servings}
                  yieldUnit={recipe.yield_unit}
                  onScaleChange={setMultiplier}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-p-peach pb-2">Ingredients</h2>
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-p-surface p-2 rounded-xl transition-colors"
                    onClick={() => handleIngredientToggle(ingredient.id)}
                  >
                    {checkedIngredients.has(ingredient.id) ? <CheckSquare className="text-p-mint" /> : <Square className="text-slate-300" />}
                    <span className={`text-slate-700 ${checkedIngredients.has(ingredient.id) ? 'line-through text-slate-400' : ''}`}>
                      {scaleIngredientText(ingredient.text, multiplier)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-p-sky pb-2">Instructions</h2>
              <ol className="space-y-4 list-decimal list-inside">
                {(recipe.instruction_template || recipe.instructions).map((instruction, index) => (
                  <li key={index} className="text-slate-700 leading-relaxed">
                    {recipe.instruction_template
                      ? scaleTemplate(instruction, multiplier)
                      : instruction}
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
