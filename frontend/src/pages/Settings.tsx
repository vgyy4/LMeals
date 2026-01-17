import React, { useState, useEffect } from 'react';

interface Setting {
  key: string;
  value: string;
}

interface Allergen {
  id: number;
  name: string;
}

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [newAllergen, setNewAllergen] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchAllergens();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data: Setting[] = await response.json();
        const keySetting = data.find(s => s.key === 'GROQ_API_KEY');
        const modelSetting = data.find(s => s.key === 'GROQ_MODEL');
        if (keySetting) setApiKey(keySetting.value);
        if (modelSetting) setModel(modelSetting.value);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllergens = async () => {
    try {
      const response = await fetch('/api/allergens');
      if (response.ok) {
        const data = await response.json();
        setAllergens(data);
      }
    } catch (error) {
      console.error('Error fetching allergens:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'GROQ_API_KEY', value: apiKey }),
      });
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'GROQ_MODEL', value: model }),
      });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings.');
    }
  };

  const addAllergen = async () => {
    if (!newAllergen.trim()) return;
    try {
      const response = await fetch('/api/allergens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAllergen }),
      });
      if (response.ok) {
        setNewAllergen('');
        fetchAllergens();
      }
    } catch (error) {
      console.error('Error adding allergen:', error);
    }
  };

  const deleteAllergen = async (id: number) => {
    try {
      await fetch(`/api/allergens/${id}`, { method: 'DELETE' });
      fetchAllergens();
    } catch (error) {
      console.error('Error deleting allergen:', error);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-bold mb-4">Groq Configuration</h2>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="apiKey">
            Groq API Key
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="apiKey"
            type="password"
            placeholder="Enter your Groq API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="model">
            Groq Model
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="model"
            type="text"
            placeholder="llama3-70b-8192"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={saveSettings}
          >
            Save Settings
          </button>
          {message && <span className="text-green-500 text-sm">{message}</span>}
        </div>
      </div>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-bold mb-4">Allergens</h2>
        <div className="flex mb-4">
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2"
            type="text"
            placeholder="Add new allergen"
            value={newAllergen}
            onChange={(e) => setNewAllergen(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addAllergen()}
          />
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="button"
            onClick={addAllergen}
          >
            Add
          </button>
        </div>
        <ul>
          {allergens.map((allergen) => (
            <li key={allergen.id} className="flex justify-between items-center bg-gray-100 p-2 mb-2 rounded">
              <span>{allergen.name}</span>
              <button
                className="text-red-500 hover:text-red-700 font-bold"
                onClick={() => deleteAllergen(allergen.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Settings;
