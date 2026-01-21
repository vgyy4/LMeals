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
  MouseSensor,
  TouchSensor,
} from '@dnd-kit/core';
import { getRecipes, getMealPlanEntries, createMealPlanEntry, deleteMealPlanEntry } from '../lib/api';
import { Recipe, MealPlanEntry } from '../lib/types';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChefHat, Plus, Coffee, Sun, Moon, IceCream, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- Constants ---
const MEAL_SLOTS = [
  { id: 'Breakfast', label: 'Breakfast', icon: Coffee, color: 'text-orange-600/70', bg: 'bg-p-peach/40' },
  { id: 'Morning Dessert', label: 'Dessert', icon: IceCream, color: 'text-purple-600/70', bg: 'bg-p-lavender/40' },
  { id: 'Lunch', label: 'Lunch', icon: Sun, color: 'text-blue-600/70', bg: 'bg-p-sky/40' },
  { id: 'Afternoon Dessert', label: 'Dessert', icon: IceCream, color: 'text-purple-600/70', bg: 'bg-p-lavender/40' },
  { id: 'Dinner', label: 'Dinner', icon: Moon, color: 'text-emerald-600/70', bg: 'bg-p-mint/40' },
  { id: 'Evening Dessert', label: 'Dessert', icon: IceCream, color: 'text-purple-600/70', bg: 'bg-p-lavender/40' },
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
      style={{ touchAction: 'none' }}
      className={`group relative p-3 bg-white text-slate-700 rounded-xl cursor-grab mb-3 shadow-sm border border-p-sky/20 flex items-start gap-3 hover:border-p-mint hover:shadow-md transition-all ${isDragging ? 'opacity-50 ring-2 ring-p-mint rotate-2' : ''}`}
    >
      <div className="bg-p-mint/30 p-1.5 rounded-lg shrink-0 mt-0.5">
        <ChefHat size={16} className="text-emerald-700" />
      </div>
      <span className="text-sm font-medium leading-tight line-clamp-2 pr-1">{recipe.title}</span>
    </div>
  );
};

// Drag Overlay
const RecipeOverlay = ({ title }: { title: string }) => {
  return (
    <div className="p-3 bg-white text-slate-800 rounded-xl shadow-xl w-56 flex items-start gap-3 ring-2 ring-p-mint rotate-2 cursor-grabbing opacity-95 border border-p-mint/30">
      <div className="bg-p-mint/40 p-1.5 rounded-lg shrink-0 mt-0.5">
        <ChefHat size={16} className="text-emerald-700" />
      </div>
      <span className="text-sm font-bold leading-tight">{title}</span>
    </div>
  );
};

