import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, ShoppingCart, Settings, Heart } from 'lucide-react';

const Sidebar = () => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center p-2 rounded-lg text-lg hover:bg-soft-rose ${
      isActive ? 'bg-soft-rose font-semibold text-gray-800' : 'text-gray-600'
    }`;

  return (
    <aside className="w-64 h-screen bg-sage-green p-4 flex flex-col">
      <div className="text-2xl font-bold mb-8 text-gray-800">
        <h1>LMeals</h1>
      </div>
      <nav className="flex flex-col space-y-2">
        <NavLink to="/" className={navLinkClasses}>
          <LayoutDashboard className="me-3" />
          Dashboard
        </NavLink>
        <NavLink to="/meal-plan" className={navLinkClasses}>
          <Calendar className="me-3" />
          Meal Plan
        </NavLink>
        <NavLink to="/shopping-list" className={navLinkClasses}>
          <ShoppingCart className="me-3" />
          Shopping List
        </NavLink>
        <NavLink to="/favorites" className={navLinkClasses}>
          <Heart className="me-3" />
          Favorites
        </NavLink>
        <NavLink to="/settings" className={navLinkClasses}>
          <Settings className="me-3" />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
