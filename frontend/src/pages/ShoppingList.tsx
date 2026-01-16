import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const ShoppingList = () => {
  const [items, setItems] = useState([
    { id: 1, text: '1 lb Ground Beef', checked: false },
    { id: 2, text: '1 Onion, chopped', checked: true },
    { id: 3, text: '2 cloves Garlic, minced', checked: false },
  ]);
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, { id: Date.now(), text: newItem, checked: false }]);
      setNewItem('');
    }
  };

  const handleDeleteItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleToggleItem = (id: number) => {
    setItems(
      items.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Shopping List</h2>
      
      <div className="bg-white p-6 rounded-2xl shadow-md max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Generated List</h3>
          <button className="bg-sage-green text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
            Generate from Meal Plan
          </button>
        </div>

        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            className="block w-full rounded-md border-gray-300 focus:border-sage-green focus:ring-sage-green sm:text-sm"
            placeholder="Add a new item..."
          />
          <button onClick={handleAddItem} className="bg-soft-rose text-gray-800 p-2 rounded-lg hover:bg-opacity-80 transition-colors">
            <Plus />
          </button>
        </div>

        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleToggleItem(item.id)}
                  className="h-5 w-5 rounded border-gray-300 text-sage-green focus:ring-sage-green"
                />
                <span className={`ms-3 text-gray-700 ${item.checked ? 'line-through text-gray-400' : ''}`}>
                  {item.text}
                </span>
              </div>
              <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700">
                <Trash2 />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ShoppingList;
