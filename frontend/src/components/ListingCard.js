import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';

const ListingCard = ({ listing, onFavoriteChange }) => {
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  const primaryImage = listing.media?.find(m => m.is_primary)?.url || 
                       listing.media?.[0]?.url || 
                       'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400';

  useEffect(() => {
    const checkFavorite = async () => {
      if (!isAuthenticated) return;
      try {
        const response = await usersAPI.checkFavorite(listing.id);
        setIsFavorite(response.data.is_favorite);
      } catch (error) {
        // Ignore errors for favorite check
      }
    };
    checkFavorite();
  }, [listing.id, isAuthenticated]);

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      if (isFavorite) {
        await usersAPI.removeFavorite(listing.id);
        setIsFavorite(false);
      } else {
        await usersAPI.addFavorite(listing.id);
        setIsFavorite(true);
      }
      if (onFavoriteChange) {
        onFavoriteChange(listing.id, !isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link 
      to={`/listing/${listing.id}`} 
      className="card group"
      data-testid={`listing-card-${listing.id}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={primaryImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {listing.condition && (
          <span className="absolute top-2 left-2 badge badge-primary">
            {listing.condition}
          </span>
        )}
        {/* Favorite Button */}
        {isAuthenticated && (
          <button
            onClick={handleFavoriteClick}
            disabled={loading}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isFavorite 
                ? 'bg-primary text-black' 
                : 'bg-dark-400/80 text-gray-300 hover:bg-dark-300 hover:text-white'
            }`}
            data-testid={`favorite-button-${listing.id}`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-white font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>
        <p className="text-2xl font-bold text-primary mt-2">
          ${listing.price?.toLocaleString()}
        </p>
        {listing.shipping?.price > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            + ${listing.shipping.price} shipping
          </p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-300">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-400">{listing.seller_username}</span>
            {listing.seller_rating > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-xs text-gray-400">{listing.seller_rating?.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;
