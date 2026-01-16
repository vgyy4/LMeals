import { useState, useEffect } from 'react';
import { KeyRound, Bot, Plus, Trash2 } from 'lucide-react';
import { getAllergens, createAllergen, deleteAllergen } from '../lib/api';
import { Allergen } from '../lib/types';

const Settings = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('groq_api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('groq_model') || 'llama3-70b');
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [newAllergen, setNewAllergen] = useState('');

  useEffect(() => {
    const fetchAllergens = async () => {
      const data = await getAllergens();
      setAllergens(data);
    };
    fetchAllergens();
  }, []);

  const handleSaveAiSettings = () => {
    localStorage.setItem('groq_api_key', apiKey);
    localStorage.setItem('groq_model', model);
    alert('AI settings saved!');
  };

  const handleAddAllergen = async () => {
    if (newAllergen && !allergens.find(a => a.name === newAllergen)) {
      const newAllergenData = await createAllergen(newAllergen);
      setAllergens([...allergens, newAllergenData]);
      setNewAllergen('');
    }
  };

  const handleDeleteAllergen = async (id: number) => {
    await deleteAllergen(id);
    setAllergens(allergens.filter(allergen => allergen.id !== id));
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Settings</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800">AI Configuration</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-lg font-medium text-gray-700">Groq API Key</label>
              <input type="password" id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="block w-full rounded-md border-gray-300 ps-10 focus:border-sage-green focus:ring-sage-green sm:text-sm" placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"/>
            </div>
            <div>
              <label htmlFor="model" className="block text-lg font-medium text-gray-700">Model Name</label>
              <select id="model" value={model} onChange={(e) => setModel(e.target.value)} className="block w-full rounded-md border-gray-300 ps-10 focus:border-sage-green focus:ring-sage-green sm:text-sm">
                <option value="llama3-70b">Llama 3 70b</option>
                <option value="mixtral-8x7b">Mixtral 8x7b</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSaveAiSettings} className="bg-soft-rose text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">Save AI Settings</button>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800">Allergen Manager</h3>
          <div className="flex space-x-2">
            <input type="text" value={newAllergen} onChange={(e) => setNewAllergen(e.target.value)} className="block w-full rounded-md border-gray-300 focus:border-sage-green focus:ring-sage-green sm:text-sm" placeholder="e.g., Shellfish"/>
            <button onClick={handleAddAllergen} className="bg-sage-green text-white p-2 rounded-lg hover:bg-opacity-80 transition-colors"><Plus /></button>
          </div>
          <ul className="mt-4 space-y-2">
            {allergens.map(allergen => (
              <li key={allergen.id} className="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
                <span className="text-gray-700">{allergen.name}</span>
                <button onClick={() => handleDeleteAllergen(allergen.id)} className="text-red-500 hover:text-red-700"><Trash2 /></button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Settings;
