import React, { useState, useEffect } from 'react';
import { getAllergens, createAllergen, deleteAllergen as apiDeleteAllergen, getSettings, saveSetting, verifyGroqKey, getGroqModels } from '../lib/api';
import {
  Settings as SettingsIcon,
  Cpu,
  ShieldAlert,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Key,
  ChevronDown,
  Search,
  Palette
} from 'lucide-react';
import GeometricLoader from '../components/GeometricLoader';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('lmeals-theme') || 'pastel');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = document.getElementById('model-dropdown-container');
      if (container && !container.contains(event.target as Node)) {
        setShowModelDropdown(false);
        setSearchTerm('');
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

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('lmeals-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <GeometricLoader size={64} className="text-p-coral" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:px-12 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-p-rose/40 rounded-2xl text-p-coral">
          <SettingsIcon size={32} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Configure your AI engine and dietary preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Groq Configuration Card */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-p-sky/10 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="text-p-coral" size={24} />
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tighter">AI Engine</h2>
          </div>

          <form autoComplete="off" onSubmit={(e) => e.preventDefault()} data-form-type="other">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1" htmlFor="apiKey">
                  Groq API Key
                </label>
                <div className="relative group">
                  <input
                    className="w-full bg-p-surface border-0 ring-1 ring-p-sky/20 focus:ring-2 focus:ring-p-coral rounded-2xl py-3 px-11 text-slate-800 transition-all duration-300 outline-none"
                    id="apiKey"
                    name="api-key-field"
                    type="password"
                    placeholder="Paste your key here..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                  <Key className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-p-coral transition-colors" size={18} />
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                  <button
                    onClick={handleVerifyKey}
                    disabled={!apiKey}
                    type="button"
                    className="text-xs font-bold text-p-coral hover:text-red-600 uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Verify Key
                  </button>
                  {keyStatus && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${keyStatus.status === 'success' ? 'text-emerald-600' : 'text-p-coral'}`}>
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
                    className={`w-full bg-p-surface border-0 ring-1 ring-p-sky/20 focus-within:ring-2 focus-within:ring-p-coral rounded-2xl py-3 px-11 text-slate-800 transition-all duration-300 outline-none cursor-pointer flex items-center justify-between ${showModelDropdown ? 'ring-2 ring-p-coral' : ''}`}
                    onClick={() => availableModels.length > 0 && setShowModelDropdown(!showModelDropdown)}
                  >
                    <span className={model ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                      {model || (availableModels.length > 0 ? "Choose a model..." : "No models loaded")}
                    </span>
                    <div className={`transition-transform duration-300 ${showModelDropdown ? 'rotate-180' : ''}`}>
                      <ChevronDown className="text-slate-400" size={16} />
                    </div>
                  </div>
                  <Cpu className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-p-coral transition-colors pointer-events-none" size={18} />

                  {/* Custom Glassmorphic Dropdown */}
                  {showModelDropdown && availableModels.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                      <div className="p-2 border-b border-white/10">
                        <div className="relative">
                          <input
                            type="text"
                            className="w-full bg-slate-100/50 dark:bg-slate-800/50 border-0 ring-1 ring-slate-200/50 dark:ring-slate-700/50 focus:ring-2 focus:ring-rose-500/50 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
                            placeholder="Search models..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            autoFocus
                            autoComplete="off"
                          />
                          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                        {availableModels.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-xs text-slate-400 italic">No models match your search</p>
                          </div>
                        ) : (
                          availableModels
                            .filter(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((m) => (
                              <div
                                key={m}
                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between group/item ${model === m ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                onClick={() => {
                                  setModel(m);
                                  setShowModelDropdown(false);
                                  setSearchTerm('');
                                }}
                              >
                                <span className="font-medium truncate">{m}</span>
                                {model === m && <CheckCircle2 size={14} className="text-rose-500" />}
                              </div>
                            ))
                        )}
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
              className="w-full bg-p-coral hover:bg-red-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-p-coral/20 active:scale-95 transition-all text-sm uppercase tracking-widest mt-4"
              type="button"
              onClick={handleSaveSettings}
            >
              Apply Changes
            </button>
          </form>

          {message && !message.includes('Allergen') && (
            <div className="text-center pt-2">
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> {message}
              </span>
            </div>
          )}
        </section>

        {/* Allergens Configuration Card */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-p-sky/10 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="text-p-coral" size={24} />
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tighter">Dietary Safety</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1">
                Add New Allergen
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-p-surface border-0 ring-1 ring-p-sky/20 focus:ring-2 focus:ring-p-coral rounded-2xl py-3 px-4 text-slate-800 transition-all outline-none disabled:opacity-50"
                  type="text"
                  placeholder="e.g. Peanuts, Milk..."
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isAddingAllergen && handleAddAllergen()}
                  disabled={isAddingAllergen}
                />
                <button
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isAddingAllergen ? 'bg-p-surface' : 'bg-p-coral hover:bg-red-500 text-white shadow-lg shadow-p-coral/20 active:scale-90'}`}
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
                      className="group flex items-center gap-2 bg-p-surface hover:bg-p-rose/40 px-4 py-2 rounded-full border border-p-sky/20 transition-all duration-300"
                    >
                      <span className="text-sm font-medium text-slate-700 group-hover:text-red-700">
                        {allergen.name}
                      </span>
                      <button
                        onClick={() => handleDeleteAllergen(allergen.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-p-coral transition-all p-0.5 rounded-full"
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
            <div className={`px-4 py-2.5 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 ${message.includes('Failed') || message.includes('exists') || message.includes('error') ? 'bg-p-rose/30 text-red-700' : 'bg-p-mint/40 text-emerald-800'}`}>
              {message.includes('Failed') ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
              {message}
            </div>
          )}
        </section>
        {/* Appearance Configuration Card */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-p-sky/10 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Palette className="text-p-coral" size={24} />
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tighter">Appearance</h2>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5 ml-1">
              Color Palette
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleThemeChange('pastel')}
                className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${theme === 'pastel' ? 'border-p-coral bg-p-surface shadow-sm' : 'border-slate-100 hover:border-p-sky/30'}`}
              >
                <span className={`font-bold ${theme === 'pastel' ? 'text-p-coral' : 'text-slate-700'}`}>Soft Pastel</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#E3F9E5]" />
                  <div className="w-3 h-3 rounded-full bg-[#FF746C]" />
                  <div className="w-3 h-3 rounded-full bg-[#E0F2FE]" />
                </div>
              </button>
              <button
                onClick={() => handleThemeChange('vibrant')}
                className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${theme === 'vibrant' ? 'border-p-coral bg-p-surface shadow-sm' : 'border-slate-100 hover:border-p-sky/30'}`}
              >
                <span className={`font-bold ${theme === 'vibrant' ? 'text-p-coral' : 'text-slate-700'}`}>Bold Vibrant</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                  <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                </div>
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="p-6 bg-p-peach/30 rounded-3xl border border-p-peach/50">
        <div className="flex gap-4">
          <AlertCircle className="text-orange-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-orange-900">Safety Disclaimer</h3>
            <p className="text-sm text-orange-800/80 leading-relaxed mt-1">
              Allergen detection is AI-enhanced but not infallible. Always verify ingredients on physical packaging. LMeals uses the Groq engine to understand complex ingredient lists, but system errors or missing information in recipes can occur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
