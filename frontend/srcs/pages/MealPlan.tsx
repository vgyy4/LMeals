import { ChevronLeft, ChevronRight } from 'lucide-react';

const MealPlan = () => {
  // For now, this is a static representation of a calendar.
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const calendarDays = Array.from({ length: 35 }, (_, i) => i + 1 - 4); // Dummy days for a 5-week view

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Meal Plan</h2>
      
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <ChevronLeft />
          </button>
          <h3 className="text-xl font-semibold">January 2024</h3>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <ChevronRight />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center font-semibold text-gray-600">{day}</div>
          ))}
          {calendarDays.map(day => (
            <div key={day} className={`border rounded-lg p-2 h-24 ${day > 0 && day <= 31 ? '' : 'bg-gray-50 text-gray-400'}`}>
              <span className="font-semibold">{day > 0 && day <= 31 ? day : ''}</span>
              {/* Recipes dropped here will be displayed in this space */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MealPlan;
