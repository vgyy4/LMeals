import { useState } from 'react';
import { X } from 'lucide-react';
import { scrapeRecipe, scrapeWithAi } from '../lib/api';
import { ScrapeResponse, GroqSettings } from '../lib/types';

interface AddRecipeModalProps {
  onClose: () => void;
  onRecipeAdded: () => void;
}

const AddRecipeModal = ({ onClose, onRecipeAdded }: AddRecipeModalProps) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResponse | null>(null);

  // For now, we'll get settings from local storage or prompt the user.
  // A better solution would be to use a global state management library.
  const getGroqSettings = (): GroqSettings | null => {
      const apiKey = localStorage.getItem('groq_api_key');
      const model = localStorage.getItem('groq_model') || 'llama3-70b';
      if (apiKey) {
          return { api_key: apiKey, model };
      }
      return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await scrapeRecipe(url);
      setScrapeResult(result);
      if (result.status === 'success' || result.status === 'exists') {
        onRecipeAdded();
        onClose();
      }
    } catch (err) {
      setError('Failed to scrape the recipe. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAiSubmit = async () => {
    const settings = getGroqSettings();
    if (!settings) {
        setError("Groq API key not found. Please set it in the settings page.");
        return;
    }

    setLoading(true);
    setError(null);
    try {
        const result = await scrapeWithAi(url, settings);
        if (result.status === 'success') {
            onRecipeAdded();
            onClose();
        } else {
            setError(result.message || "AI scraping failed.");
        }
    } catch (err: any) {
        setError(err.response?.data?.detail || "An unexpected error occurred during AI scraping.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Add a New Recipe</h2>
          <button onClick={onClose}><X /></button>
        </div>
        
        {!scrapeResult || scrapeResult.status === 'failed' ? (
          <form onSubmit={handleSubmit}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter recipe URL"
              className="w-full p-2 border rounded-md"
              required
            />
            <button type="submit" disabled={loading} className="w-full mt-4 bg-soft-rose p-2 rounded-md">
              {loading ? 'Scraping...' : 'Scrape Recipe'}
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </form>
        ) : (
          <div>
            <p className="mb-4">{scrapeResult.message}</p>
            <button onClick={handleAiSubmit} disabled={loading} className="w-full mt-4 bg-periwinkle-blue text-white p-2 rounded-md">
              {loading ? 'Processing with AI...' : 'Try with Advanced AI Import'}
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddRecipeModal;
