import { useState, useEffect, useMemo } from 'react';
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
      className={`p-2 px-3 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md cursor-grab mb-2 shadow-sm border border-slate-200 dark:border-slate-600 flex items-center gap-2 text-xs font-medium hover:border-emerald-400 transition-colors ${isDragging ? 'opacity-50 ring-2 ring-emerald-500' : ''}`}
    >
      <ChefHat size={14} className="text-emerald-500 shrink-0" />
      <span className="truncate">{recipe.title}</span>
    </div>
  );
};

// Overlay Component
const RecipeOverlay = ({ recipe }: { recipe: Recipe }) => {
  return (
    <div className="p-2 px-3 bg-emerald-600 text-white rounded-md shadow-xl w-48 flex items-center gap-2 transform scale-105 cursor-grabbing opacity-90 text-xs font-bold">
      <ChefHat size={14} />
      <span className="truncate">{recipe.title}</span>
    </div>
  );
};


// Single Meal Slot
const MealSlot = ({ date, mealType, icon: Icon, children }: { date: string, mealType: string, icon: any, children?: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `${date}::${mealType}`,
  });

  const hasContent = React.Children.count(children) > 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[2.5rem] p-1 rounded transition-colors border border-transparent flex flex-col gap-1 ${isOver ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700' : hasContent ? 'bg-slate-50 dark:bg-slate-800/50' : ''
        }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 dark:text-slate-600 select-none">
        <Icon size={10} />
        {/* Only show text on hover or drop to save space if needed? Keeping text hidden mostly or very subtle */}
      </div>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
};


// Day Cell
const DayCell = ({ date, mealPlanData, onDelete }: { date: Date, mealPlanData: Record<string, MealPlanEntry[]>, onDelete: (id: number) => void }) => {
  const dateString = date.toISOString().split('T')[0];
  const isToday = new Date().toISOString().split('T')[0] === dateString;

  const getEntries = (type: string) => (mealPlanData[dateString] || []).filter(e => (e.meal_type || 'Dinner') === type);

  return (
    <div className={`bg-white dark:bg-slate-800 p-1.5 min-h-[140px] flex flex-col gap-1 overflow-hidden transition-all hover:bg-slate-50 dark:hover:bg-slate-750 ${isToday ? 'ring-1 ring-emerald-500 inset-0 z-10' : ''}`}>
      <div className="text-right">
        <span className={`text-[10px] font-medium inline-block min-w-[18px] text-center rounded-full ${isToday ? 'bg-emerald-500 text-white px-1' : 'text-slate-400 dark:text-slate-500'}`}>
          {date.getDate()}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-0.5">
        <MealSlot date={dateString} mealType="Breakfast" icon={Coffee}>
          {getEntries('Breakfast').map(entry => (
            <MealEntryItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </MealSlot>
        <div className="border-t border-dashed border-slate-100 dark:border-slate-700/50 my-0.5"></div>
        <MealSlot date={dateString} mealType="Lunch" icon={Sun}>
          {getEntries('Lunch').map(entry => (
            <MealEntryItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </MealSlot>
        <div className="border-t border-dashed border-slate-100 dark:border-slate-700/50 my-0.5"></div>
        <MealSlot date={dateString} mealType="Dinner" icon={Moon}>
          {getEntries('Dinner').map(entry => (
            <MealEntryItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </MealSlot>
      </div>
    </div>
  );
};

const MealEntryItem = ({ entry, onDelete }: { entry: MealPlanEntry, onDelete: (id: number) => void }) => (
  <div className="group relative bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-[10px] shadow-sm flex justify-between items-center hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors">
    <span className="truncate pr-3 w-full">{entry.recipe.title}</span>
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
      className="hidden group-hover:flex absolute right-0.5 top-1/2 -translate-y-1/2 text-rose-500 hover:text-white hover:bg-rose-500 rounded p-0.5 transition-all"
    >
      <X size={8} />
    </button>
  </div>
);


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
            <div className="grid grid-cols-7 grid-rows-5 gap-px bg-slate-100 dark:bg-slate-700/50 flex-1 overflow-hidden">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="bg-slate-50/30 dark:bg-slate-800"></div>;
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
