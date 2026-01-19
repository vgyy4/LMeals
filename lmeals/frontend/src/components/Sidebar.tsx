import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, ShoppingCart, Settings, Heart, ChevronLeft, Menu, X } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center p-3 rounded-xl text-lg transition-all mb-2 group ${isActive
      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 font-semibold'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    } ${isCollapsed && !isMobileOpen ? 'justify-center px-3' : 'px-4'}`;

  const handleLinkClick = () => {
    if (window.innerWidth < 768 && setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <aside
      className={`
        h-screen bg-slate-900 text-slate-50 p-4 flex flex-col shadow-2xl transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'fixed inset-0 z-50 w-full' : 'hidden md:flex sticky top-0'}
        ${isCollapsed && !isMobileOpen ? 'md:w-20' : 'md:w-64'}
      `}
    >
      <div className={`mb-8 flex items-center justify-between transition-all duration-300 ${isCollapsed && !isMobileOpen ? 'px-0 justify-center' : 'px-2'}`}>
        {(!isCollapsed || isMobileOpen) && (
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent truncate animate-in fade-in duration-500">
            LMeals
          </h1>
        )}

        {/* Toggle / Close Button */}
        <button
          onClick={() => isMobileOpen ? setIsMobileOpen?.(false) : setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-300 active:scale-90"
          title={isMobileOpen ? "Close Menu" : isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isMobileOpen ? (
            <X size={24} className="animate-in spin-in-90 duration-300" />
          ) : isCollapsed ? (
            <Menu size={20} />
          ) : (
            <ChevronLeft size={20} className="transition-transform duration-300" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {[
          { to: "/", icon: LayoutDashboard, label: "Dashboard" },
          { to: "/meal-plan", icon: Calendar, label: "Meal Plan" },
          { to: "/shopping-list", icon: ShoppingCart, label: "Shopping List" },
          { to: "/favorites", icon: Heart, label: "Favorites" },
          { to: "/settings", icon: Settings, label: "Settings" },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={navLinkClasses}
            onClick={handleLinkClick}
          >
            <Icon size={20} className={isCollapsed && !isMobileOpen ? 'm-0' : 'me-3'} />
            {(!isCollapsed || isMobileOpen) && (
              <span className="animate-in fade-in slide-in-from-left-2 duration-300 truncate">
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Optional Mobile Footer */}
      {isMobileOpen && (
        <div className="mt-auto p-4 text-center border-t border-slate-800/50 pt-6 animate-in fade-in slide-up-4 duration-500 delay-200">
          <p className="text-slate-500 text-xs text-center w-full">Modern Meal Planning for Everyone</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
