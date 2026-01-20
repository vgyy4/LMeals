import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, ShoppingCart, Settings, Heart } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

const AnimatedHamburger = ({ isOpen }: { isOpen: boolean }) => (
  <div className="relative w-5 h-5 flex items-center justify-center transition-all duration-300 pointer-events-none">
    <div className="relative w-5 h-3.5">
      <span
        className={`absolute left-0 w-full h-0.5 bg-current rounded-full transition-all duration-300 ease-in-out ${isOpen ? 'top-1/2 -rotate-45' : 'top-0'
          }`}
      />
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-current rounded-full transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 -translate-x-2' : 'opacity-100'
          }`}
      />
      <span
        className={`absolute left-0 w-full h-0.5 bg-current rounded-full transition-all duration-300 ease-in-out ${isOpen ? 'top-1/2 rotate-45' : 'bottom-0'
          }`}
      />
    </div>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const isOpen = isMobileOpen || !isCollapsed;

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center p-3 rounded-xl text-lg transition-all mb-1 group relative ${isActive
      ? 'bg-p-sky text-slate-800 shadow-sm font-semibold'
      : 'text-slate-500 hover:bg-p-sky/40 hover:text-slate-800'
    } ${isCollapsed && !isMobileOpen ? 'justify-center px-3' : 'px-4'}`;

  const handleLinkClick = () => {
    if (window.innerWidth < 768 && setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <aside
      className={`
        h-full bg-p-sidebar text-slate-800 p-4 flex flex-col border-r border-p-sky/30 shadow-sm transition-all duration-300 ease-in-out
        ${isMobileOpen
          ? 'fixed inset-y-0 left-0 z-50 w-64 translate-x-0'
          : 'fixed md:relative inset-y-0 -translate-x-full md:translate-x-0 hidden md:flex'
        }
        ${isCollapsed && !isMobileOpen ? 'md:w-20' : 'md:w-64'}
      `}
    >
      <div className={`mb-8 flex items-center transition-all duration-300 ${isCollapsed && !isMobileOpen ? 'flex-col space-y-4 px-0 justify-center' : 'flex-row justify-between px-2'}`}>
        {/* Only show logo in full view or mobile */}
        {(!isCollapsed || isMobileOpen) && (
          <h1 className="text-3xl font-bold bg-gradient-to-r from-p-coral to-p-peach bg-clip-text text-transparent truncate animate-in fade-in duration-500">
            LMeals
          </h1>
        )}

        {/* Toggle / Close Button - Center it in collapsed mode */}
        <button
          onClick={() => isMobileOpen ? setIsMobileOpen?.(false) : setIsCollapsed(!isCollapsed)}
          className={`p-2.5 rounded-xl bg-p-surface hover:bg-p-sky/50 text-slate-400 hover:text-slate-600 transition-all duration-300 active:scale-90 outline-none ${isCollapsed && !isMobileOpen ? 'mx-auto' : ''
            }`}
          title={isOpen ? "Collapse Menu" : "Expand Menu"}
        >
          <AnimatedHamburger isOpen={isOpen} />
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

      {/* Mobile Footer */}
      {(isMobileOpen || !isCollapsed) && (
        <div className="mt-auto p-4 text-center border-t border-p-sky/10 pt-6 animate-in fade-in slide-up-4 duration-500 delay-200">
          <p className="text-slate-400 text-[10px] tracking-wider uppercase font-medium">LMeals v1.0</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
