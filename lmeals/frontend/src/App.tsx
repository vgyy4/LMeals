import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import MealPlan from './pages/MealPlan';
import ShoppingList from './pages/ShoppingList';
import Settings from './pages/Settings';
import RecipeDetail from './pages/RecipeDetail';
import FavoritesPage from './pages/Favorites';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('lmeals-theme') || 'pastel';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/meal-plan" element={<MealPlan />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
