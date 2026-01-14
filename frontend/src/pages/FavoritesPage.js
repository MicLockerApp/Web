import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ListingCard from '../components/ListingCard';

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchFavorites();
  }, [isAuthenticated, authLoading, navigate, page]);

  const fetchFavorites = async () => {
    try {
      const response = await usersAPI.getFavorites({ page, limit: 20 });
      setFavorites(response.data.listings || []);
      setTotalPages(response.data.pages || 0);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteChange = (listingId, isFavorite) => {
    if (!isFavorite) {
      // Remove from list when unfavorited
      setFavorites(prev => prev.filter(f => f.id !== listingId));
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen" data-testid="favorites-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-white">My Favorites</h1>
        </div>

        {favorites.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {favorites.map(listing => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  onFavoriteChange={handleFavoriteChange}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <span className="flex items-center px-4 text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No favorites yet</h2>
            <p className="text-gray-400 mb-6">
              Start adding items to your favorites by clicking the heart icon on any listing.
            </p>
            <button
              onClick={() => navigate('/search')}
              className="btn btn-primary"
            >
              Browse Listings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
