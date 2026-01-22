import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Heart, Users } from 'lucide-react';
import { setFavoriteStatus } from '../lib/api';
import { useState } from 'react';
import { parseTimeToMinutes, formatMinutes } from '../lib/utils';

interface RecipeCardProps {
  id: number;
  title: string;
  imageUrl?: string;
  hasAllergens: boolean;
  cookTime?: string;
  prepTime?: string;
  servings?: string;
  isFavorite: boolean;
  onFavoriteChange?: (id: number, isFavorite: boolean) => void;
}

const RecipeCard = ({ id, title, imageUrl, hasAllergens, cookTime, prepTime, servings, isFavorite, onFavoriteChange }: RecipeCardProps) => {
  const totalMinutes = parseTimeToMinutes(prepTime) + parseTimeToMinutes(cookTime);
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
    <Link to={`/recipe/${id}`} className="group relative block rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
      {/* Absolute Overlay Buttons - Placed at the top level for stability */}
      <button
        onClick={handleFavoriteClick}
        style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 40 }}
        className="bg-white/95 p-2 rounded-full hover:bg-white transition-all shadow-md active:scale-90 border border-slate-200/50 flex items-center justify-center pointer-events-auto"
      >
        <Heart size={20} className={`${isFav ? 'text-p-coral fill-current' : 'text-slate-500'}`} />
      </button>

      {hasAllergens && (
        <div
          style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 40 }}
          className="bg-p-coral text-white p-2 rounded-full shadow-lg backdrop-blur-sm flex items-center justify-center pointer-events-none"
        >
          <AlertTriangle size={20} />
        </div>
      )}

      {/* Top Section: Image */}
      <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
        <img
          src={imageUrl || 'https://placehold.co/600x400/F8E8EE/C9A9A6?text=LMeals'}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Bottom Section: Info */}
      <div className="p-4 bg-white">
        <h3 className="text-lg font-bold text-slate-800 truncate group-hover:text-p-coral transition-colors">{title}</h3>
        {(totalMinutes > 0 || servings) && (
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
            {totalMinutes > 0 && (
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{formatMinutes(totalMinutes)}</span>
              </div>
            )}
            {totalMinutes > 0 && servings && <span className="w-1 h-1 rounded-full bg-slate-300" />}
            {servings && (
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{servings}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default RecipeCard;
