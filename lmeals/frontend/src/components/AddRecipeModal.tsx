import { useState } from 'react';
import { scrapeRecipe, scrapeWithAi } from '../lib/api';
import { X, Youtube, Music, Facebook, Instagram, Video, Mic } from 'lucide-react';

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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-p-sky/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Add a New Recipe</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {error && <div className="bg-p-rose/30 border-l-4 border-p-coral text-red-800 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

        {!needsAiConfirmation ? (
          <div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-p-sky/30 rounded-2xl border border-p-sky/20">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center border-2 border-white">
                  <Youtube size={16} className="text-red-600" />
                </div>
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center border-2 border-white">
                  <Music size={16} className="text-green-600" />
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white">
                  <Facebook size={16} className="text-blue-600" />
                </div>
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center border-2 border-white">
                  <Instagram size={16} className="text-pink-600" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Supports Video, Audio & AI Extraction
              </p>
            </div>
            <p className="mb-4 text-slate-500">Paste a link to a website, YouTube video, or audio file.</p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-3 border-0 ring-1 ring-p-sky/20 rounded-2xl bg-p-surface text-slate-800 focus:outline-none focus:ring-2 focus:ring-p-mint transition-all"
              placeholder="https://example.com/recipe"
              disabled={isLoading}
            />
            <button
              onClick={handleInitialScrape}
              className="w-full mt-6 bg-p-mint text-emerald-900 font-bold py-3 rounded-2xl hover:bg-emerald-100 transition-all shadow-sm active:scale-95 border border-p-mint/50"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-900/30 border-t-emerald-900 rounded-full animate-spin" />
                  <span>{url.includes('youtube') || url.includes('youtu.be') ? 'Transcribing Video...' : 'Importing...'}</span>
                </div>
              ) : 'Import Recipe'}
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-6 text-slate-500 leading-relaxed">
              The standard import failed for this URL. Would you like to try our advanced AI importer?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setNeedsAiConfirmation(false)}
                className="px-6 py-2.5 bg-p-surface text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors border border-p-sky/10"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAiScrape}
                className="px-6 py-2.5 bg-p-coral text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-p-coral/20 active:scale-95"
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
