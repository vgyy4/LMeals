import { Plus } from 'lucide-react';
import RecipeCard from '../components/RecipeCard';

const sampleRecipes = [
  { id: 1, title: 'Spaghetti Bolognese', imageUrl: 'https://via.placeholder.com/300', hasAllergens: false },
  { id: 2, title: 'Chicken Curry', imageUrl: 'https://via.placeholder.com/300', hasAllergens: true },
  { id: 3, title: 'Chocolate Cake', imageUrl: 'https://via.placeholder.com/300', hasAllergens: false },
  { id: 4, title: 'Peanut Butter Cookies', imageUrl: 'https://via.placeholder.com/300', hasAllergens: true },
];

const Dashboard = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Recipes Dashboard</h2>
        <button className="bg-soft-rose text-gray-800 font-semibold py-2 px-4 rounded-lg flex items-center hover:bg-opacity-80 transition-colors">
          <Plus className="me-2" />
          Add Recipe
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sampleRecipes.map(recipe => (
          <RecipeCard key={recipe.id} {...recipe} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
