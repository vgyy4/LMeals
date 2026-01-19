import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const AnimatedHamburger = ({ isOpen }: { isOpen: boolean }) => (
  <div className="relative w-6 h-5 flex flex-col justify-around transition-all duration-300">
    <span className={`w-full h-0.5 bg-slate-600 dark:bg-slate-400 rounded-full transition-all duration-300 origin-left ${isOpen ? 'rotate-45 translate-x-1.5 -translate-y-1' : ''}`} />
    <span className={`w-full h-0.5 bg-slate-600 dark:bg-slate-400 rounded-full transition-all duration-300 ${isOpen ? 'opacity-0 -translate-x-2' : ''}`} />
    <span className={`w-full h-0.5 bg-slate-600 dark:bg-slate-400 rounded-full transition-all duration-300 origin-left ${isOpen ? '-rotate-45 translate-x-1.5 translate-y-1' : ''}`} />
  </div>
);

const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-900 dark:text-slate-50">
      {/* Mobile Header/Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center px-4 z-40">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
        >
          <AnimatedHamburger isOpen={isMobileOpen} />
        </button>
        <span className="ml-4 font-bold text-xl bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">LMeals</span>
      </div>

      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <main className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
