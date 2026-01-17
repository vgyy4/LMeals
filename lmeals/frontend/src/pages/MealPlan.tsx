import { useState, useEffect, useMemo } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getRecipes, getMealPlanEntries, createMealPlanEntry, deleteMealPlanEntry } from '../lib/api';
import { Recipe, MealPlanEntry } from '../lib/types';
import { X } from 'lucide-react';

const DraggableRecipe = ({ recipe }: { recipe: Recipe }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `recipe-${recipe.id}`, data: recipe });
  const style = { transform: CSS.Translate.toString(transform) };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-2 bg-rose-100 dark:bg-rose-900 text-slate-900 dark:text-slate-100 rounded-lg cursor-grab mb-2 shadow-sm hover:shadow-md transition-shadow">
      {recipe.title}
    </div>
  );
};

const DroppableDay = ({ date, children }: { date: string, children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id: date });
  return (
    <div ref={setNodeRef} className={`border rounded-lg p-2 h-32 flex flex-col transition-colors ${isOver ? 'bg-emerald-100 dark:bg-emerald-900 border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
      {children}
    </div>
  );
};

const MealPlan = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<Record<string, MealPlanEntry[]>>({});
  const [currentDate, setCurrentDate] = useState(new Date());

  const { firstDayOfMonth, daysInMonth } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return {
      firstDayOfMonth: new Date(year, month, 1).getDay(),
      daysInMonth: new Date(year, month + 1, 0).getDate(),
    };
  }, [currentDate]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, daysInMonth).toISOString().split('T')[0];

      const [recipesData, mealPlanData] = await Promise.all([getRecipes(), getMealPlanEntries(startDate, endDate)]);
      setRecipes(recipesData);

      const plan = mealPlanData.reduce((acc, entry) => {
        const date = entry.date.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(entry);
        return acc;
      }, {} as Record<string, MealPlanEntry[]>);
      setMealPlan(plan);
    };
    fetchInitialData();
  }, [currentDate, daysInMonth]);

  const handleDragEnd = async (event: any) => {
    const { over, active } = event;
    if (over && active.data.current) {
      const recipe = active.data.current as Recipe;
      const date = over.id;

      try {
        const newEntry = await createMealPlanEntry(date, recipe.id);
        setMealPlan(prev => ({
          ...prev,
          [date]: [...(prev[date] || []), newEntry],
        }));
      } catch (error) {
        console.error("Failed to add meal plan entry:", error);
      }
    }
  };

  const handleDeleteEntry = async (entryId: number, date: string) => {
    try {
      await deleteMealPlanEntry(entryId);
      setMealPlan(prev => ({
        ...prev,
        [date]: prev[date].filter(entry => entry.id !== entryId),
      }));
    } catch (error) {
      console.error("Failed to delete meal plan entry:", error);
    }
  };

  const calendarDays = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day > 0 ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
  });

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-8">
        <div className="w-1/4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md">
          <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-50">Available Recipes</h3>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {recipes.map(recipe => <DraggableRecipe key={recipe.id} recipe={recipe} />)}
          </div>
        </div>

        <div className="w-3/4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md">
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center font-semibold text-slate-700 dark:text-slate-300">{day}</div>)}
            {calendarDays.map((date, i) => {
              if (!date) return <div key={i} className="border border-transparent rounded-lg p-2 h-32"></div>;
              const dateString = date.toISOString().split('T')[0];
              return (
                <DroppableDay key={dateString} date={dateString}>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{date.getDate()}</span>
                  <div className="mt-1 text-sm overflow-y-auto custom-scrollbar">
                    {(mealPlan[dateString] || []).map(entry => (
                      <div key={entry.id} className="bg-indigo-600 text-white p-1 rounded-md mb-1 text-xs flex justify-between items-center shadow-sm">
                        <span className="truncate mr-1">{entry.recipe.title}</span>
                        <button onClick={() => handleDeleteEntry(entry.id, dateString)} className="text-indigo-200 hover:text-white transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </DroppableDay>
              );
            })}
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default MealPlan;
