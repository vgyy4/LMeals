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
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChefHat } from 'lucide-react';

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
      className={`p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg cursor-grab mb-3 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-600 flex items-center gap-2 ${isDragging ? 'opacity-50' : ''}`}
    >
      <ChefHat size={18} className="text-emerald-500" />
      <span className="font-medium text-sm truncate">{recipe.title}</span>
    </div>
  );
};

// Overlay Component (what you see while dragging)
const RecipeOverlay = ({ recipe }: { recipe: Recipe }) => {
  return (
    <div className="p-3 bg-emerald-500 text-white rounded-lg shadow-xl w-48 flex items-center gap-2 transform scale-105 cursor-grabbing opacity-90">
      <ChefHat size={18} />
      <span className="font-bold text-sm truncate">{recipe.title}</span>
    </div>
  );
};


// Single Meal Slot (Breakfast, Lunch, Dinner)
const MealSlot = ({ date, mealType, children }: { date: string, mealType: string, children?: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `${date}::${mealType}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[2rem] p-1 rounded-md transition-colors border border-dashed border-transparent ${isOver ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
        }`}
    >
      <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1 pointer-events-none select-none">{mealType}</div>
      {children}
    </div>
  );
};


// Day Cell
const DayCell = ({ date, mealPlanData, onDelete }: { date: Date, mealPlanData: Record<string, MealPlanEntry[]>, onDelete: (id: number) => void }) => {
  const dateString = date.toISOString().split('T')[0];
  const isToday = new Date().toISOString().split('T')[0] === dateString;

  const getEntries = (type: string) => (mealPlanData[dateString] || []).filter(e => (e.meal_type || 'Dinner') === type);

  return (
    <div className={`border dark:border-slate-700 bg-white dark:bg-slate-800 p-2 min-h-[160px] flex flex-col gap-1 overflow-hidden transition-all ${isToday ? 'ring-2 ring-emerald-500 ring-inset' : ''}`}>
      <div className="text-right mb-1">
        <span className={`text-sm font-semibold inline-block w-7 h-7 leading-7 text-center rounded-full ${isToday ? 'bg-emerald-500 text-white' : 'text-slate-700 dark:text-slate-300'}`}>
          {date.getDate()}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        <MealSlot date={dateString} mealType="Breakfast">
          {getEntries('Breakfast').map(entry => (
            <MealEntryItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </MealSlot>
        <MealSlot date={dateString} mealType="Lunch">
          {getEntries('Lunch').map(entry => (
            <MealEntryItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </MealSlot>
        <MealSlot date={dateString} mealType="Dinner">
          {getEntries('Dinner').map(entry => (
            <MealEntryItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))}
        </MealSlot>
      </div>
    </div>
  );
};

const MealEntryItem = ({ entry, onDelete }: { entry: MealPlanEntry, onDelete: (id: number) => void }) => (
  <div className="group relative bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 p-1.5 rounded text-xs mb-1 shadow-sm border border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center animate-fadeIn">
    <span className="truncate pr-4">{entry.recipe.title}</span>
    <button
      onClick={() => onDelete(entry.id)}
      className="hidden group-hover:block absolute right-1 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm"
    >
      <X size={10} />
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

    // Generate days including padding for previous/next months grid
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days = [];

    // Previous month padding
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
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
      // Fetch current month + padding
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, daysInMonth).toISOString().split('T')[0];

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
      const overId = over.id as string; // Format: "DateString::MealType"

      const [date, mealType] = overId.split('::');

      if (!date || !mealType) return; // Invalid drop

      try {
        const newEntry = await createMealPlanEntry(date, recipe.id, mealType);
        // Optimistic update
        const dateKey = date;
        setMealPlan(prev => {
          const dayEntries = prev[dateKey] ? [...prev[dateKey]] : [];
          // Manually construct mostly-correct entry for instant feedback
          const optimisticEntry: any = {
            id: newEntry.id || Date.now(), // Fallback if API hasn't returned yet (though we await)
            date: dateKey,
            recipe_id: recipe.id,
            recipe: recipe,
            meal_type: mealType
          };
          return {
            ...prev,
            [dateKey]: [...dayEntries, optimisticEntry] // Replace with real one conceptually
          };
        });

        // Re-fetch strictly to ensure sync? Or just trust the return
        // Ideally we use the returned newEntry which we did above if createMealPlanEntry returns it
        if (newEntry) {
          setMealPlan(prev => ({
            ...prev,
            [dateKey]: [...(prev[dateKey] || []).filter(e => e.id !== newEntry.id), newEntry] // Basic dedup logic
          }));
        }

      } catch (error) {
        console.error("Failed to add meal plan entry:", error);
      }
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await deleteMealPlanEntry(entryId);
      // Remove from state
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
      <div className="flex flex-col h-full gap-6">

        {/* Header */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="text-emerald-500" />
            Meal Plan
          </h1>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronLeft /></button>
            <h2 className="text-xl font-semibold w-48 text-center">{title}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronRight /></button>
          </div>
        </div>

        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          {/* Sidebar */}
          <div className="w-64 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex flex-col shrink-0">
            <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider mb-4">Recipes</h3>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {recipes.length === 0 ? (
                <div className="text-slate-400 text-center text-sm mt-10">No recipes found.</div>
              ) : (
                recipes.map(recipe => <DraggableRecipe key={recipe.id} recipe={recipe} />)
              )}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 overflow-hidden flex flex-col">
            {/* Days Header */}
            <div className="grid grid-cols-7 mb-2 border-b dark:border-slate-700 pb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</div>
              ))}
            </div>

            {/* Calendar Body */}
            <div className="grid grid-cols-7 grid-rows-5 gap-px bg-slate-200 dark:bg-slate-700 flex-1 border dark:border-slate-700 overflow-hidden rounded-lg">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="bg-slate-50 dark:bg-slate-800/50"></div>;
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
