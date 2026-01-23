import { useState } from 'react';
import { scrapeRecipe, scrapeWithAi, finalizeScrape, uploadTempImage } from '../lib/api';
import { X, Youtube, Music, Facebook, Instagram } from 'lucide-react';

interface AddRecipeModalProps {
  onClose: () => void;
  onRecipeAdded: () => void;
}

const AddRecipeModal = ({ onClose, onRecipeAdded }: AddRecipeModalProps) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAiConfirmation, setNeedsAiConfirmation] = useState(false);
  const [needsImageSelection, setNeedsImageSelection] = useState(false);
  const [candidateImages, setCandidateImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pendingRecipeData, setPendingRecipeData] = useState<any>(null);

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
      } else if (response.status === 'needs_image_selection') {
        setPendingRecipeData(response.recipe);
        setCandidateImages(response.candidate_images || []);
        setSelectedImage(response.candidate_images?.[0] || null);
        setNeedsImageSelection(true);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await uploadTempImage(file);
      if (response.status === 'success') {
        const newUrl = response.url;
        setCandidateImages(prev => [...prev, newUrl]);
        setSelectedImage(newUrl);
      } else {
        setError('Failed to upload image.');
      }
    } catch (err) {
      setError('An error occurred during image upload.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeScrape = async () => {
    if (!selectedImage || !pendingRecipeData) return;
    setIsLoading(true);
    setError(null);
    try {
      const cleanupList = candidateImages.filter(img => img !== selectedImage);
      const response = await finalizeScrape(pendingRecipeData, selectedImage, cleanupList);
      if (response.status === 'success') {
        onRecipeAdded();
        onClose();
      } else {
        setError(response.message || 'Failed to save the recipe.');
      }
    } catch (err) {
      setError('Failed to finalize the recipe import.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-p-sky/10 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {needsImageSelection ? 'Choose Cover Photo' : 'Add a New Recipe'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {error && <div className="bg-p-rose/30 border-l-4 border-p-coral text-red-800 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

        {needsImageSelection ? (
          <div className="flex flex-col h-full">
            <p className="mb-4 text-sm text-slate-500">
              Pick the best picture for your gallery or upload your own screenshot.
            </p>
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {candidateImages.map((src, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(src)}
                  className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-4 transition-all ${selectedImage === src ? 'border-p-mint scale-95' : 'border-transparent hover:border-p-sky/30'
                    }`}
                >
                  <img
                    src={src.startsWith('http') ? src : `/api/static/${src}`}
                    alt={`Candidate ${idx}`}
                    className="w-full h-full object-cover"
                  />
                  {selectedImage === src && (
                    <div className="absolute inset-0 bg-p-mint/20 flex items-center justify-center">
                      <div className="bg-p-mint text-white rounded-full p-1 shadow-lg">
                        <X size={16} className="rotate-45" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Upload Button */}
              <label className="relative aspect-video rounded-xl overflow-hidden cursor-pointer border-4 border-dashed border-p-sky/30 hover:border-p-mint flex flex-col items-center justify-center bg-p-surface transition-all">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isLoading}
                />
                <div className="text-p-sky flex flex-col items-center gap-1">
                  <div className="p-2 bg-p-sky/10 rounded-full">
                    <Music size={20} className="text-p-sky" /> {/* Using Music as a placeholder icon for "add" or change to something else if needed */}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Upload Custom</span>
                </div>
              </label>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setNeedsImageSelection(false)}
                className="flex-1 py-3 bg-p-surface text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all border border-p-sky/10"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handleFinalizeScrape}
                className="flex-[2] bg-p-mint text-emerald-900 font-bold py-3 rounded-2xl hover:bg-emerald-100 transition-all shadow-lg active:scale-95 border border-p-mint/50 flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-900/30 border-t-emerald-900 rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Recipe</span>
                )}
              </button>
            </div>
          </div>
        ) : !needsAiConfirmation ? (
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
