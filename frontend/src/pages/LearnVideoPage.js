/**
 * LearnVideoPage - View a single video
 * 
 * Features:
 * - Video player
 * - Video info (title, description, views)
 * - Channel info
 * - Related videos from same playlist/channel
 * - Reviews section
 * - Purchase/unlock for paid videos
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Play, Pause, Star, Users, Heart, Share2, Lock, Clock, Eye,
  ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize, SkipBack,
  SkipForward, Check, X, Loader2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import SignUpModal from '../components/SignUpModal';

// Video Player Component
const VideoPlayer = ({ video, isPurchased, previewMode }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [previewEnded, setPreviewEnded] = useState(false);
  const controlsTimeout = useRef(null);

  const previewLimit = previewMode && video.preview_duration_seconds 
    ? video.preview_duration_seconds 
    : null;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => {
      setCurrentTime(vid.currentTime);
      // Check preview limit
      if (previewLimit && vid.currentTime >= previewLimit) {
        vid.pause();
        setPreviewEnded(true);
        setIsPlaying(false);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(vid.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    vid.addEventListener('timeupdate', handleTimeUpdate);
    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    vid.addEventListener('ended', handleEnded);

    return () => {
      vid.removeEventListener('timeupdate', handleTimeUpdate);
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
      vid.removeEventListener('ended', handleEnded);
    };
  }, [previewLimit]);

  const togglePlay = () => {
    if (previewEnded) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (e) => {
    if (previewEnded) return;
    const newTime = parseFloat(e.target.value);
    if (previewLimit && newTime > previewLimit) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skip = (seconds) => {
    if (previewEnded) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    if (previewLimit && newTime > previewLimit) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current.parentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div 
      className="relative bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url}
        className="w-full aspect-video"
        onClick={togglePlay}
      />

      {/* Preview Ended Overlay */}
      {previewEnded && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
          <Lock className="w-16 h-16 mb-4 text-primary" />
          <h3 className="text-xl font-bold mb-2">Preview Ended</h3>
          <p className="text-gray-400 mb-4">Purchase this video to continue watching</p>
        </div>
      )}

      {/* Play Button Overlay */}
      {!isPlaying && !previewEnded && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-10 h-10 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white text-sm">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={previewLimit || duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
          <span className="text-white text-sm">{formatTime(previewLimit || duration)}</span>
          {previewMode && previewLimit && (
            <span className="text-yellow-400 text-xs ml-2">Preview</span>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => skip(-10)} className="text-white hover:text-primary">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={togglePlay} className="text-white hover:text-primary">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button onClick={() => skip(10)} className="text-white hover:text-primary">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-primary">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer"
              />
            </div>
            <button onClick={toggleFullscreen} className="text-white hover:text-primary">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Related Video Card
const RelatedVideoCard = ({ video }) => {
  const { isDark } = useTheme();
  
  return (
    <Link 
      to={`/learn/video/${video.id}`}
      className={`flex gap-3 rounded-lg overflow-hidden ${isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-100'} p-2 transition-colors`}
    >
      <div className="w-40 aspect-video bg-dark-500 rounded-lg overflow-hidden flex-shrink-0 relative">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-600" />
          </div>
        )}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
          {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium line-clamp-2 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {video.title}
        </h4>
        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {video.channel_name}
        </p>
        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {video.view_count || 0} views
        </p>
      </div>
    </Link>
  );
};

// Main Component
const LearnVideoPage = () => {
  const { videoId } = useParams();
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState(null);
  const [channel, setChannel] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Determine if user can watch full video
  const canWatchFull = video?.is_free || isPurchased || (user?.id === video?.user_id);
  const showPreview = !canWatchFull && (video?.is_preview || video?.preview_duration_seconds);

  // Fetch video data
  const fetchVideo = useCallback(async () => {
    try {
      const videoRes = await api.get(`/learn/videos/${videoId}`);
      setVideo(videoRes.data);
      
      // Fetch channel info
      if (videoRes.data.channel_id) {
        const channelRes = await api.get(`/learn/channels/${videoRes.data.channel_id}`);
        setChannel(channelRes.data);
      }
      
      // Fetch related videos (from same playlist or channel)
      const params = videoRes.data.playlist_id 
        ? `playlist_id=${videoRes.data.playlist_id}` 
        : `channel_id=${videoRes.data.channel_id}`;
      const relatedRes = await api.get(`/learn/videos?${params}&limit=10`);
      setRelatedVideos(relatedRes.data.filter(v => v.id !== videoId));
      
      // Fetch reviews
      const reviewsRes = await api.get(`/learn/reviews/video/${videoId}?limit=5`);
      setReviews(reviewsRes.data);
      
      // Check purchase status if logged in and video is paid
      if (isAuthenticated && !videoRes.data.is_free) {
        try {
          const favRes = await api.get('/learn/favorites');
          setIsFavorited(favRes.data.videos?.some(v => v.id === videoId) || false);
          // Would need a purchases endpoint to check
        } catch (e) {
          // Ignore
        }
      }
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setLoading(false);
    }
  }, [videoId, isAuthenticated]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  // Handle purchase
  const handlePurchase = async () => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    
    setPurchasing(true);
    try {
      // In real implementation, this would redirect to Stripe checkout
      alert('Payment integration coming soon! For now, marking as purchased for demo.');
      setIsPurchased(true);
    } catch (error) {
      console.error('Error purchasing:', error);
    } finally {
      setPurchasing(false);
    }
  };

  // Toggle favorite
  const handleFavorite = async () => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    
    try {
      if (isFavorited) {
        await api.delete(`/learn/favorites/video/${videoId}`);
        setIsFavorited(false);
      } else {
        await api.post(`/learn/favorites/video/${videoId}`);
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!video) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Video not found</p>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Video Player */}
            <VideoPlayer 
              video={video} 
              isPurchased={isPurchased} 
              previewMode={showPreview}
            />

            {/* Video Info */}
            <div className="mt-4">
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {video.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Eye className="w-4 h-4" />
                  {video.view_count || 0} views
                </span>
                <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Clock className="w-4 h-4" />
                  {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
                </span>
                {video.average_rating > 0 && (
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    {video.average_rating.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {!video.is_free && !isPurchased && user?.id !== video.user_id && (
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Purchase ${video.price_usd}
                  </button>
                )}
                <button
                  onClick={handleFavorite}
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

              {/* Description */}
              {video.description && (
                <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
                  <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    {video.description}
                  </p>
                </div>
              )}

              {/* Channel Info */}
              {channel && (
                <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} flex items-center gap-4`}>
                  <Link to={`/learn/channel/${channel.id}`}>
                    <div className="w-14 h-14 rounded-full bg-dark-500 overflow-hidden">
                      {channel.owner_avatar ? (
                        <img src={channel.owner_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-white">
                          {channel.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1">
                    <Link to={`/learn/channel/${channel.id}`}>
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {channel.name}
                      </h3>
                    </Link>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {channel.subscriber_count || 0} subscribers
                    </p>
                  </div>
                  <Link to={`/learn/channel/${channel.id}`} className="btn btn-secondary">
                    View Channel
                  </Link>
                </div>
              )}

              {/* Playlist Info */}
              {video.playlist_id && video.playlist_title && (
                <Link 
                  to={`/learn/playlist/${video.playlist_id}`}
                  className={`block mt-4 p-4 rounded-xl ${isDark ? 'bg-dark-400 hover:bg-dark-300' : 'bg-white hover:bg-gray-50'} transition-colors`}
                >
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>From playlist:</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {video.playlist_title}
                  </p>
                </Link>
              )}

              {/* Reviews */}
              {reviews.length > 0 && (
                <div className="mt-6">
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Reviews
                  </h3>
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className={`p-4 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
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

          {/* Sidebar - Related Videos */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Related Videos
            </h3>
            {relatedVideos.length > 0 ? (
              <div className="space-y-2">
                {relatedVideos.map(v => (
                  <RelatedVideoCard key={v.id} video={v} />
                ))}
              </div>
            ) : (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No related videos
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sign Up Modal */}
      <SignUpModal 
        isOpen={showSignUpModal} 
        onClose={() => setShowSignUpModal(false)}
        actionText="watch this video"
      />
    </div>
  );
};

export default LearnVideoPage;