// Meal Item Card (Inside a slot)
const MealEntryCard = ({ entry, onDelete }: { entry: MealPlanEntry, onDelete: (id: number) => void }) => {
  const [isRemoving, setIsRemoving] = React.useState(false);

  const handleDelete = () => {
    setIsRemoving(true);
    setTimeout(() => onDelete(entry.id), 300);
  };

  return (
    <div
      className={`group relative bg-white p-2.5 rounded-lg border border-p-sky/10 shadow-sm hover:shadow active:cursor-grabbing cursor-grab flex items-start gap-2 mb-1.5 last:mb-0 transition-all duration-300 ${isRemoving ? 'opacity-0 -translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'}`}
    >
      <span className="text-xs font-semibold text-slate-700 leading-tight line-clamp-2 flex-1">
        {entry.recipe.title}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
        className="opacity-100 md:opacity-0 group-hover:opacity-100 text-p-coral hover:bg-p-rose/20 rounded p-1 transition-all"
      >
        <X size={14} />
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
      className={`flex-1 flex flex-col p-2 gap-1.5 transition-colors border-b last:border-0 border-p-sky/10 min-h-[100px] ${slot.bg} ${isOver ? 'ring-2 ring-inset ring-p-mint bg-p-mint/40' : ''}`}
    >
      <div className={`flex items-center gap-1.5 mb-1 ${slot.color} opacity-80`}>
        <slot.icon size={13} strokeWidth={2.5} />
        <span className="text-[10px] font-extrabold uppercase tracking-widest">{slot.label}</span>
      </div>

      <div className="flex flex-col flex-1 gap-1.5">
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
    <div className="flex-1 min-w-[150px] sm:min-w-[180px] border-r border-p-sky/10 bg-white flex flex-col h-full last:border-r-0">
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
  const [showRecipes, setShowRecipes] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.setDate(diff));
  });
  const [activeDragItem, setActiveDragItem] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
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
      // Auto-hide recipes drawer on mobile when dragging starts
      setShowRecipes(false);
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
    setMealPlan(prev => {
      const next = { ...prev };
      for (const key in next) {
        next[key] = next[key].filter(e => e.id !== entryId);
      }
      return next;
    });

    try {
      await deleteMealPlanEntry(entryId);
    } catch (error) {
      console.error("Failed to delete meal plan entry:", error);
      const startDate = weekDays[0].toISOString().split('T')[0];
      const endDate = weekDays[6].toISOString().split('T')[0];
      try {
        const mealPlanData = await getMealPlanEntries(startDate, endDate);
        const plan = mealPlanData.reduce((acc, entry) => {
          const date = entry.date.split('T')[0];
          if (!acc[date]) acc[date] = [];
          acc[date].push(entry);
          return acc;
        }, {} as Record<string, MealPlanEntry[]>);
        setMealPlan(plan);
      } catch (refetchError) {
        console.error("Failed to refetch after delete error:", refetchError);
      }
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
      <div className="flex flex-col lg:flex-row h-full gap-4 relative overflow-hidden">

        {/* Recipe Sidebar / Drawer */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 lg:static lg:z-auto w-72 bg-white p-5 shadow-2xl lg:shadow-sm border-r lg:border border-p-sky/10 flex flex-col shrink-0 transition-transform duration-300 lg:translate-x-0 rounded-r-2xl lg:rounded-2xl
            ${showRecipes ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <ChefHat className="text-p-mint" strokeWidth={3} size={28} />
              Recipes
            </h1>
            <button
              onClick={() => setShowRecipes(false)}
              className="lg:hidden p-2 rounded-xl bg-p-surface text-slate-500 border border-p-sky/10"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search favorites..."
              className="w-full bg-p-surface border-0 ring-1 ring-p-sky/20 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-p-mint transition-all outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {recipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4 opacity-60">
                <ChefHat className="text-p-mint/50" size={32} />
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  No recipes found.<br />
                  <Link to="/" className="text-p-coral hover:underline">Import some!</Link>
                </p>
              </div>
            ) : (
              recipes.map(recipe => <DraggableRecipe key={recipe.id} recipe={recipe} />)
            )}
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-p-sky/10 flex flex-col overflow-hidden relative">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 gap-4 border-b border-p-sky/10 shrink-0 bg-white/50 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowRecipes(true)}
                className="lg:hidden p-2.5 rounded-xl bg-p-mint/40 text-emerald-800 mr-2"
              >
                <ChefHat size={22} />
              </button>
              <h2 className="text-xl font-bold text-slate-800 truncate">{monthTitle}</h2>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1 bg-p-surface p-1 rounded-xl shrink-0 border border-p-sky/10">
                <button onClick={prevWeek} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-500"><ChevronLeft size={18} /></button>
                <button onClick={nextWeek} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all text-slate-500"><ChevronRight size={18} /></button>
              </div>
              <button
                onClick={goToday}
                className="px-5 py-2 text-sm font-bold text-slate-700 bg-p-surface hover:bg-p-mint hover:text-emerald-900 rounded-xl shadow-sm transition-all active:scale-95 border border-p-sky/10"
              >
                Today
              </button>
            </div>
          </div>

          {/* Scrolling Grid Wrapper */}
          <div className="flex-1 overflow-x-auto custom-scrollbar flex flex-col">

            {/* Sticky Days Header */}
            <div className="flex border-b border-p-sky/10 shrink-0 sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
              {weekDays.map(date => {
                const isToday = new Date().toDateString() === date.toDateString();
                const dayName = date.toLocaleString('default', { weekday: 'short' });
                return (
                  <div key={date.toISOString()} className="flex-1 min-w-[150px] sm:min-w-[180px] py-4 text-center border-r border-p-sky/10 last:border-0">
                    <div className={`text-[11px] font-black uppercase tracking-widest mb-1.5 ${isToday ? 'text-p-coral' : 'text-slate-400'}`}>
                      {dayName}
                    </div>
                    <div className={`text-xl font-medium inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all ${isToday ? 'bg-p-coral text-white shadow-lg shadow-p-coral/20 scale-110' : 'text-slate-700 hover:bg-p-surface'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div className="flex-1 flex min-h-0 bg-transparent">
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
