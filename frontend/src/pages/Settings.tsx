import { useState, useEffect, FormEvent } from 'react';
import { getSettings, updateSettings, getAllergens, createAllergen, deleteAllergen } from '../lib/api';
import { Settings, Allergen } from '../lib/types';
import { Trash2, PlusCircle } from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [newAllergen, setNewAllergen] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [settingsData, allergensData] = await Promise.all([getSettings(), getAllergens()]);
        setSettings(settingsData);
        setAllergens(allergensData);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        setStatusMessage({ type: 'error', message: 'Could not load settings.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      await updateSettings(settings);
      setStatusMessage({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setStatusMessage({ type: 'error', message: 'Failed to save settings.' });
    }
  };

  const handleAddAllergen = async () => {
    if (!newAllergen.trim()) return;
    try {
      const newAllergenData = await createAllergen(newAllergen.trim());
      setAllergens([...allergens, newAllergenData]);
      setNewAllergen('');
    } catch (error) {
      console.error('Failed to add allergen:', error);
      setStatusMessage({ type: 'error', message: 'Failed to add allergen.' });
    }
  };

  const handleDeleteAllergen = async (id: number) => {
    try {
      await deleteAllergen(id);
      setAllergens(allergens.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete allergen:', error);
      setStatusMessage({ type: 'error', message: 'Failed to delete allergen.' });
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>

      {statusMessage && (
        <div className={`p-4 mb-4 rounded-lg ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {statusMessage.message}
        </div>
      )}

      {/* AI Settings Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">AI Configuration</h2>
        <form onSubmit={handleSettingsSubmit} className="space-y-4">
          <div>
            <label htmlFor="groq_api_key" className="block text-sm font-medium text-gray-600">
              Groq API Key
            </label>
            <input
              id="groq_api_key"
              type="password"
              value={settings.groq_api_key || ''}
              onChange={(e) => setSettings({ ...settings, groq_api_key: e.target.value })}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-periwinkle-blue focus:border-periwinkle-blue"
              placeholder="Enter your Groq API Key"
            />
          </div>
          <div>
            <label htmlFor="groq_model" className="block text-sm font-medium text-gray-600">
              Groq Model
            </label>
            <select
              id="groq_model"
              value={settings.groq_model || 'llama3-70b-8192'}
              onChange={(e) => setSettings({ ...settings, groq_model: e.target.value })}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-periwinkle-blue focus:border-periwinkle-blue"
            >
              <option value="llama3-70b-8192">Llama 3 70b</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7b</option>
            </select>
          </div>
          <div className="text-end">
            <button
              type="submit"
              className="px-6 py-2 bg-sage-green text-white font-semibold rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Save AI Settings
            </button>
          </div>
        </form>
      </div>

      {/* Allergens Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Global Allergens</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAllergen}
            onChange={(e) => setNewAllergen(e.target.value)}
            className="flex-grow px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-periwinkle-blue focus:border-periwinkle-blue"
            placeholder="e.g., Peanuts"
          />
          <button
            onClick={handleAddAllergen}
            className="px-4 py-2 bg-soft-rose text-white font-semibold rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2"
          >
            <PlusCircle size={20} /> Add
          </button>
        </div>
        <ul className="space-y-2">
          {allergens.map((allergen) => (
            <li
              key={allergen.id}
              className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
            >
              <span className="text-gray-800">{allergen.name}</span>
              <button
                onClick={() => handleDeleteAllergen(allergen.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SettingsPage;
