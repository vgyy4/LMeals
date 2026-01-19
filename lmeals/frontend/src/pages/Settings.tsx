import React, { useState, useEffect } from 'react';
import { getAllergens, createAllergen, deleteAllergen as apiDeleteAllergen, getSettings, saveSetting, verifyGroqKey, getGroqModels } from '../lib/api';
import {
  Settings as SettingsIcon,
  Cpu,
  ShieldAlert,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Key,
  ChevronDown
} from 'lucide-react';

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
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = document.getElementById('model-dropdown-container');
      if (container && !container.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const response = await getGroqModels(apiKey);
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
      if (model) {
        await saveSetting('GROQ_MODEL', model);
      }
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage(`Failed to save settings: ${error.message || 'Unknown error'} `);
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <RefreshCcw className="animate-spin text-rose-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:px-12 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400">
          <SettingsIcon size={32} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Configure your AI engine and dietary preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Groq Configuration Card */}
        <section className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/20 dark:border-white/5 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="text-rose-500" size={24} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter">AI Engine</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1" htmlFor="apiKey">
                Groq API Key
              </label>
              <div className="relative group">
                <input
                  className="w-full bg-slate-50 dark:bg-slate-900 border-0 ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-rose-500 rounded-2xl py-3 px-11 text-slate-900 dark:text-slate-100 transition-all duration-300 outline-none"
                  id="apiKey"
                  type="password"
                  placeholder="Paste your key here..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Key className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={18} />
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <button
                  onClick={handleVerifyKey}
                  disabled={!apiKey}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Verify Key
                </button>
                {keyStatus && (
                  <div className={`flex items - center gap - 1.5 text - xs font - medium ${keyStatus.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} `}>
                    {keyStatus.status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {keyStatus.message}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1" htmlFor="model">
                AI Model
              </label>
              <div className="relative group" id="model-dropdown-container">
                <div
                  className={`w - full bg - slate - 50 dark: bg - slate - 900 border - 0 ring - 1 ring - slate - 200 dark: ring - slate - 700 focus - within: ring - 2 focus - within: ring - rose - 500 rounded - 2xl py - 3 px - 11 text - slate - 900 dark: text - slate - 100 transition - all duration - 300 outline - none cursor - pointer flex items - center justify - between ${showModelDropdown ? 'ring-2 ring-rose-500' : ''} `}
                  onClick={() => availableModels.length > 0 && setShowModelDropdown(!showModelDropdown)}
                >
                  <span className={model ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                    {model || (availableModels.length > 0 ? "Choose a model..." : "No models loaded")}
                  </span>
                  <div className={`transition - transform duration - 300 ${showModelDropdown ? 'rotate-180' : ''} `}>
                    <Plus className="text-slate-400" size={16} />
                  </div>
                </div>
                <Cpu className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-rose-500 transition-colors pointer-events-none" size={18} />

                {/* Custom Glassmorphic Dropdown */}
                {showModelDropdown && availableModels.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div className="max-h-60 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                      {availableModels.map((m) => (
                        <div
                          key={m}
                          className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between group/item ${model === m ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          onClick={() => {
                            setModel(m);
                            setShowModelDropdown(false);
                          }}
                        >
                          <span className="font-medium truncate">{m}</span>
                          {model === m && <CheckCircle2 size={14} className="text-rose-500" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {availableModels.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1.5 ml-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {availableModels.length} text-refined models found
                </p>
              )}
            </div>
          </div>

          <button
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-rose-200 dark:shadow-rose-900/20 active:scale-95 transition-all text-sm uppercase tracking-widest mt-4"
            type="button"
            onClick={handleSaveSettings}
          >
            Apply Changes
          </button>

          {message && !message.includes('Allergen') && (
            <div className="text-center pt-2">
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> {message}
              </span>
            </div>
          )}
        </section>

        {/* Allergens Configuration Card */}
        <section className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/20 dark:border-white/5 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="text-rose-500" size={24} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Dietary Safety</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1">
                Add New Allergen
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border-0 ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-rose-500 rounded-2xl py-3 px-4 text-slate-900 dark:text-slate-100 transition-all outline-none disabled:opacity-50"
                  type="text"
                  placeholder="e.g. Peanuts, Milk..."
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isAddingAllergen && handleAddAllergen()}
                  disabled={isAddingAllergen}
                />
                <button
                  className={`w - 12 h - 12 rounded - 2xl flex items - center justify - center transition - all ${isAddingAllergen ? 'bg-slate-200 dark:bg-slate-700' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/20 active:scale-90'} `}
                  type="button"
                  onClick={handleAddAllergen}
                  disabled={isAddingAllergen}
                >
                  {isAddingAllergen ? <RefreshCcw size={20} className="animate-spin text-slate-400" /> : <Plus size={20} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
                Monitored Allergens
              </label>
              <div className="flex flex-wrap gap-2">
                {allergens.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-4">No allergens added yet.</p>
                ) : (
                  allergens.map((allergen) => (
                    <div
                      key={allergen.id}
                      className="group flex items-center gap-2 bg-slate-100/50 dark:bg-slate-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-4 py-2 rounded-full border border-slate-200/50 dark:border-slate-700 transition-all duration-300"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                        {allergen.name}
                      </span>
                      <button
                        onClick={() => handleDeleteAllergen(allergen.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all p-0.5 rounded-full"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {message && message.includes('Allergen') && (
            <div className={`px - 4 py - 2.5 rounded - 2xl text - xs font - bold text - center flex items - center justify - center gap - 2 ${message.includes('Failed') || message.includes('exists') || message.includes('error') ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'} `}>
              {message.includes('Failed') ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
              {message}
            </div>
          )}
        </section>
      </div>

      <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-200/50 dark:border-amber-900/20">
        <div className="flex gap-4">
          <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-amber-800 dark:text-amber-400">Safety Disclaimer</h3>
            <p className="text-sm text-amber-700 dark:text-amber-500/80 leading-relaxed mt-1">
              Allergen detection is AI-enhanced but not infallible. Always verify ingredients on physical packaging. LMeals uses the Groq engine to understand complex ingredient lists, but system errors or missing information in recipes can occur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
