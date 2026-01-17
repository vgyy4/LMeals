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
}

const RecipeCard = ({ id, title, imageUrl, hasAllergens, cookTime, prepTime, isFavorite }: RecipeCardProps) => {
    const totalTime = (parseInt(prepTime || '0') || 0) + (parseInt(cookTime || '0') || 0);
    const [isFav, setIsFav] = useState(isFavorite);

    const handleFavoriteClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newFavStatus = !isFav;
        setIsFav(newFavStatus);
        await setFavoriteStatus(id, newFavStatus);
    };

    return (
    <Link to={`/recipe/${id}`} className="group block rounded-2xl bg-white shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <button onClick={handleFavoriteClick} className="absolute top-2 start-2 bg-white/70 p-2 rounded-full hover:bg-white transition-colors z-10">
            <Heart size={20} className={`${isFav ? 'text-red-500 fill-current' : 'text-gray-500'}`} />
        </button>
        <img
          src={imageUrl || 'https://placehold.co/600x400/F8E8EE/C9A9A6?text=LMeals'}
          alt={title}
          className="w-full h-40 object-cover rounded-t-2xl"
        />
        {hasAllergens && (
          <div className="absolute top-2 end-2 bg-red-500 text-white p-2 rounded-full">
            <AlertTriangle size={20} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 truncate group-hover:text-soft-rose transition-colors">{title}</h3>
        {totalTime > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Clock size={16} />
                <span>{totalTime} min</span>
            </div>
        )}
      </div>
    </Link>
  );
};

export default RecipeCard;
