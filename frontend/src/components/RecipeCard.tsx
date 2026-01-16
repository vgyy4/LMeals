import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

interface RecipeCardProps {
  id: number;
  title: string;
  imageUrl?: string;
  hasAllergens?: boolean;
}

const RecipeCard = ({ id, title, imageUrl, hasAllergens }: RecipeCardProps) => {
  return (
    <Link to={`/recipe/${id}`} className="block bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <img src={imageUrl || 'https://via.placeholder.com/300'} alt={title} className="w-full h-40 object-cover rounded-t-2xl" />
        {hasAllergens && (
          <div className="absolute top-2 end-2 bg-soft-rose p-1.5 rounded-full">
            <ShieldAlert className="text-red-500" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-800 truncate">{title}</h3>
      </div>
    </Link>
  );
};

export default RecipeCard;
