import { useState, useRef } from 'react';
import { scrapeRecipe, scrapeWithAi, uploadTempImage, finalizeScrape, finalizeMultiScrape, cleanupImages } from '../lib/api';
import { X, Youtube, Music, Facebook, Instagram, ImagePlus, Check, ArrowRight, Upload } from 'lucide-react';
import GeometricLoader from './GeometricLoader';
import { Recipe } from '../lib/types';

interface AddRecipeModalProps {
  onClose: () => void;
  onRecipeAdded: () => void;
}

const AddRecipeModal = ({ onClose, onRecipeAdded }: AddRecipeModalProps) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customUploadRef = useRef<HTMLInputElement>(null);

  // Single recipe image selection state
  const [imageCandidates, setImageCandidates] = useState<string[]>([]);
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);

  // Multi-recipe state
  const [multiRecipeMode, setMultiRecipeMode] = useState(false);
  const [detectedRecipes, setDetectedRecipes] = useState<any[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<number>>(new Set());
  const [currentScreen, setCurrentScreen] = useState<'recipe_selection' | 'image_mode' | 'image_assignment'>('recipe_selection');
  const [imageMode, setImageMode] = useState<'shared' | 'individual'>('shared');
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [imageAssignments, setImageAssignments] = useState<Record<number, number>>({});

  const handleInitialScrape = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await scrapeRecipe(url);
      if (response.status === 'success' || response.status === 'exists') {
        onRecipeAdded();
        onClose();
      } else if (response.status === 'ai_required') {
        // Automatically trigger AI scrape instead of asking
        await handleAiScrape();
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

      // Check for multi-recipe response
      if (response.status === 'multi_recipe' && 'recipes' in response) {
        setMultiRecipeMode(true);
        setDetectedRecipes(response.recipes);
        setImageCandidates(response.image_candidates || []);
        // Select all recipes by default
        setSelectedRecipes(new Set(response.recipes.map((_, idx) => idx)));
        setCurrentScreen('recipe_selection');
        setIsLoading(false);
        return; // Stay on modal, show recipe selection
      }

      // Single recipe path
      if (response.status === 'success' && response.recipe) {
        // If we have multiple image candidates, show selection screen
        if (response.image_candidates && response.image_candidates.length > 0) {
          setImageCandidates(response.image_candidates);
          setPendingRecipe(response.recipe);
          return; // Stop here, don't close modal yet
        }

        // Otherwise proceed as normal
        if (customImageUrl) {
          await finalizeScrape(response.recipe, customImageUrl, []);
        }
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
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSelectionFlow = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await uploadTempImage(file);
      if (response.status === 'success') {
        if (isSelectionFlow) {
          // In selection flow, we set this new image as the specific selection
          // We can add it to the candidates list to show it selected
          setImageCandidates(prev => [...prev, response.url]);
          setSelectedCandidateIndex(imageCandidates.length); // It will be the new last item
        } else {
          setCustomImageUrl(response.url);
        }
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

  const handleFinalSelection = async () => {
    if (!pendingRecipe) return;

    setIsLoading(true);
    try {
      const selectedImage = imageCandidates[selectedCandidateIndex];

      // Update the recipe with the selected image if it's different
      await finalizeScrape(pendingRecipe, selectedImage, []);

      // Cleanup: Delete all OTHER candidates that are NOT the selected one
      // We pass the full list of candidates (which are the files created)
      // and tell backend to keep the 'selectedImage'
      cleanupImages(imageCandidates, selectedImage);

      onRecipeAdded();
      onClose();
    } catch (err) {
      console.error("Error finalizing selection:", err);
      setError("Failed to save selection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Multi-recipe handlers
  const toggleRecipeSelection = (index: number) => {
    setSelectedRecipes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) { newSet.delete(index); } else { newSet.add(index); }
      return newSet;
    });
  };

  const handleProceedToImageMode = () => {
    if (selectedRecipes.size === 0) return;
    setCurrentScreen('image_mode');
  };

  const handleImageModeSelection = (mode: 'shared' | 'individual') => {
    setImageMode(mode);
    setCurrentScreen('image_assignment');
    const firstSelected = Array.from(selectedRecipes).sort((a, b) => a - b)[0];
    setCurrentRecipeIndex(firstSelected);
    setSelectedCandidateIndex(0);
  };

  const handleNextRecipe = () => {
    const selectedArray = Array.from(selectedRecipes).sort((a, b) => a - b);
    const currentIdx = selectedArray.indexOf(currentRecipeIndex);
    if (currentIdx < selectedArray.length - 1) {
      setImageAssignments(prev => ({ ...prev, [currentRecipeIndex]: selectedCandidateIndex }));
      setCurrentRecipeIndex(selectedArray[currentIdx + 1]);
      setSelectedCandidateIndex(imageAssignments[selectedArray[currentIdx + 1]] || 0);
    }
  };

  const handleFinishMultiRecipe = async () => {
    setIsLoading(true);
    try {
      const finalAssignments = { ...imageAssignments, [currentRecipeIndex]: selectedCandidateIndex };
      const imageMap: Record<number, string | null> = {};
      if (imageMode === 'shared') {
        const sharedImage = imageCandidates[selectedCandidateIndex] || null;
        selectedRecipes.forEach(idx => { imageMap[idx] = sharedImage; });
      } else {
        selectedRecipes.forEach(idx => {
          const candidateIdx = finalAssignments[idx] ?? 0;
          imageMap[idx] = imageCandidates[candidateIdx] || null;
        });
      }
      const recipesToImport = detectedRecipes.filter((_, idx) => selectedRecipes.has(idx));
      await finalizeMultiScrape(recipesToImport, imageMap);
      onRecipeAdded(); onClose();
    } catch (err) {
      setError('Failed to import recipes.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const isLastRecipe = () => {
    const selectedArray = Array.from(selectedRecipes).sort((a, b) => a - b);
    return currentRecipeIndex === selectedArray[selectedArray.length - 1];
  };

  // ---------------------------------------------------------------------------
  // RENDER: Multi-Recipe Screens
  // ---------------------------------------------------------------------------
  if (multiRecipeMode && currentScreen === 'recipe_selection') {
    const allSelected = selectedRecipes.size === detectedRecipes.length;
    const noneSelected = selectedRecipes.size === 0;

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] flex flex-col relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10">
            <X size={24} />
          </button>

          <h2 className="text-2xl font-bold text-slate-800 mb-2 pr-8">Found {detectedRecipes.length} Recipes</h2>
          <p className="text-slate-500 mb-6">Select which recipes to import</p>

          <div className="flex-1 overflow-y-auto mb-6">
            <div className="space-y-3">
              {detectedRecipes.map((recipe, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleRecipeSelection(idx)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRecipes.has(idx)
                    ? 'border-p-mint bg-p-mint/5'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${selectedRecipes.has(idx) ? 'bg-p-mint border-p-mint' : 'border-slate-300'
                      }`}>
                      {selectedRecipes.has(idx) && <Check size={16} className="text-white" />}
                    </div>
                    <span className="font-medium text-slate-800">{recipe.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleProceedToImageMode}
            disabled={noneSelected}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${noneSelected
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-p-mint text-p-mint-dark hover:bg-p-mint-dark hover:text-white'
              }`}
          >
            {allSelected ? 'Import All' : `Import Selected (${selectedRecipes.size})`}
          </button>
        </div>
      </div>
    );
  }

  if (multiRecipeMode && currentScreen === 'image_mode') {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Choose Images</h2>
          <p className="text-slate-500 mb-8">Do you want to choose an image for each recipe or for all at once?</p>

          <div className="space-y-4">
            <button
              onClick={() => handleImageModeSelection('shared')}
              className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-p-mint hover:bg-p-mint/5 transition-all text-left"
            >
              <div className="font-semibold text-slate-800">For All at Once</div>
              <div className="text-sm text-slate-500">Use the same image for all {selectedRecipes.size} recipes</div>
            </button>

            <button
              onClick={() => handleImageModeSelection('individual')}
              className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-p-mint hover:bg-p-mint/5 transition-all text-left"
            >
              <div className="font-semibold text-slate-800">For Each Recipe</div>
              <div className="text-sm text-slate-500">Choose a different image for each recipe</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (multiRecipeMode && currentScreen === 'image_assignment') {
    const selectedArray = Array.from(selectedRecipes).sort((a, b) => a - b);
    const currentPos = selectedArray.indexOf(currentRecipeIndex) + 1;
    const currentRecipe = detectedRecipes[currentRecipeIndex];
    const isLast = isLastRecipe();

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl w-full flex flex-col max-h-[90vh]">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-800">
              {imageMode === 'individual'
                ? `Choose image for: ${currentRecipe.title}`
                : `Choose image for all ${selectedRecipes.size} recipes`}
            </h2>
            {imageMode === 'individual' && (
              <p className="text-slate-500">Recipe {currentPos} of {selectedRecipes.size}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 mb-6">
            {imageCandidates.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageCandidates.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedCandidateIndex(idx)}
                    className={`relative group cursor-pointer rounded-2xl overflow-hidden aspect-video border-4 transition-all ${selectedCandidateIndex === idx
                      ? 'border-p-mint ring-4 ring-p-mint/20'
                      : 'border-transparent hover:border-slate-200'
                      }`}
                  >
                    <img src={`api/static/${img}`} className="w-full h-full object-cover" loading="lazy" />
                    {selectedCandidateIndex === idx && (
                      <div className="absolute top-2 right-2 bg-p-mint rounded-full p-1">
                        <Check size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-4">No images found</p>
              </div>
            )}

            <div className="mt-4 flex justify-center border-t border-slate-100 pt-4">
              <label className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-p-mint hover:bg-p-mint/5 rounded-lg transition-colors cursor-pointer font-medium">
                <Upload size={18} />
                <span>Upload Custom Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, true)}
                  className="hidden"
                />
              </label>
            </div>

          </div>

          <div className="flex gap-3">
            {imageMode === 'individual' && !isLast && (
              <button
                onClick={handleNextRecipe}
                className="flex-1 py-3 bg-p-mint text-emerald-900 rounded-xl font-bold hover:bg-p-mint-dark hover:text-white transition-all shadow-sm"
              >
                Next
              </button>
            )}
            {(imageMode === 'shared' || isLast) && (
              <button
                onClick={handleFinishMultiRecipe}
                disabled={isLoading}
                className="flex-1 py-3 bg-p-mint text-emerald-900 rounded-xl font-bold hover:bg-p-mint-dark hover:text-white transition-all disabled:opacity-50 shadow-sm"
              >
                {isLoading ? 'Importing...' : `Finish`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Image Selection Step
  // ---------------------------------------------------------------------------
  if (pendingRecipe && imageCandidates.length > 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 animate-in fade-in zoom-in duration-300">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl w-full border border-p-sky/10 flex flex-col max-h-[90vh]">

          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-800">Select Cover Image</h2>
            <p className="text-slate-500">Choose the best frame for your recipe</p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 mb-6 p-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {imageCandidates.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedCandidateIndex(idx)}
                  className={`relative group cursor-pointer rounded-2xl overflow-hidden aspect-video border-4 transition-all ${selectedCandidateIndex === idx ? 'border-p-mint ring-4 ring-p-mint/20 scale-[1.02]' : 'border-transparent hover:border-slate-200'
                    }`}
                >
                  <img
                    src={`api/static/${img}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {selectedCandidateIndex === idx && (
                    <div className="absolute top-2 right-2 bg-p-mint text-white p-1 rounded-full shadow-lg">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium"> Option {idx + 1}</span>
                  </div>
                </div>
              ))}

              {/* Upload Custom Option */}
              <div
                onClick={() => customUploadRef.current?.click()}
                className="relative cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-p-sky/50 transition-all flex flex-col items-center justify-center aspect-video group"
              >
                <div className="bg-white p-3 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                  <Upload size={24} className="text-p-sky" />
                </div>
                <span className="text-sm font-bold text-slate-600">Upload Custom</span>
                <span className="text-xs text-slate-400 mt-1">From your device</span>
                <input
                  type="file"
                  ref={customUploadRef}
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, true)}
                  accept="image/*"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleFinalSelection}
              className="px-8 py-3 bg-p-mint text-emerald-900 font-bold rounded-xl hover:bg-emerald-100 transition-all shadow-lg shadow-p-mint/20 active:scale-95 flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? <GeometricLoader size={20} className="text-emerald-900" /> : <>Confirm Selection <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Initial Input Step
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-p-sky/10 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Add a New Recipe</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {error && <div className="bg-p-rose/30 border-l-4 border-p-coral text-red-800 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}



        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 min-h-[300px] animate-in fade-in zoom-in duration-300">
            <GeometricLoader size={120} className="text-p-coral" />
            <p className="mt-8 text-slate-400 font-medium animate-pulse">Analyzing Recipe...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
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

            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Custom Cover Photo (Optional)</p>
              <div
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`relative h-24 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${customImageUrl ? 'border-p-mint bg-p-mint/5' : 'border-slate-200 bg-slate-50 hover:border-p-sky/50'
                  }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => handleImageUpload(e)}
                  accept="image/*"
                />
                {customImageUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={`api/static/${customImageUrl}`}
                      className="h-16 w-16 object-cover rounded-xl"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-emerald-900">Image Uploaded</span>
                      <span className="text-xs text-slate-400">Click to change</span>
                    </div>
                    <div className="bg-p-mint text-white rounded-full p-1 ml-2">
                      <Check size={16} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <ImagePlus size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Drag or click to upload screenshot</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleInitialScrape}
              className="w-full mt-6 bg-p-mint text-emerald-900 font-bold py-3 rounded-2xl hover:bg-emerald-100 transition-all shadow-sm active:scale-95 border border-p-mint/50"
            >
              Import Recipe
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddRecipeModal;
