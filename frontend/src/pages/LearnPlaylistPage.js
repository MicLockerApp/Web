/**
 * LearnPlaylistPage - View a playlist and its videos
 * 
 * Features:
 * - Playlist info and thumbnail
 * - List of videos (preview/locked status)
 * - Purchase button for paid playlists
 * - Favorite button
 * - Reviews
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Play, Star, Lock, Unlock, Heart, Share2, Clock, 
  Eye, Check, ChevronRight, Loader2, ShoppingCart
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import SignUpModal from '../components/SignUpModal';

const LearnPlaylistPage = () => {
  const { playlistId } = useParams();
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Get playlist
      const playlistRes = await api.get(`/learn/playlists/${playlistId}`);
      setPlaylist(playlistRes.data);
      
      // Get videos in playlist
      const videosRes = await api.get(`/learn/videos?playlist_id=${playlistId}`);
      setVideos(videosRes.data);
      
      // Get reviews
      const reviewsRes = await api.get(`/learn/reviews/playlist/${playlistId}?limit=5`);
      setReviews(reviewsRes.data);
      
      // Check if user has purchased/favorited
      if (isAuthenticated) {
        try {
          const favRes = await api.get('/learn/favorites');
          const isFav = favRes.data.playlists?.some(p => p.id === playlistId);
          setIsFavorited(isFav);
        } catch (e) {}
        
        // Check purchase status (would need a dedicated endpoint)
        // For now, we'll assume not purchased unless playlist is free
        if (playlistRes.data.is_free) {
          setHasPurchased(true);
        }
      }
    } catch (error) {
      console.error('Error fetching playlist:', error);
    } finally {
      setLoading(false);
    }
  }, [playlistId, isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle favorite
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    
    try {
      if (isFavorited) {
        await api.delete(`/learn/favorites/playlist/${playlistId}`);
        setIsFavorited(false);
      } else {
        await api.post(`/learn/favorites/playlist/${playlistId}`);
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Purchase playlist
  const handlePurchase = async () => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    
    setPurchasing(true);
    try {
      // This would integrate with Stripe
      // For now, just simulate purchase
      alert('Payment integration coming soon! This playlist would cost $' + playlist.price_usd);
      // After successful payment:
      // setHasPurchased(true);
    } catch (error) {
      console.error('Error purchasing:', error);
    } finally {
      setPurchasing(false);
    }
  };

  // Check if video is accessible
  const canWatchVideo = (video) => {
    if (playlist?.is_free) return true;
    if (video.is_free) return true;
    if (video.is_preview) return true;
    if (hasPurchased) return true;
    return false;
  };

  if (loading) return <LoadingSpinner />;
  if (!playlist) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Playlist not found</p>
    </div>
  );

  const totalDuration = videos.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back Link */}
        <Link 
          to={`/learn/channel/${playlist.channel_id}`}
          className={`inline-flex items-center gap-1 mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Channel
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Playlist Header */}
            <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg mb-6`}>
              <div className="aspect-video bg-dark-500 relative">
                {playlist.thumbnail_url ? (
                  <img src={playlist.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {playlist.title}
                  </h1>
                  <div className="flex items-center gap-4 text-white/80 text-sm">
                    <span className="flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      {videos.length} videos
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(totalDuration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {playlist.view_count || 0} views
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                {/* Creator Info */}
                <Link 
                  to={`/learn/channel/${playlist.channel_id}`}
                  className="flex items-center gap-3 mb-4"
                >
                  <div className="w-10 h-10 rounded-full bg-dark-300 flex items-center justify-center overflow-hidden">
                    {playlist.owner_avatar ? (
                      <img src={playlist.owner_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{playlist.owner_username?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {playlist.channel_name || playlist.owner_username}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      @{playlist.owner_username}
                    </p>
                  </div>
                </Link>
                
                {/* Description */}
                {playlist.description && (
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {playlist.description}
                  </p>
                )}
                
                {/* Actions */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleToggleFavorite}
                    className={`btn ${isFavorited ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                    {isFavorited ? 'Saved' : 'Save'}
                  </button>
                  <button className="btn btn-secondary flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>

            {/* Video List */}
            <div className={`rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg`}>
              <div className="p-4 border-b border-dark-300">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Videos
                </h2>
              </div>
              <div className="divide-y divide-dark-300">
                {videos.map((video, index) => {
                  const accessible = canWatchVideo(video);
                  
                  return (
                    <div 
                      key={video.id}
                      className={`flex gap-4 p-4 ${accessible ? 'cursor-pointer hover:bg-dark-300/50' : 'opacity-60'}`}
                      onClick={() => accessible && navigate(`/learn/video/${video.id}`)}
                    >
                      {/* Thumbnail */}
                      <div className="w-40 aspect-video bg-dark-500 rounded-lg overflow-hidden relative flex-shrink-0">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-white text-xs">
                          {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
                        </div>
                        {!accessible && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Lock className="w-6 h-6 text-white" />
                          </div>
                        )}
                        {video.is_preview && !playlist.is_free && (
                          <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-blue-500 text-white text-xs">
                            Preview
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {index + 1}. {video.title}
                          </h3>
                          {accessible ? (
                            <Unlock className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          )}
                        </div>
                        {video.description && (
                          <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {video.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                            {video.view_count || 0} views
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Purchase Card */}
            {!playlist.is_free && !hasPurchased && (
              <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg mb-6`}>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-primary">
                    ${playlist.price_usd}
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    One-time purchase
                  </p>
                </div>
                
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  {purchasing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  {purchasing ? 'Processing...' : 'Buy Now'}
                </button>
                
                <p className={`text-xs text-center mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Lifetime access • Instant access after purchase
                </p>
              </div>
            )}
            
            {/* Already Purchased / Free */}
            {(playlist.is_free || hasPurchased) && (
              <div className={`rounded-xl p-6 ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'} mb-6`}>
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">
                    {playlist.is_free ? 'Free Playlist' : 'Purchased'}
                  </span>
                </div>
                <p className={`text-sm ${isDark ? 'text-green-400/70' : 'text-green-700'}`}>
                  You have full access to all videos in this playlist.
                </p>
              </div>
            )}

            {/* Stats */}
            <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg mb-6`}>
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Playlist Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Videos</span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{videos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Total Duration</span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{formatDuration(totalDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Views</span>
                  <span className={isDark ? 'text-white' : 'text-gray-900'}>{playlist.view_count || 0}</span>
                </div>
                {playlist.average_rating > 0 && (
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Rating</span>
                    <span className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      {playlist.average_rating.toFixed(1)} ({playlist.review_count})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg`}>
                <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Reviews
                </h3>
                <div className="space-y-4">
                  {reviews.slice(0, 3).map(review => (
                    <div key={review.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {review.reviewer_username}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      {review.content && (
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {review.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <SignUpModal 
        isOpen={showSignUpModal} 
        onClose={() => setShowSignUpModal(false)}
        action="interact"
      />
    </div>
  );
};

export default LearnPlaylistPage;
