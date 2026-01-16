import { useState } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Sample Data
const sampleRecipes = [
  { id: 'recipe-1', title: 'Spaghetti Bolognese' },
  { id: 'recipe-2', title: 'Chicken Curry' },
  { id: 'recipe-3', title: 'Chocolate Cake' },
];

// Draggable Recipe Component
const DraggableRecipe = ({ id, title }: { id: string, title: string }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-2 bg-soft-rose rounded-lg cursor-grab mb-2">
      {title}
    </div>
  );
};

// Droppable Calendar Day Component
const DroppableDay = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  const style = {
    backgroundColor: isOver ? '#b2d2a4' : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-2 h-24">
      {children}
    </div>
  );
};


const MealPlan = () => {
  const [plannedRecipes, setPlannedRecipes] = useState<Record<string, string[]>>({});

  const handleDragEnd = (event: any) => {
    const { over, active } = event;
    if (over) {
      setPlannedRecipes(prev => {
        const currentRecipes = prev[over.id] || [];
        const recipeTitle = sampleRecipes.find(r => r.id === active.id)?.title;
        if (recipeTitle && !currentRecipes.includes(recipeTitle)) {
           return { ...prev, [over.id]: [...currentRecipes, recipeTitle] };
        }
        return prev;
      });
    }
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const calendarDays = Array.from({ length: 35 }, (_, i) => i + 1 - 4);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-8">
        <div className="w-1/4 bg-white p-4 rounded-2xl shadow-md">
          <h3 className="text-xl font-bold mb-4">Recipes</h3>
          {sampleRecipes.map(recipe => (
            <DraggableRecipe key={recipe.id} id={recipe.id} title={recipe.title} />
          ))}
        </div>

        <div className="w-3/4 bg-white p-6 rounded-2xl shadow-md">
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map(day => <div key={day} className="text-center font-semibold">{day}</div>)}
            {calendarDays.map(day => (
              <DroppableDay key={day} id={`day-${day}`}>
                <span className="font-semibold">{day > 0 && day <= 31 ? day : ''}</span>
                <div className="mt-1 text-sm">
                  {(plannedRecipes[`day-${day}`] || []).map((recipeTitle, i) => (
                    <div key={i} className="bg-periwinkle-blue text-white p-1 rounded-md mb-1 text-xs">{recipeTitle}</div>
                  ))}
                </div>
              </DroppableDay>
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default MealPlan;
