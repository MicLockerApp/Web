import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usersAPI } from '../services/api';

const ListingCard = ({ listing, onFavoriteChange }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
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
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
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
      className={`card group ${isDark ? '' : 'border border-gray-200 shadow-sm'}`}
      data-testid={`listing-card-${listing.id}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={primaryImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400';
          }}
        />
        {listing.condition && (
          <span className="absolute top-2 left-2 badge badge-primary">
            {listing.condition}
          </span>
        )}
        {/* Favorite Button - show for all users */}
        <button
          onClick={handleFavoriteClick}
          disabled={loading}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isFavorite 
              ? 'bg-primary text-black' 
              : isDark 
                ? 'bg-dark-400/80 text-gray-300 hover:bg-dark-300 hover:text-white'
                : 'bg-white/90 text-gray-500 hover:bg-white hover:text-gray-700 shadow-sm'
          }`}
          data-testid={`favorite-button-${listing.id}`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="p-4">
        <h3 className={`font-medium line-clamp-2 group-hover:text-primary transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {listing.title}
        </h3>
        <p className="text-2xl font-bold text-primary mt-2">
          ${listing.price?.toLocaleString()}
        </p>
        {listing.shipping?.price > 0 && (
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            + ${listing.shipping.price} shipping
          </p>
        )}
        <div className={`flex items-center justify-between mt-3 pt-3 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            {/* Seller profile image */}
            {listing.seller_profile_image && listing.seller_profile_image !== 'None' ? (
              <img 
                src={listing.seller_profile_image} 
                alt={listing.seller_username}
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-300' : 'bg-gray-200'}`}
              style={{ display: listing.seller_profile_image && listing.seller_profile_image !== 'None' ? 'none' : 'flex' }}
            >
              <span className="text-xs font-medium text-primary">
                {listing.seller_username?.[0]?.toUpperCase()}
              </span>
            </div>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{listing.seller_username}</span>
            {listing.seller_rating > 0 && (
              <div className="flex items-center gap-1 ml-1">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {listing.seller_rating?.toFixed(1)}
                </span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  ({listing.seller_review_count || 0})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;
