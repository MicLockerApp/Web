/**
 * LearnPage - Educational Content Platform
 * 
 * Features:
 * - Scrolling banner (admin-controlled, up to 5)
 * - Category/subcategory browsing
 * - Trending channels section
 * - Search for channels, playlists, videos
 * - Filter by category, price, rating
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  GraduationCap, Search, Filter, ChevronLeft, ChevronRight, 
  Star, Users, Play, Clock, ChevronDown, X, Loader2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

// Categories matching the rest of the site
const LEARN_CATEGORIES = [
  { value: 'musician', label: 'Musicians', icon: '🎸' },
  { value: 'audio_engineer', label: 'Audio Engineering', icon: '🎛️' },
  { value: 'recording_studio', label: 'Recording Studios', icon: '🎙️' },
  { value: 'venue', label: 'Venues', icon: '🏟️' },
  { value: 'dj', label: 'DJs', icon: '🎧' },
  { value: 'producer', label: 'Producers', icon: '🎹' },
  { value: 'songwriter', label: 'Songwriters', icon: '✍️' },
  { value: 'vocalist', label: 'Vocalists', icon: '🎤' },
  { value: 'session_musician', label: 'Session Musicians', icon: '🎻' },
  { value: 'music_teacher', label: 'Music Teachers', icon: '📚' },
  { value: 'band', label: 'Bands', icon: '🎪' },
  { value: 'other', label: 'Other', icon: '🎵' }
];

// Banner Carousel Component
const BannerCarousel = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isDark } = useTheme();

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  const goToSlide = (index) => setCurrentIndex(index);
  const prevSlide = () => setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
  const nextSlide = () => setCurrentIndex(prev => (prev + 1) % banners.length);

  return (
    <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-2xl mb-8">
      {/* Slides */}
      <div 
        className="flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner, index) => (
          <div key={banner.id} className="min-w-full h-full relative">
            <img 
              src={banner.image_url} 
              alt={banner.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
                {banner.title}
              </h2>
              {banner.subtitle && (
                <p className="text-gray-200 text-sm md:text-base mb-4">{banner.subtitle}</p>
              )}
              {banner.link_type === 'channel' && banner.link_id && (
                <Link 
                  to={`/learn/channel/${banner.link_id}`}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  View Channel
                </Link>
              )}
              {banner.link_type === 'external' && banner.external_url && (
                <a 
                  href={banner.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  Learn More
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-primary' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Channel Card Component
const ChannelCard = ({ channel }) => {
  const { isDark } = useTheme();
  
  return (
    <Link 
      to={`/learn/channel/${channel.id}`}
      className={`block rounded-xl overflow-hidden transition-transform hover:scale-[1.02] ${
        isDark ? 'bg-dark-400 hover:bg-dark-300' : 'bg-white hover:bg-gray-50'
      } shadow-lg`}
    >
      {/* Channel Banner/Thumbnail */}
      <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/40 relative">
        {channel.banner_image && (
          <img src={channel.banner_image} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          <div className="w-16 h-16 rounded-full bg-dark-300 border-4 border-dark-400 overflow-hidden">
            {channel.owner_avatar ? (
              <img src={channel.owner_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {channel.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Channel Info */}
      <div className="pt-10 pb-4 px-4">
        <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {channel.name}
        </h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          @{channel.owner_username}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Users className="w-4 h-4" />
            {channel.subscriber_count || 0}
          </span>
          {channel.average_rating > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              {channel.average_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

// Playlist Card Component
const PlaylistCard = ({ playlist }) => {
  const { isDark } = useTheme();
  
  return (
    <Link 
      to={`/learn/playlist/${playlist.id}`}
      className={`block rounded-xl overflow-hidden transition-transform hover:scale-[1.02] ${
        isDark ? 'bg-dark-400 hover:bg-dark-300' : 'bg-white hover:bg-gray-50'
      } shadow-lg`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-dark-500 relative">
        {playlist.thumbnail_url ? (
          <img src={playlist.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-600" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs flex items-center gap-1">
          <Play className="w-3 h-3" />
          {playlist.video_count || 0} videos
        </div>
        {playlist.is_free ? (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-green-500 text-white text-xs font-medium">
            FREE
          </div>
        ) : (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-primary text-black text-xs font-medium">
            ${playlist.price_usd}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-4">
        <h3 className={`font-semibold line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {playlist.title}
        </h3>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {playlist.owner_username}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
            {playlist.view_count || 0} views
          </span>
          {playlist.average_rating > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-3 h-3 fill-current" />
              {playlist.average_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

// Main Learn Page Component
const LearnPage = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [trendingChannels, setTrendingChannels] = useState([]);
  const [channels, setChannels] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [priceFilter, setPriceFilter] = useState('all'); // all, free, paid
  const [minRating, setMinRating] = useState(0);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch banners
      const bannersRes = await api.get('/learn/banners');
      setBanners(bannersRes.data);
      
      // Fetch trending channels
      const trendingRes = await api.get('/learn/channels/trending?limit=6');
      setTrendingChannels(trendingRes.data);
      
      // Build query params for channels
      const channelParams = new URLSearchParams();
      if (selectedCategory) channelParams.append('category', selectedCategory);
      if (searchQuery) channelParams.append('search', searchQuery);
      if (minRating > 0) channelParams.append('min_rating', minRating.toString());
      channelParams.append('sort_by', sortBy);
      channelParams.append('limit', '12');
      
      const channelsRes = await api.get(`/learn/channels?${channelParams}`);
      setChannels(channelsRes.data);
      
      // Fetch playlists
      const playlistParams = new URLSearchParams();
      if (selectedCategory) playlistParams.append('category', selectedCategory);
      if (searchQuery) playlistParams.append('search', searchQuery);
      if (priceFilter === 'free') playlistParams.append('free_only', 'true');
      if (minRating > 0) playlistParams.append('min_rating', minRating.toString());
      playlistParams.append('sort_by', sortBy);
      playlistParams.append('limit', '8');
      
      const playlistsRes = await api.get(`/learn/playlists?${playlistParams}`);
      setPlaylists(playlistsRes.data);
      
    } catch (error) {
      console.error('Error fetching learn data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy, priceFilter, minRating]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle category click
  const handleCategoryClick = (category) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
    const params = new URLSearchParams(searchParams);
    if (category === selectedCategory || !category) {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    setSearchParams(params);
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }
    setSearchParams(params);
  };

  if (loading && !channels.length) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`} data-testid="learn-page">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Learn
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Discover tutorials and courses from creative professionals
            </p>
          </div>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels, playlists..."
                className={`pl-10 pr-4 py-2 rounded-lg w-64 ${
                  isDark 
                    ? 'bg-dark-400 text-white placeholder-gray-500 border-dark-300' 
                    : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200'
                } border focus:outline-none focus:ring-2 focus:ring-primary/50`}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg ${
                isDark ? 'bg-dark-400 text-gray-300 hover:bg-dark-300' : 'bg-white text-gray-600 hover:bg-gray-100'
              } border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg`}>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`px-3 py-2 rounded-lg ${
                    isDark ? 'bg-dark-500 text-white border-dark-300' : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border`}
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Price
                </label>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className={`px-3 py-2 rounded-lg ${
                    isDark ? 'bg-dark-500 text-white border-dark-300' : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border`}
                >
                  <option value="all">All</option>
                  <option value="free">Free Only</option>
                  <option value="paid">Paid Only</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Minimum Rating
                </label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className={`px-3 py-2 rounded-lg ${
                    isDark ? 'bg-dark-500 text-white border-dark-300' : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border`}
                >
                  <option value="0">Any Rating</option>
                  <option value="3">3+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Banner Carousel */}
        {banners.length > 0 && <BannerCarousel banners={banners} />}

        {/* Categories */}
        <div className="mb-8">
          <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Browse by Category
          </h2>
          <div className="flex flex-wrap gap-2">
            {LEARN_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-primary text-black'
                    : isDark 
                      ? 'bg-dark-400 text-gray-300 hover:bg-dark-300' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
            {selectedCategory && (
              <button
                onClick={() => handleCategoryClick('')}
                className="px-4 py-2 rounded-full text-sm font-medium bg-red-500/20 text-red-500 hover:bg-red-500/30"
              >
                <X className="w-4 h-4 inline mr-1" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Trending Channels */}
        {trendingChannels.length > 0 && !selectedCategory && !searchQuery && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                🔥 Trending Channels
              </h2>
              <Link to="/learn/channels" className="text-primary hover:underline text-sm">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingChannels.map(channel => (
                <ChannelCard key={channel.id} channel={channel} />
              ))}
            </div>
          </div>
        )}

        {/* All Channels */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {selectedCategory 
                ? `${LEARN_CATEGORIES.find(c => c.value === selectedCategory)?.label || 'Channels'}`
                : 'All Channels'
              }
            </h2>
          </div>
          {channels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {channels.map(channel => (
                <ChannelCard key={channel.id} channel={channel} />
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No channels found</p>
              <p className="text-sm">Be the first to create a channel!</p>
              {user && (
                <Link to="/learn/studio" className="btn btn-primary mt-4 inline-flex items-center gap-2">
                  Create Your Channel
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Popular Playlists */}
        {playlists.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Popular Playlists
              </h2>
              <Link to="/learn/playlists" className="text-primary hover:underline text-sm">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {playlists.map(playlist => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          </div>
        )}

        {/* Create Channel CTA */}
        {user && (
          <div className={`mt-12 p-8 rounded-2xl text-center ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg`}>
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Share Your Knowledge
            </h2>
            <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Create your own channel and start teaching others. Upload tutorials, 
              create playlists, and build your audience.
            </p>
            <Link to="/learn/studio" className="btn btn-primary inline-flex items-center gap-2">
              <Play className="w-5 h-5" />
              Go to Creator Studio
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnPage;
