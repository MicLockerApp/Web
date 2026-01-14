import React from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating, size = 16, showValue = false, totalReviews = null }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Star
          key={i}
          className="text-primary fill-primary"
          style={{ width: size, height: size }}
        />
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <div key={i} className="relative" style={{ width: size, height: size }}>
          <Star className="absolute text-gray-600" style={{ width: size, height: size }} />
          <div className="absolute overflow-hidden" style={{ width: size / 2 }}>
            <Star className="text-primary fill-primary" style={{ width: size, height: size }} />
          </div>
        </div>
      );
    } else {
      stars.push(
        <Star
          key={i}
          className="text-gray-600"
          style={{ width: size, height: size }}
        />
      );
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex">{stars}</div>
      {showValue && (
        <span className="text-sm text-gray-400 ml-1">
          {rating.toFixed(1)}
          {totalReviews !== null && ` (${totalReviews} reviews)`}
        </span>
      )}
    </div>
  );
};

export default StarRating;
