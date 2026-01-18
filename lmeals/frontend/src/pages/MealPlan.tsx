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
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChefHat, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- Constants ---
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 to 23
const PIXELS_PER_HOUR = 60; // Height of one hour slot
const EVENT_WIDTH_PERCENT = 95; // Width of the event card within the column

// Meal Time Mapping (Simulated times for the visual grid)
const MEAL_TIMES = {
  Breakfast: 8, // 8 AM
  Lunch: 13,    // 1 PM
  Dinner: 19,   // 7 PM
};

const MEAL_COLORS = {
  Breakfast: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700/50 text-amber-900 dark:text-amber-100',
  Lunch: 'bg-sky-100 dark:bg-sky-900/40 border-sky-200 dark:border-sky-700/50 text-sky-900 dark:text-sky-100',
  Dinner: 'bg-rose-100 dark:bg-rose-900/40 border-rose-200 dark:border-rose-700/50 text-rose-900 dark:text-rose-100',
  Default: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-100'
};

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

// Drag Overlay (What you see when dragging)
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

// Event Block (The scheduled meal on the grid)
const EventBlock = ({ entry, onDelete }: { entry: MealPlanEntry, onDelete: (id: number) => void }) => {
  const styles = MEAL_COLORS[entry.meal_type as keyof typeof MEAL_COLORS] || MEAL_COLORS.Default;
  const top = (MEAL_TIMES[entry.meal_type as keyof typeof MEAL_TIMES] || 12) * PIXELS_PER_HOUR;
  const height = PIXELS_PER_HOUR * 1.5; // Fixed duration for visuals (1.5 hours)

  return (
    <div
      className={`absolute left-1 right-1 rounded border overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-all z-10 group ${styles}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <div className="p-1 px-2 h-full flex flex-col gap-0.5">
        <div className="flex justify-between items-start">
          <span className="text-[10px] uppercase font-bold opacity-70 tracking-wider">
            {entry.meal_type}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
            className="opacity-0 group-hover:opacity-100 text-current hover:bg-black/10 rounded-full p-0.5 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
        <span className="text-xs font-semibold leading-tight line-clamp-2">
          {entry.recipe.title}
        </span>
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-30"></div>
    </div>
  );
};

// Droppable Column for a Day
const DayColumn = ({ date, children }: { date: Date, children: React.ReactNode }) => {
  const dateStr = date.toISOString().split('T')[0];

  // We need 3 droppable zones per day to auto-snap
  const { setNodeRef: setBreakfastRef, isOver: isOverBreakfast } = useDroppable({ id: `${dateStr}::Breakfast` });
  const { setNodeRef: setLunchRef, isOver: isOverLunch } = useDroppable({ id: `${dateStr}::Lunch` });
  const { setNodeRef: setDinnerRef, isOver: isOverDinner } = useDroppable({ id: `${dateStr}::Dinner` });

  // Define areas for drop zones
  const breakfastTop = MEAL_TIMES.Breakfast * PIXELS_PER_HOUR;
  const lunchTop = MEAL_TIMES.Lunch * PIXELS_PER_HOUR;
  const dinnerTop = MEAL_TIMES.Dinner * PIXELS_PER_HOUR;
  const height = PIXELS_PER_HOUR * 3; // larger hit area

  return (
    <div className="relative border-r border-slate-100 dark:border-slate-800 h-full bg-white dark:bg-slate-900 min-w-[120px]">
      {/* Background Grid Lines */}
      {HOURS.map(hour => (
        <div
          key={hour}
          className="absolute w-full border-b border-slate-50 dark:border-slate-800/50"
          style={{ top: hour * PIXELS_PER_HOUR, height: PIXELS_PER_HOUR }}
        />
      ))}

      {/* Invisible Drop Zones */}
      <div ref={setBreakfastRef} className={`absolute w-full transition-colors duration-200 ${isOverBreakfast ? 'bg-amber-100/30' : ''}`} style={{ top: breakfastTop - PIXELS_PER_HOUR, height: height, zIndex: 1 }} />
      <div ref={setLunchRef} className={`absolute w-full transition-colors duration-200 ${isOverLunch ? 'bg-sky-100/30' : ''}`} style={{ top: lunchTop - PIXELS_PER_HOUR, height: height, zIndex: 1 }} />
      <div ref={setDinnerRef} className={`absolute w-full transition-colors duration-200 ${isOverDinner ? 'bg-rose-100/30' : ''}`} style={{ top: dinnerTop - PIXELS_PER_HOUR, height: height, zIndex: 1 }} />

      {/* Events */}
      {children}
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current time or 8 AM
  useEffect(() => {
    if (scrollContainerRef.current) {
      const hour = new Date().getHours();
      // Scroll to 1 hour before current time, or 7 AM if it's early/late
      const targetHour = hour > 6 && hour < 22 ? hour - 1 : 7;
      scrollContainerRef.current.scrollTop = targetHour * PIXELS_PER_HOUR;
    }
  }, []);

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
    // If week spans two months, show both? "Jan - Feb 2026"
    // For simplicity showing the month of the first day
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
  }, [currentWeekStart, weekDays]); // Refetch when week changes


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

      const recipe: Recipe = active.data.current.recipe || active.data.current; // Handle different data shapes if needed

      try {
        const newEntry = await createMealPlanEntry(date, recipe.id, mealType);

        // Optimistic Update
        setMealPlan(prev => {
          const dayEntries = prev[date] ? [...prev[date]] : [];
          // Remove optimistic duplicate if we are moving? (Not implemented, assume copy for now)
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
          <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <button onClick={goToday} className="px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Today</button>
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <button onClick={prevWeek} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronLeft size={20} /></button>
                <button onClick={nextWeek} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ChevronRight size={20} /></button>
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white ml-2">{monthTitle}</h2>
            </div>
          </div>

          {/* Scrolling Grid */}
          <div className="flex-1 overflow-y-auto relative custom-scrollbar flex flex-col" ref={scrollContainerRef}>

            {/* Sticky Days Header */}
            <div className="sticky top-0 z-30 flex bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
              <div className="w-16 shrink-0 border-r border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"></div> {/* Time axis spacer */}
              {weekDays.map(date => {
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <div key={date.toISOString()} className="flex-1 py-3 text-center border-r border-slate-100 dark:border-slate-700/50 last:border-0">
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

            <div className="flex flex-1" style={{ minHeight: HOURS.length * PIXELS_PER_HOUR }}>

              {/* Time Axis */}
              <div className="w-16 shrink-0 border-r border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 sticky left-0 z-20">
                {HOURS.map(hour => (
                  <div key={hour} className="relative border-b border-transparent box-border" style={{ height: PIXELS_PER_HOUR }}>
                    <span className="absolute -top-2.5 right-2 text-[10px] text-slate-400 font-medium">
                      {hour === 0 ? '' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map(date => {
                const dateKey = date.toISOString().split('T')[0];
                const dayEntries = mealPlan[dateKey] || [];
                return (
                  <DayColumn key={dateKey} date={date}>
                    {/* Current Time Indicator (only on today) */}
                    {new Date().toDateString() === date.toDateString() && (
                      <div
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-50 pointer-events-none flex items-center"
                        style={{ top: (new Date().getHours() * PIXELS_PER_HOUR) + (new Date().getMinutes() / 60 * PIXELS_PER_HOUR) }}
                      >
                        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                      </div>
                    )}

                    {dayEntries.map(entry => (
                      <EventBlock key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
                    ))}
                  </DayColumn>
                )
              })}

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
