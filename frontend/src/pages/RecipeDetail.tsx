import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ShieldAlert } from 'lucide-react';
import { getRecipe, getAllergens } from '../lib/api';
import { Recipe, Allergen, Ingredient } from '../lib/types';

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          const [recipeData, allergensData] = await Promise.all([getRecipe(parseInt(id)), getAllergens()]);
          setRecipe(recipeData);
          setAllergens(allergensData);
        } catch (error) {
          console.error(`Failed to fetch data for recipe ${id}:`, error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [id]);

  const handleCheckboxChange = (ingredientId: number) => {
    setCheckedIngredients(prev =>
      prev.includes(ingredientId) ? prev.filter(id => id !== ingredientId) : [...prev, ingredientId]
    );
  };
  
  const getMatchedAllergens = (): string[] => {
    if (!recipe || !allergens.length) return [];
    const recipeIngredients = recipe.ingredients.map(i => i.text.toLowerCase());
    return allergens
      .filter(allergen => recipeIngredients.some(ing => ing.includes(allergen.name.toLowerCase())))
      .map(a => a.name);
  };
  
  const isAllergenic = (ingredient: Ingredient): boolean => {
      if (!allergens.length) return false;
      return allergens.some(allergen => ingredient.text.toLowerCase().includes(allergen.name.toLowerCase()));
  };

  const matchedAllergens = getMatchedAllergens();

  if (loading) return <div>Loading recipe...</div>;
  if (!recipe) return <div>Recipe not found.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6"><Link to="/" className="flex items-center"><ArrowLeft className="me-2" />Back to Dashboard</Link></div>
      {matchedAllergens.length > 0 && (
        <div className="bg-soft-rose border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex items-center">
          <ShieldAlert className="h-6 w-6 me-3" />
          <div><strong>Allergen Warning:</strong> This recipe may contain {matchedAllergens.join(', ')}.</div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <img src={recipe.image_url || 'https://via.placeholder.com/600x400'} alt={recipe.title} className="w-full h-64 object-cover" />
        <div className="p-8">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-bold">{recipe.title}</h2>
            <button className="flex items-center bg-periwinkle-blue text-white py-2 px-4 rounded-lg"><RefreshCw className="me-2" />Re-create with AI</button>
          </div>
          <div className="flex space-x-6 my-4">
            {recipe.prep_time && <span><strong>Prep:</strong> {recipe.prep_time}</span>}
            {recipe.cook_time && <span><strong>Cook:</strong> {recipe.cook_time}</span>}
            {recipe.servings && <span><strong>Servings:</strong> {recipe.servings}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Ingredients</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map(ing => (
                  <li key={ing.id} className={`flex items-center p-2 rounded-lg ${isAllergenic(ing) ? 'bg-soft-rose' : ''}`}>
                    <input type="checkbox" id={`ing-${ing.id}`} checked={checkedIngredients.includes(ing.id)} onChange={() => handleCheckboxChange(ing.id)} className="h-5 w-5 rounded"/>
                    <label htmlFor={`ing-${ing.id}`} className={`ms-3 ${checkedIngredients.includes(ing.id) ? 'line-through' : ''}`}>{ing.text}</label>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4">Instructions</h3>
              <ol className="list-decimal list-inside space-y-3">{recipe.instructions.map((inst, i) => <li key={i}>{inst}</li>)}</ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
