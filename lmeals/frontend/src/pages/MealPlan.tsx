import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getRecipes, getMealPlanEntries, createMealPlanEntry, deleteMealPlanEntry } from '../lib/api';
import { Recipe, MealPlanEntry } from '../lib/types';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChefHat, Coffee, Sun, Moon, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

// Draggable Sidebar Item
const DraggableRecipe = ({ recipe }: { recipe: Recipe }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: recipe
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group relative p-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg cursor-grab mb-3 shadow-sm border border-slate-200 dark:border-slate-700 flex items-start gap-3 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all ${isDragging ? 'opacity-50 ring-2 ring-emerald-500 rotate-2' : ''}`}
    >
      <div className="bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-md shrink-0 mt-0.5">
        <ChefHat size={16} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <span className="text-sm font-medium leading-tight line-clamp-2 pr-1">{recipe.title}</span>
      <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-transparent group-hover:ring-emerald-400/50 transition-all pointer-events-none" />
    </div>
  );
};

// Overlay Component
const RecipeOverlay = ({ recipe }: { recipe: Recipe }) => {
  return (
    <div className="p-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg shadow-xl w-56 flex items-start gap-3 ring-2 ring-emerald-500 rotate-2 cursor-grabbing opacity-95">
      <div className="bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-md shrink-0 mt-0.5">
        <ChefHat size={16} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <span className="text-sm font-bold leading-tight">{recipe.title}</span>
    </div>
  );
};


// Single Meal Slot
const MealSlot = ({ date, mealType, icon: Icon, label, children }: { date: string, mealType: string, icon: any, label: string, children?: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `${date}::${mealType}`,
  });

  const hasContent = React.Children.count(children) > 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col gap-1.5 p-1.5 rounded-md transition-all duration-200 min-h-[80px] ${isOver ? 'bg-emerald-50/80 dark:bg-emerald-900/30 ring-2 ring-emerald-400/50 ring-inset' :
        'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
    >
      <div className="flex items-center gap-1.5 select-none opacity-40 group-hover/day:opacity-70 transition-opacity px-1">
        <Icon size={12} className={isOver ? "text-emerald-600" : ""} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 w-full">
        {children}
        {children && React.Children.count(children) === 0 && (
          <div className={`h-full w-full rounded border border-dashed border-slate-200 dark:border-slate-700/50 opacity-0 transition-opacity ${isOver ? 'opacity-100 bg-emerald-100/20' : 'group-hover/day:opacity-50'}`}></div>
        )}
      </div>
    </div>
  );
};


const MealEntryItem = ({ entry, onDelete }: { entry: MealPlanEntry, onDelete: (id: number) => void }) => (
  <div className="group/item relative bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 rounded-md border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 hover:border-emerald-300 dark:hover:border-emerald-500 cursor-grab active:cursor-grabbing w-full">
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs font-medium leading-snug line-clamp-2 w-full">{entry.recipe.title}</span>
    </div>
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
      className="absolute -top-1 -right-1 opacity-0 group-hover/item:opacity-100 bg-rose-500 text-white rounded-full p-0.5 shadow-sm hover:bg-rose-600 hover:scale-110 transition-all z-10"
      title="Remove from plan"
    >
      <X size={10} />
    </button>
  </div>
);


// Day Cell
const DayCell = ({ date, mealPlanData, onDelete }: { date: Date, mealPlanData: Record<string, MealPlanEntry[]>, onDelete: (id: number) => void }) => {
  const dateString = date.toISOString().split('T')[0];
  const isToday = new Date().toISOString().split('T')[0] === dateString;

  const getEntries = (type: string) => (mealPlanData[dateString] || []).filter(e => (e.meal_type || 'Dinner') === type);

  return (
    <div className={`group/day relative bg-white dark:bg-slate-800 flex flex-col min-h-[320px] transition-colors border-r border-b border-slate-100 dark:border-slate-700/50 ${isToday ? 'bg-slate-50/30' : ''}`}>
      {/* Date Header */}
      <div className={`p-2 flex justify-end ${isToday ? 'bg-emerald-50/30' : ''}`}>
        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-emerald-500 text-white shadow-sm scale-110' : 'text-slate-400 dark:text-slate-500'}`}>
          {date.getDate()}
        </span>
      </div>

      <div className="flex-1 flex flex-col px-1 pb-2 gap-1">
        <MealSlot date={dateString} mealType="Breakfast" icon={Coffee} label="Breakfast">
          {getEntries('Breakfast').map(entry => (
            <MealEntryItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </MealSlot>

        <MealSlot date={dateString} mealType="Lunch" icon={Sun} label="Lunch">
          {getEntries('Lunch').map(entry => (
            <MealEntryItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </MealSlot>

        <MealSlot date={dateString} mealType="Dinner" icon={Moon} label="Dinner">
          {getEntries('Dinner').map(entry => (
            <MealEntryItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </MealSlot>
      </div>

      {/* Today Highlight Border */}
      {isToday && <div className="absolute inset-0 border-2 border-emerald-500 pointer-events-none z-20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]"></div>}
    </div>
  );
};


const MealPlan = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<Record<string, MealPlanEntry[]>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDragItem, setActiveDragItem] = useState<Recipe | null>(null);

  const { title, firstDayOfMonth, daysInMonth, calendarDays } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days = [];

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }

    // Fill end of week padding
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return {
      title: firstDay.toLocaleString('default', { month: 'long', year: 'numeric' }),
      firstDayOfMonth: startPadding,
      daysInMonth: totalDays,
      calendarDays: days
    };
  }, [currentDate]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, daysInMonth).toISOString().split('T')[0]; // simple range approximation

      try {
        const [recipesData, mealPlanData] = await Promise.all([getRecipes(), getMealPlanEntries(startDate, endDate)]);
        setRecipes(recipesData);

        const plan = mealPlanData.reduce((acc, entry) => {
          const date = entry.date.split('T')[0];
          if (!acc[date]) acc[date] = [];
          acc[date].push(entry);
          return acc;
        }, {} as Record<string, MealPlanEntry[]>);
        setMealPlan(plan);
      } catch (e) {
        console.error("Failed to load data", e);
      }
    };
    fetchInitialData();
  }, [currentDate, daysInMonth]);

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current) {
      setActiveDragItem(event.active.data.current as Recipe);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { over, active } = event;
    if (over && active.data.current) {
      const recipe = active.data.current as Recipe;
      const overId = over.id as string;

      const [date, mealType] = overId.split('::');

      if (!date || !mealType) return;

      try {
        const newEntry = await createMealPlanEntry(date, recipe.id, mealType);

        const dateKey = date;
        setMealPlan(prev => {
          const dayEntries = prev[dateKey] ? [...prev[dateKey]] : [];
          const optimisticEntry: any = {
            id: newEntry.id || Date.now() + Math.random(),
            date: dateKey,
            recipe_id: recipe.id,
            recipe: recipe,
            meal_type: mealType
          };
          return {
            ...prev,
            [dateKey]: [...dayEntries, optimisticEntry]
          };
        });

      } catch (error) {
        console.error("Failed to add meal plan entry:", error);
      }
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await deleteMealPlanEntry(entryId);
      setMealPlan(prev => {
        const next = { ...prev };
        for (const key in next) {
          next[key] = next[key].filter(e => e.id !== entryId);
        }
        return next;
      });
    } catch (error) {
      console.error("Failed to delete meal plan entry:", error);
    }
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));


  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full gap-4">

        {/* Header */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="text-emerald-500" size={20} />
            Meal Plan
          </h1>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300"><ChevronLeft size={18} /></button>
            <h2 className="text-sm font-semibold w-32 text-center text-slate-700 dark:text-slate-200">{title}</h2>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="flex gap-4 h-[calc(100vh-10rem)]">
          {/* Sidebar */}
          <div className="w-56 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col shrink-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Recipes</h3>
              <Link to="/" className="text-[10px] text-emerald-500 hover:text-emerald-600 font-medium flex items-center gap-1">
                <Plus size={10} /> Add
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {recipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center p-2">
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-full mb-3">
                    <ChefHat className="text-slate-300 dark:text-slate-600" size={24} />
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-2">No recipes yet</p>
                  <Link to="/" className="text-[10px] bg-emerald-500 text-white px-3 py-1.5 rounded-full hover:bg-emerald-600 transition-colors">
                    Scrape one now
                  </Link>
                </div>
              ) : (
                recipes.map(recipe => <DraggableRecipe key={recipe.id} recipe={recipe} />)
              )}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{day}</div>
              ))}
            </div>

            {/* Calendar Body */}
            <div className="grid grid-cols-7 auto-rows-fr gap-px bg-slate-200 dark:bg-slate-900 flex-1 overflow-y-auto custom-scrollbar">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-slate-800/50"></div>;
                return (
                  <DayCell
                    key={date.toISOString()}
                    date={date}
                    mealPlanData={mealPlan}
                    onDelete={handleDeleteEntry}
                  />
                );
              })}
            </div>
          </div>
        </div>

      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeDragItem ? <RecipeOverlay recipe={activeDragItem} /> : null}
      </DragOverlay>

    </DndContext>
  );
};

export default MealPlan;
