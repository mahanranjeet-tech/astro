import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
    rating: number;
    setRating: (rating: number) => void;
    size?: number;
    disabled?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, setRating, size = 32, disabled = false }) => {
    return (
        <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                    <button
                        type="button"
                        key={ratingValue}
                        onClick={() => !disabled && setRating(ratingValue)}
                        className={`transition-transform duration-150 ease-in-out ${!disabled ? 'hover:scale-110' : 'cursor-default'}`}
                        aria-label={`Rate ${ratingValue} out of 5 stars`}
                        disabled={disabled}
                    >
                        <Star
                            size={size}
                            className={`transition-colors ${
                                ratingValue <= Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            } ${!disabled ? 'cursor-pointer' : ''}`}
                        />
                    </button>
                );
            })}
        </div>
    );
};

export default StarRating;