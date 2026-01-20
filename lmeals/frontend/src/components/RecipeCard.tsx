import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Heart } from 'lucide-react';
import { setFavoriteStatus } from '../lib/api';
import { useState } from 'react';

interface RecipeCardProps {
  id: number;
  title: string;
  imageUrl?: string;
  hasAllergens: boolean;
  cookTime?: string;
  prepTime?: string;
  isFavorite: boolean;
  onFavoriteChange?: (id: number, isFavorite: boolean) => void;
}

const RecipeCard = ({ id, title, imageUrl, hasAllergens, cookTime, prepTime, isFavorite, onFavoriteChange }: RecipeCardProps) => {
  const totalTime = (parseInt(prepTime || '0') || 0) + (parseInt(cookTime || '0') || 0);
  const [isFav, setIsFav] = useState(isFavorite);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavStatus = !isFav;
    setIsFav(newFavStatus);

    // Call the API
    await setFavoriteStatus(id, newFavStatus);

    // Notify parent component if callback provided
    if (onFavoriteChange) {
      onFavoriteChange(id, newFavStatus);
    }
  };

  return (
    <Link to={`/recipe/${id}`} className="group block rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 border border-p-sky/10">
      <div className="relative overflow-hidden">
        <img
          src={imageUrl || 'https://placehold.co/600x400/F8E8EE/C9A9A6?text=LMeals'}
          alt={title}
          className="w-full h-40 object-cover rounded-t-2xl block"
        />
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 left-3 bg-white/90 p-2 rounded-full hover:bg-white transition-all z-10 shadow-sm border border-slate-100"
        >
          <Heart size={18} className={`${isFav ? 'text-p-coral fill-current' : 'text-slate-400'}`} />
        </button>
        {hasAllergens && (
          <div className="absolute top-3 right-3 bg-p-coral/90 text-white p-2 rounded-full shadow-lg backdrop-blur-sm z-10">
            <AlertTriangle size={18} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-slate-800 truncate group-hover:text-p-coral transition-colors">{title}</h3>
        {totalTime > 0 && (
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
            <Clock size={16} />
            <span>{totalTime} min</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default RecipeCard;
