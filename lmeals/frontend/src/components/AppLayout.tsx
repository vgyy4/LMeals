import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const AnimatedHamburger = ({ isOpen }: { isOpen: boolean }) => (
  <div className="relative w-6 h-6 flex items-center justify-center transition-all duration-300 pointer-events-none">
    <div className="relative w-5 h-4">
      <span
        className={`absolute left-0 w-full h-0.5 bg-slate-600 dark:bg-slate-400 rounded-full transition-all duration-300 ease-in-out ${isOpen ? 'top-[45%] rotate-45' : 'top-0'
          }`}
      />
      <span
        className={`absolute left-0 top-[45%] w-full h-0.5 bg-slate-600 dark:bg-slate-400 rounded-full transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 -translate-x-2' : 'opacity-100'
          }`}
      />
      <span
        className={`absolute left-0 w-full h-0.5 bg-slate-600 dark:bg-slate-400 rounded-full transition-all duration-300 ease-in-out ${isOpen ? 'top-[45%] -rotate-45' : 'top-full'
          }`}
      />
    </div>
  </div>
);

const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-900 dark:text-slate-50 relative overflow-x-hidden">
      {/* Mobile Header/Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center px-4 z-40">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-95 transition-all outline-none"
        >
          <AnimatedHamburger isOpen={isMobileOpen} />
        </button>
        <span className="ml-4 font-bold text-xl bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">LMeals</span>
      </div>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <main className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto w-full transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
