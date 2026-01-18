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
    console.log('fetchModels called with apiKey:', apiKey ? 'present' : 'missing');
    try {
      const response = await getGroqModels(apiKey);
      console.log('Models fetched successfully:', response);
      if (response.status === 'success') {
        setAvailableModels(response.models);
        console.log('Available models set:', response.models.length, 'models');
      }
    } catch (error) {
      console.error("Failed to fetch models", error);
    }
  }

  const handleSaveSettings = async () => {
    try {
      await saveSetting('GROQ_API_KEY', apiKey);
      if (model) {
        await saveSetting('GROQ_MODEL', model);
      }
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage(`Failed to save settings: ${error.message || 'Unknown error'}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleVerifyKey = async () => {
    setKeyStatus({ status: 'loading', message: 'Verifying...' });
    try {
      const response = await verifyGroqKey(apiKey);
      setKeyStatus(response);
      if (response.status === 'success') {
        // Auto-save the key if verification succeeds
        try {
          await saveSetting('GROQ_API_KEY', apiKey);
          setMessage('API Key verified and saved!');
          setTimeout(() => setMessage(''), 3000);
        } catch (saveError) {
          console.error('Failed to save API key:', saveError);
          setMessage('Key verified but failed to save. Click "Save Settings" to retry.');
          setTimeout(() => setMessage(''), 5000);
        }
        fetchModels();
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setKeyStatus({ status: 'error', message: error.message || 'Verification failed' });
    }
  };

  const [isAddingAllergen, setIsAddingAllergen] = useState(false);

  const handleAddAllergen = async () => {
    if (!newAllergen.trim()) return;

    setIsAddingAllergen(true);
    setMessage('');

    try {
      await createAllergen(newAllergen);
      setNewAllergen('');
      await loadAllergens();
      setMessage('Allergen added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error adding allergen:', error);
      let errorMsg = 'Failed to add allergen';
      if (error.response?.status === 400) {
        errorMsg = 'Allergen already exists';
      } else if (error.response?.status === 500) {
        errorMsg = 'Server error (AI generation failed). Try again.';
      }
      setMessage(errorMsg);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsAddingAllergen(false);
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
            Groq Model {availableModels.length > 0 && <span className="text-green-600 dark:text-green-400 text-xs font-normal">({availableModels.length} models available)</span>}
          </label>
          <div className="relative">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 dark:text-slate-900 leading-tight focus:outline-none focus:shadow-outline bg-white"
              id="model"
              type="text"
              list="model-options"
              placeholder={availableModels.length > 0 ? "Type or click to select a model" : "Enter your API key and click 'Check Key' first"}
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
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              ⚠️ No models loaded. Click "Check Key" to load available models.
            </p>
          )}
          {availableModels.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              💡 Tip: Start typing to filter or click the dropdown arrow to see all models.
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
          {message && !message.includes('Allergen') && <span className="text-green-600 dark:text-green-400 text-sm font-bold">{message}</span>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-md rounded px-8 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-50">Allergens</h2>

        {message && message.includes('Allergen') && (
          <div className={`mb-4 px-3 py-2 rounded text-sm font-semibold ${message.includes('Failed') || message.includes('exists') || message.includes('error') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
            {message}
          </div>
        )}

        <div className="flex mb-4">
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-slate-700 dark:text-slate-900 leading-tight focus:outline-none focus:shadow-outline mr-2 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            type="text"
            placeholder="Add new allergen (e.g., Milk)"
            value={newAllergen}
            onChange={(e) => setNewAllergen(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isAddingAllergen && handleAddAllergen()}
            disabled={isAddingAllergen}
          />
          <button
            className={`font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors flex items-center justify-center min-w-[80px] ${isAddingAllergen ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            type="button"
            onClick={handleAddAllergen}
            disabled={isAddingAllergen}
          >
            {isAddingAllergen ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Add'}
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
