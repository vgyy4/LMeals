import React, { useState, useEffect } from 'react';
import { getAllergens, createAllergen, deleteAllergen as apiDeleteAllergen, getSettings, saveSetting, verifyGroqKey, getGroqModels } from '../lib/api';

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
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [newAllergen, setNewAllergen] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [keyStatus, setKeyStatus] = useState<{ status: string; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadAllergens();
  }, []);

  // Fetch models whenever API key changes (and is valid/saved) or on load if key exists
  useEffect(() => {
    if (apiKey) {
      fetchModels();
    }
  }, [apiKey]);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      const keySetting = data.find((s: Setting) => s.key === 'GROQ_API_KEY');
      const modelSetting = data.find((s: Setting) => s.key === 'GROQ_MODEL');
      if (keySetting) setApiKey(keySetting.value);
      if (modelSetting) setModel(modelSetting.value);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllergens = async () => {
    try {
      const data = await getAllergens();
      setAllergens(data);
    } catch (error) {
      console.error('Error fetching allergens:', error);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await getGroqModels();
      if (response.status === 'success') {
        setAvailableModels(response.models);
      }
    } catch (error) {
      console.error("Failed to fetch models", error);
    }
  }

  const handleSaveSettings = async () => {
    try {
      await saveSetting('GROQ_API_KEY', apiKey);
      await saveSetting('GROQ_MODEL', model);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings.');
    }
  };

  const handleVerifyKey = async () => {
    setKeyStatus({ status: 'loading', message: 'Verifying...' });
    try {
      const response = await verifyGroqKey(apiKey);
      setKeyStatus(response);
      if (response.status === 'success') {
        // Auto-save the key if verification succeeds
        await saveSetting('GROQ_API_KEY', apiKey);
        fetchModels();
        setMessage('API Key verified and saved!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error: any) {
      setKeyStatus({ status: 'error', message: 'Verification failed' });
    }
  };

  const handleAddAllergen = async () => {
    if (!newAllergen.trim()) return;
    try {
      await createAllergen(newAllergen);
      setNewAllergen('');
      loadAllergens();
    } catch (error) {
      console.error('Error adding allergen:', error);
    }
  };

  const handleDeleteAllergen = async (id: number) => {
    try {
      await apiDeleteAllergen(id);
      loadAllergens();
    } catch (error) {
      console.error('Error deleting allergen:', error);
    }
  };

  if (loading) return <div className="p-4 text-slate-900 dark:text-slate-50">Loading...</div>;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-50">Settings</h1>

      <div className="bg-white dark:bg-slate-800 shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-50">Groq Configuration</h2>

        {/* API Key Section */}
        <div className="mb-4">
          <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2" htmlFor="apiKey">
            Groq API Key
          </label>
          <div className="flex gap-2">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 dark:text-slate-900 leading-tight focus:outline-none focus:shadow-outline bg-white"
              id="apiKey"
              type="password"
              placeholder="Enter your Groq API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors whitespace-nowrap"
              type="button"
              onClick={handleVerifyKey}
            >
              Check Key
            </button>
          </div>
          {keyStatus && (
            <p className={`text-sm mt-1 ${keyStatus.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {keyStatus.message}
            </p>
          )}
        </div>

        {/* Model Section */}
        <div className="mb-6">
          <label className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2" htmlFor="model">
            Groq Model
          </label>
          <div className="relative">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 dark:text-slate-900 leading-tight focus:outline-none focus:shadow-outline bg-white"
              id="model"
              type="text"
              list="model-options"
              placeholder="Select or type a model (e.g. llama3-70b-8192)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <datalist id="model-options">
              {availableModels.map(m => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          {availableModels.length === 0 && apiKey && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter a valid API key and click "Check Key" to load available models.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
            type="button"
            onClick={handleSaveSettings}
          >
            Save Settings
          </button>
          {message && <span className="text-green-600 dark:text-green-400 text-sm font-bold">{message}</span>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-50">Allergens</h2>
        <div className="flex mb-4">
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 dark:text-slate-900 leading-tight focus:outline-none focus:shadow-outline mr-2 bg-white"
            type="text"
            placeholder="Add new allergen"
            value={newAllergen}
            onChange={(e) => setNewAllergen(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddAllergen()}
          />
          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
            type="button"
            onClick={handleAddAllergen}
          >
            Add
          </button>
        </div>
        <ul>
          {allergens.map((allergen) => (
            <li key={allergen.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 p-2 mb-2 rounded">
              <span className="text-slate-900 dark:text-slate-100">{allergen.name}</span>
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline transition-colors text-sm"
                onClick={() => handleDeleteAllergen(allergen.id)}
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
