import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, ShoppingCart, Settings, Heart } from 'lucide-react';

const Sidebar = () => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center p-3 rounded-lg text-lg transition-colors mb-2 ${isActive
      ? 'bg-emerald-600 text-white shadow-md font-semibold'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <aside className="w-64 h-screen bg-slate-900 text-slate-50 p-4 flex flex-col shadow-xl hidden md:flex sticky top-0">
      <div className="mb-8 px-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
          LMeals
        </h1>
      </div>
      <nav className="flex-1">
        <NavLink to="/" className={navLinkClasses}>
          <LayoutDashboard className="me-3" size={20} />
          Dashboard
        </NavLink>
        <NavLink to="/meal-plan" className={navLinkClasses}>
          <Calendar className="me-3" size={20} />
          Meal Plan
        </NavLink>
        <NavLink to="/shopping-list" className={navLinkClasses}>
          <ShoppingCart className="me-3" size={20} />
          Shopping List
        </NavLink>
        <NavLink to="/favorites" className={navLinkClasses}>
          <Heart className="me-3" size={20} />
          Favorites
        </NavLink>
        <NavLink to="/settings" className={navLinkClasses}>
          <Settings className="me-3" size={20} />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
