import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent,
  useSensors,
  useSensor,
  PointerSensor,
} from '@dnd-kit/core';
import { getRecipes, getMealPlanEntries, createMealPlanEntry, deleteMealPlanEntry } from '../lib/api';
import { Recipe, MealPlanEntry } from '../lib/types';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChefHat, Plus, Coffee, Sun, Moon, IceCream } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- Constants ---
const MEAL_SLOTS = [
  { id: 'Breakfast', label: 'Breakfast', icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'Morning Dessert', label: 'Dessert', icon: IceCream, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/10' },
  { id: 'Lunch', label: 'Lunch', icon: Sun, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  { id: 'Afternoon Dessert', label: 'Dessert', icon: IceCream, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/10' },
  { id: 'Dinner', label: 'Dinner', icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { id: 'Evening Dessert', label: 'Dessert', icon: IceCream, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/10' },
];

// --- Helper Components ---

// Sidebar Recipe Item
const DraggableRecipe = ({ recipe }: { recipe: Recipe }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { type: 'new', recipe }
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
    </div>
  );
};

// Drag Overlay
const RecipeOverlay = ({ title }: { title: string }) => {
  return (
    <div className="p-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-lg shadow-xl w-56 flex items-start gap-3 ring-2 ring-emerald-500 rotate-2 cursor-grabbing opacity-95">
      <div className="bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-md shrink-0 mt-0.5">
        <ChefHat size={16} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <span className="text-sm font-bold leading-tight">{title}</span>
    </div>
  );
};

// Meal Item Card (Inside a slot)
const MealEntryCard = ({ entry, onDelete }: { entry: MealPlanEntry, onDelete: (id: number) => void }) => {
  return (
    <div className="group relative bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow active:cursor-grabbing cursor-grab flex items-start gap-2 mb-1 last:mb-0">
      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-tight line-clamp-2 flex-1">
        {entry.recipe.title}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 rounded p-0.5 transition-all"
      >
        <X size={12} />
      </button>
    </div>
  )
}


// Single Droppable Slot
const MealSlot = ({
  dateStr,
  slot,
  entries,
  onDelete
}: {
  dateStr: string,
  slot: typeof MEAL_SLOTS[0],
  entries: MealPlanEntry[],
  onDelete: (id: number) => void
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `${dateStr}::${slot.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col p-1.5 gap-1 transition-colors border-b last:border-0 border-slate-100 dark:border-slate-700/50 min-h-[80px] ${slot.bg} ${isOver ? 'ring-2 ring-inset ring-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : ''}`}
    >
      <div className={`flex items-center gap-1.5 mb-1 ${slot.color} opacity-70`}>
        <slot.icon size={12} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{slot.label}</span>
      </div>

      <div className="flex flex-col flex-1 gap-1">
        {entries.map(entry => (
          <MealEntryCard key={entry.id} entry={entry} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}


// Day Column with Stack
const DayColumn = ({ date, mealPlan, onDelete }: { date: Date, mealPlan: Record<string, MealPlanEntry[]>, onDelete: (id: number) => void }) => {
  const dateStr = date.toISOString().split('T')[0];
  const dayEntries = mealPlan[dateStr] || [];

  return (
    <div className="flex-1 min-w-[140px] border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full">
      {MEAL_SLOTS.map(slot => (
        <MealSlot
          key={slot.id}
          dateStr={dateStr}
          slot={slot}
          entries={dayEntries.filter(e => e.meal_type === slot.id)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};


// --- Main Component ---

const MealPlan = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<Record<string, MealPlanEntry[]>>({});
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const diff = now.getDate() - day; // Adjust to Sunday
    return new Date(now.setDate(diff));
  });
  const [activeDragItem, setActiveDragItem] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentWeekStart]);

  const monthTitle = useMemo(() => {
    return weekDays[0].toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [weekDays]);


  useEffect(() => {
    const fetchInitialData = async () => {
      const startDate = weekDays[0].toISOString().split('T')[0];
      const endDate = weekDays[6].toISOString().split('T')[0];

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
  }, [currentWeekStart, weekDays]);


  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current) {
      setActiveDragItem(active.data.current);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { over, active } = event;

    if (over && active.data.current) {
      const dropId = over.id as string;
      const [date, mealType] = dropId.split('::');

      if (!date || !mealType) return;

      const recipe: Recipe = active.data.current.recipe || active.data.current;

      try {
        const newEntry = await createMealPlanEntry(date, recipe.id, mealType);

        setMealPlan(prev => {
          const dayEntries = prev[date] ? [...prev[date]] : [];
          const entry: MealPlanEntry = {
            id: newEntry.id,
            date: date,
            recipe: recipe,
            recipe_id: recipe.id,
            meal_type: mealType
          };
          return {
            ...prev,
            [date]: [...dayEntries, entry]
          };
        });

      } catch (e) {
        console.error("Failed to create entry", e);
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


  const nextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  }

  const prevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  }

  const goToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    setCurrentWeekStart(new Date(now.setDate(diff)));
  }


  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4">

        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col shrink-0">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
            <CalendarIcon className="text-emerald-500" size={24} />
            Meal Plan
          </h1>

          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Recipes</h3>
            <Link to="/" className="text-[10px] text-emerald-500 hover:text-emerald-600 font-medium flex items-center gap-1">
              <Plus size={10} /> Add
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {recipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4 opacity-60">
                <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-full mb-3">
                  <ChefHat className="text-slate-400 dark:text-slate-500" size={24} />
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  No recipes found.<br />
                  <Link to="/" className="text-emerald-500 hover:underline">Add one now</Link>
                </p>
              </div>
            ) : (
              recipes.map(recipe => <DraggableRecipe key={recipe.id} recipe={recipe} />)
            )}
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={goToday} className="px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Today</button>
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <button onClick={prevWeek} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronLeft size={20} /></button>
                <button onClick={nextWeek} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronRight size={20} /></button>
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white ml-2">{monthTitle}</h2>
            </div>
          </div>

          {/* Days Header */}
          <div className="flex border-b border-slate-100 dark:border-slate-700 shrink-0">
            {weekDays.map(date => {
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div key={date.toISOString()} className="flex-1 min-w-[140px] py-3 text-center border-r border-slate-100 dark:border-slate-700/50 last:border-0">
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isToday ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {date.toLocaleString('default', { weekday: 'short' })}
                  </div>
                  <div className={`text-xl font-normal inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-200'}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrolling Grid */}
          <div className="flex-1 overflow-y-auto relative custom-scrollbar flex">
            {/* Day Columns */}
            {weekDays.map(date => (
              <DayColumn
                key={date.toISOString()}
                date={date}
                mealPlan={mealPlan}
                onDelete={handleDeleteEntry}
              />
            ))}
          </div>
        </div>

      </div>

      <DragOverlay
        dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.4' } }
          })
        }}
      >
        {activeDragItem ? (
          <RecipeOverlay title={activeDragItem.recipe?.title || activeDragItem.title} />
        ) : null}
      </DragOverlay>

    </DndContext>
  );
};

export default MealPlan;
