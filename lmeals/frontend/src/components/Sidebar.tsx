import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, ShoppingCart, Settings, Heart, ChevronLeft, Menu } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center p-3 rounded-lg text-lg transition-colors mb-2 group ${isActive
      ? 'bg-emerald-600 text-white shadow-md font-semibold'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    } ${isCollapsed ? 'justify-center px-3' : 'px-4'}`;

  return (
    <aside
      className={`h-screen bg-slate-900 text-slate-50 p-4 flex flex-col shadow-xl hidden md:flex sticky top-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div className={`mb-8 flex items-center justify-between transition-all duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-2'}`}>
        {!isCollapsed && (
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent truncate animate-in fade-in duration-500">
            LMeals
          </h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-300 active:scale-90"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />}
        </button>
      </div>

      <nav className="flex-1">
        {[
          { to: "/", icon: LayoutDashboard, label: "Dashboard" },
          { to: "/meal-plan", icon: Calendar, label: "Meal Plan" },
          { to: "/shopping-list", icon: ShoppingCart, label: "Shopping List" },
          { to: "/favorites", icon: Heart, label: "Favorites" },
          { to: "/settings", icon: Settings, label: "Settings" },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={navLinkClasses}>
            <Icon size={20} className={isCollapsed ? 'm-0' : 'me-3'} />
            {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
