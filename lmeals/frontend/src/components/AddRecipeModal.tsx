import { useState } from 'react';
import { scrapeRecipe, scrapeWithAi } from '../lib/api';
import { X } from 'lucide-react';

interface AddRecipeModalProps {
  onClose: () => void;
  onRecipeAdded: () => void;
}

const AddRecipeModal = ({ onClose, onRecipeAdded }: AddRecipeModalProps) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAiConfirmation, setNeedsAiConfirmation] = useState(false);

  const handleInitialScrape = async () => {
    setIsLoading(true);
    setError(null);
    setNeedsAiConfirmation(false);
    try {
      const response = await scrapeRecipe(url);
      if (response.status === 'success' || response.status === 'exists') {
        onRecipeAdded();
        onClose();
      } else if (response.status === 'ai_required') {
        setNeedsAiConfirmation(true);
      } else {
        setError(response.message || 'An unknown error occurred.');
      }
    } catch (err) {
      setError('Failed to scrape the URL. Please check the console for details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiScrape = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await scrapeWithAi(url);
      if (response.status === 'success') {
        onRecipeAdded();
        onClose();
      } else {
        setError(response.message || 'The AI scraper failed to import the recipe.');
      }
    } catch (err) {
      setError('An error occurred with the AI scraper. Your API key may be invalid or you may have hit a rate limit.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setNeedsAiConfirmation(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Add a New Recipe</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

        {!needsAiConfirmation ? (
          <div>
            <p className="mb-4 text-slate-600 dark:text-slate-300">Enter the URL of the recipe you want to import.</p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="https://example.com/recipe"
              disabled={isLoading}
            />
            <button
              onClick={handleInitialScrape}
              className="w-full mt-4 bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Importing...' : 'Import Recipe'}
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-slate-600 dark:text-slate-300">
              The standard import failed for this URL. Would you like to try our advanced AI importer?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setNeedsAiConfirmation(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAiScrape}
                className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Use AI Importer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddRecipeModal;
