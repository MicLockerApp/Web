import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usersAPI } from '../services/api';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchFavorites = async () => {
      try {
        const response = await usersAPI.getFavorites();
        setListings(response.data.listings || []);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated, navigate, authLoading]);

  const handleFavoriteChange = (listingId, isFavorite) => {
    if (!isFavorite) {
      setListings(prev => prev.filter(l => l.id !== listingId));
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen" data-testid="favorites-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className={`text-2xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>My Favorites</h1>

        {listings.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No favorites yet</h2>
            <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Start browsing and save items you love!</p>
            <Link to="/search" className="btn btn-primary">
              Browse Gear
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
