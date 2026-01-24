import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gigsAPI } from '../services/api';
import useS3Upload from '../hooks/useS3Upload';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  List, Search, Filter, Plus, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  MapPin, DollarSign, Mail, Phone, Eye, Trash2,
  Instagram, Facebook, Twitter, Youtube, Globe, Music,
  Briefcase, Image, Video, ExternalLink,
  Check, AlertCircle, User, Play
} from 'lucide-react';

// Category icons mapping - expanded with Comedians and Actors
const CATEGORY_ICONS = {
  musician: '🎸',
  audio_engineer: '🎚️',
  recording_studio: '🎙️',
  venue: '🏟️',
  merchant: '🛍️',
  comedian: '🎭',
  actor: '🎬'
};

const CATEGORY_LABELS = {
  musician: 'Musicians',
  audio_engineer: 'Audio Engineers',
  recording_studio: 'Recording Studios',
  venue: 'Venues',
  merchant: 'Merchants',
  comedian: 'Comedians',
  actor: 'Actors'
};

// Placeholder images from Pexels
const PLACEHOLDER_IMAGES = [
  "https://images.pexels.com/photos/4513456/pexels-photo-4513456.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/8040842/pexels-photo-8040842.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/228842/pexels-photo-228842.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/9010089/pexels-photo-9010089.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/8040897/pexels-photo-8040897.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/3984815/pexels-photo-3984815.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/3984817/pexels-photo-3984817.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/8197259/pexels-photo-8197259.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/7095737/pexels-photo-7095737.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/8044176/pexels-photo-8044176.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/8512406/pexels-photo-8512406.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/3984818/pexels-photo-3984818.jpeg?auto=compress&cs=tinysrgb&w=600"
];

const GigsPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // Main state
  const [activeTab, setActiveTab] = useState('looking_for'); // 'looking_for' or 'services'
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(null);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFilterCategories, setExpandedFilterCategories] = useState([]);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGigs, setTotalGigs] = useState(0);
  
  // Create gig modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // View gig modal
  const [selectedGig, setSelectedGig] = useState(null);
  
  // My gigs view
  const [showMyGigs, setShowMyGigs] = useState(false);
  const [myGigs, setMyGigs] = useState([]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await gigsAPI.getCategories();
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch gigs when tab or filters change
  useEffect(() => {
    fetchGigs();
  }, [activeTab, selectedCategories, selectedSubcategories, selectedGenres, page]);

  const fetchGigs = async () => {
    setLoading(true);
    try {
      const params = {
        gig_type: activeTab,
        page,
        limit: 20
      };
      
      if (selectedCategories.length > 0) {
        params.categories = selectedCategories.join(',');
      }
      
      if (selectedSubcategories.length > 0) {
        params.subcategories = selectedSubcategories.join(',');
      }
      
      if (selectedGenres.length > 0) {
        params.genres = selectedGenres.join(',');
      }
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const response = await gigsAPI.getAll(params);
      setGigs(response.data.gigs || []);
      setTotalPages(response.data.pages || 1);
      setTotalGigs(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGigs = async () => {
    try {
      const response = await gigsAPI.getMyGigs();
      setMyGigs(response.data.gigs || []);
    } catch (error) {
      console.error('Error fetching my gigs:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchGigs();
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    if (selectedCategories.includes(category)) {
      const subcats = categories?.subcategories?.[category] || [];
      setSelectedSubcategories(prev => prev.filter(s => !subcats.includes(s)));
    }
    setPage(1);
  };

  const toggleSubcategory = (subcategory) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategory)
        ? prev.filter(s => s !== subcategory)
        : [...prev, subcategory]
    );
    setPage(1);
  };

  const toggleGenre = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
    setPage(1);
  };

  const toggleFilterCategory = (category) => {
    setExpandedFilterCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedGenres([]);
    setSearchQuery('');
    setPage(1);
  };

  const handleDeleteGig = async (gigId) => {
    if (!window.confirm('Are you sure you want to delete this gig?')) return;
    
    try {
      await gigsAPI.delete(gigId);
      fetchGigs();
      fetchMyGigs();
      setSelectedGig(null);
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete gig');
    }
  };

  const activeFilterCount = selectedCategories.length + selectedSubcategories.length + selectedGenres.length;

  if (authLoading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-600 flex items-center justify-center p-4">
        <div className="bg-dark-400 rounded-2xl p-8 max-w-md w-full text-center">
          <List className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Gig Board</h1>
          <p className="text-gray-400 mb-6">
            Sign in to browse gigs, post what you're looking for, or share your services.
          </p>
          <Link to="/login?redirect=/gigs" className="btn btn-primary w-full">
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-600" data-testid="gig-board-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <List className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-white">Gig Board</h1>
              <p className="text-gray-400 text-sm">Find opportunities or offer your services</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowMyGigs(!showMyGigs);
                if (!showMyGigs) fetchMyGigs();
              }}
              className={`btn ${showMyGigs ? 'btn-primary' : 'btn-secondary'}`}
            >
              <User className="w-4 h-4" />
              My Posts
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              data-testid="create-gig-btn"
            >
              <Plus className="w-4 h-4" />
              Post a Gig
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('looking_for'); setPage(1); }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'looking_for'
                ? 'bg-primary text-black'
                : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300'
            }`}
            data-testid="tab-looking-for"
          >
            <Search className="w-4 h-4 inline mr-2" />
            Looking For
          </button>
          <button
            onClick={() => { setActiveTab('services'); setPage(1); }}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'services'
                ? 'bg-primary text-black'
                : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300'
            }`}
            data-testid="tab-services"
          >
            <Briefcase className="w-4 h-4 inline mr-2" />
            Services
          </button>
        </div>

        {/* Tab Description Blurb */}
        <div className="bg-dark-400/50 rounded-xl p-4 mb-6 border border-dark-300">
          <p className="text-gray-300 text-sm">
            {activeTab === 'looking_for' ? (
              <>Here other users (such as a band) are posting for things such as a new drummer for example. If you fit that description and you like what you see, reach out! Use filters to find exactly what you are looking for.</>
            ) : (
              <>Here other users are posting about what they bring to the table. If you are looking for someone who plays guitar for example, you can find guitarists here. Use filters to find exactly what you are looking for.</>
            )}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gigs..."
              className="w-full pl-10 pr-4 py-3 bg-dark-400 border border-dark-300 rounded-xl text-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          </form>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Filters</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-primary text-sm hover:underline">
                  Clear All
                </button>
              )}
            </div>
            
            {/* Genre Filter */}
            <div className="mb-4">
              <button
                onClick={() => setShowGenreFilter(!showGenreFilter)}
                className="flex items-center gap-2 text-gray-300 hover:text-white mb-2"
              >
                {showGenreFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <Music className="w-4 h-4" />
                <span className="font-medium">Music Genres</span>
                {selectedGenres.length > 0 && (
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
                    {selectedGenres.length}
                  </span>
                )}
              </button>
              
              {showGenreFilter && (
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 p-3 bg-dark-500 rounded-lg">
                  {categories?.genres?.map(genre => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedGenres.includes(genre)
                          ? 'bg-primary text-black font-medium'
                          : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Category Filters */}
            <h4 className="text-gray-300 font-medium mb-3">Categories</h4>
            <div className="space-y-3">
              {categories?.categories?.map(cat => (
                <div key={cat.value} className="border border-dark-300 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCategory(cat.value)}
                      className={`flex-1 flex items-center gap-3 p-3 transition-colors ${
                        selectedCategories.includes(cat.value)
                          ? 'bg-primary/20 text-primary'
                          : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-medium">{cat.label}</span>
                      {selectedCategories.includes(cat.value) && (
                        <Check className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleFilterCategory(cat.value)}
                      className="p-3 bg-dark-300 text-gray-400 hover:text-white"
                    >
                      {expandedFilterCategories.includes(cat.value) ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  
                  {expandedFilterCategories.includes(cat.value) && (
                    <div className="p-3 bg-dark-500 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {categories?.subcategories?.[cat.value]?.map(subcat => (
                        <button
                          key={subcat}
                          onClick={() => toggleSubcategory(subcat)}
                          className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                            selectedSubcategories.includes(subcat)
                              ? 'bg-primary text-black font-medium'
                              : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300'
                          }`}
                        >
                          {subcat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400">
            {totalGigs} gig{totalGigs !== 1 ? 's' : ''} found
            {activeTab === 'looking_for' ? ' looking for services' : ' offering services'}
          </p>
        </div>

        {/* My Gigs Section */}
        {showMyGigs && (
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">My Posted Gigs</h3>
            {myGigs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">You haven't posted any gigs yet.</p>
            ) : (
              <div className="grid gap-4">
                {myGigs.map(gig => (
                  <div key={gig.id} className="flex items-center justify-between p-4 bg-dark-500 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{CATEGORY_ICONS[gig.category]}</span>
                      <div>
                        <h4 className="text-white font-medium">{gig.title}</h4>
                        <p className="text-gray-400 text-sm">
                          {gig.gig_type === 'looking_for' ? 'Looking For' : 'Services'} • {CATEGORY_LABELS[gig.category]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">
                        <Eye className="w-4 h-4 inline" /> {gig.view_count}
                      </span>
                      <button onClick={() => setSelectedGig(gig)} className="p-2 bg-dark-400 rounded-lg hover:bg-dark-300 text-gray-400">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteGig(gig.id)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gigs List */}
        {loading ? (
          <LoadingSpinner />
        ) : gigs.length === 0 ? (
          <div className="bg-dark-400 rounded-xl p-12 text-center">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No gigs found</h3>
            <p className="text-gray-400 mb-6">
              {activeFilterCount > 0
                ? 'Try adjusting your filters or search query'
                : `Be the first to post ${activeTab === 'looking_for' ? 'what you\'re looking for' : 'your services'}!`}
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Post a Gig
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {gigs.map((gig, index) => (
              <GigCard key={gig.id} gig={gig} onClick={() => setSelectedGig(gig)} placeholderIndex={index} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary disabled:opacity-50">Previous</button>
            <span className="text-gray-400 px-4">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {/* Create Gig Modal */}
      {showCreateModal && (
        <CreateGigModal
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchGigs(); fetchMyGigs(); }}
        />
      )}

      {/* View Gig Modal */}
      {selectedGig && (
        <ViewGigModal
          gig={selectedGig}
          isOwner={selectedGig.user_id === user?.id}
          onClose={() => setSelectedGig(null)}
          onDelete={() => handleDeleteGig(selectedGig.id)}
        />
      )}
    </div>
  );
};

// Gig Card Component with user photo, thumbnail slider
const GigCard = ({ gig, onClick, placeholderIndex }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Get media from gig (should now have multiple images from database)
  const allMedia = gig.media?.length > 0 
    ? gig.media 
    : [{ url: PLACEHOLDER_IMAGES[placeholderIndex % PLACEHOLDER_IMAGES.length], media_type: 'image' }];
  
  const nextSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide(prev => (prev + 1) % allMedia.length);
  };
  
  const prevSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide(prev => (prev - 1 + allMedia.length) % allMedia.length);
  };

  const goToSlide = (e, idx) => {
    e.stopPropagation();
    setCurrentSlide(idx);
  };

  return (
    <div onClick={onClick} className="bg-dark-400 rounded-xl overflow-hidden cursor-pointer hover:bg-dark-300 transition-colors" data-testid={`gig-card-${gig.id}`}>
      {/* Thumbnail Slider - increased height to 72 (288px) from 48 (192px) = +96px */}
      <div className="relative h-72 bg-dark-500">
        {allMedia[currentSlide]?.media_type === 'video' ? (
          <div className="w-full h-full flex items-center justify-center bg-dark-600">
            <Play className="w-16 h-16 text-primary" />
          </div>
        ) : (
          <img 
            src={allMedia[currentSlide]?.url} 
            alt={gig.title} 
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center' }}
          />
        )}
        
        {/* Slide navigation arrows */}
        {allMedia.length > 1 && (
          <>
            <button 
              onClick={prevSlide} 
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={nextSlide} 
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            
            {/* Thumbnail strip at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex gap-2 justify-center overflow-x-auto">
                {allMedia.map((media, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => goToSlide(e, idx)}
                    className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      idx === currentSlide ? 'border-primary scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {media.media_type === 'video' ? (
                      <div className="w-full h-full bg-dark-600 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        
        {/* Media count badge */}
        {allMedia.length > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 rounded-lg text-xs text-white flex items-center gap-1">
            <Image className="w-3 h-3" />
            {allMedia.filter(m => m.media_type === 'image').length}
            {allMedia.filter(m => m.media_type === 'video').length > 0 && (
              <>
                <Video className="w-3 h-3 ml-1" />
                {allMedia.filter(m => m.media_type === 'video').length}
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-5">
        {/* Header row: User photo, Category icon, Type badge */}
        <div className="flex items-center gap-2 mb-3">
          {/* User profile photo */}
          <Link to={`/profile/${gig.user_id}`} onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
            {gig.user_profile_image ? (
              <img src={gig.user_profile_image} alt={gig.username} className="w-8 h-8 rounded-full object-cover border-2 border-dark-300" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-dark-300 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </Link>
          
          {/* Category icon */}
          <span className="text-xl">{CATEGORY_ICONS[gig.category]}</span>
          
          {/* Type badge */}
          <span className={`badge ${gig.gig_type === 'looking_for' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
            {gig.gig_type === 'looking_for' ? 'Looking For' : 'Services'}
          </span>
          
          {/* View count */}
          <span className="ml-auto text-gray-500 text-sm flex items-center gap-1">
            <Eye className="w-4 h-4" /> {gig.view_count}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-1">{gig.title}</h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{gig.description}</p>
        
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to={`/profile/${gig.user_id}`} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
            @{gig.username}
          </Link>
          
          {gig.location && (
            <span className="text-gray-500 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {gig.location}
            </span>
          )}
          
          {gig.budget_range && (
            <span className="text-gray-500 flex items-center gap-1">
              <DollarSign className="w-4 h-4" /> {gig.budget_range}
            </span>
          )}
        </div>
        
        {/* Genres */}
        {gig.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {gig.genres.slice(0, 4).map(genre => (
              <span key={genre} className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">{genre}</span>
            ))}
            {gig.genres.length > 4 && (
              <span className="px-2 py-1 bg-dark-500 rounded text-xs text-gray-400">+{gig.genres.length - 4}</span>
            )}
          </div>
        )}
        
        {/* Subcategories */}
        {gig.subcategories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {gig.subcategories.slice(0, 4).map(sub => (
              <span key={sub} className="px-2 py-1 bg-dark-500 rounded text-xs text-gray-400">{sub}</span>
            ))}
            {gig.subcategories.length > 4 && (
              <span className="px-2 py-1 bg-dark-500 rounded text-xs text-gray-400">+{gig.subcategories.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Create Gig Modal Component
const CreateGigModal = ({ categories, onClose, onSuccess }) => {
  const { uploadFile, uploading } = useS3Upload();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    gig_type: 'looking_for',
    title: '',
    description: '',
    category: '',
    subcategories: [],
    genres: [],
    media: [],
    social_links: { website: '', instagram: '', facebook: '', twitter: '', youtube: '', tiktok: '', soundcloud: '', spotify: '', bandcamp: '', linkedin: '' },
    contact_email: '',
    contact_phone: '',
    location: '',
    budget_range: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [showSocialLinks, setShowSocialLinks] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const currentImages = formData.media.filter(m => m.media_type === 'image').length;
    const currentVideos = formData.media.filter(m => m.media_type === 'video').length;
    
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (isImage && currentImages >= 5) { setError('Maximum 5 photos allowed'); continue; }
      if (isVideo && currentVideos >= 5) { setError('Maximum 5 videos allowed'); continue; }
      
      try {
        const result = await uploadFile(file, 'gigs');
        if (result.url) {
          setFormData(prev => ({
            ...prev,
            media: [...prev.media, { url: result.url, media_type: isVideo ? 'video' : 'image' }]
          }));
        }
      } catch (err) { setError(`Failed to upload ${file.name}`); }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (index) => {
    setFormData(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
  };

  const toggleSubcategory = (subcat) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.includes(subcat) ? prev.subcategories.filter(s => s !== subcat) : [...prev.subcategories, subcat]
    }));
  };

  const toggleGenre = (genre) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre) ? prev.genres.filter(g => g !== genre) : [...prev.genres, genre]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const cleanSocialLinks = Object.fromEntries(Object.entries(formData.social_links).filter(([_, v]) => v.trim()));
      const submitData = { ...formData, social_links: Object.keys(cleanSocialLinks).length > 0 ? cleanSocialLinks : null };
      await gigsAPI.create(submitData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create gig');
    } finally { setLoading(false); }
  };

  const canProceedStep1 = formData.gig_type && formData.category;
  const canProceedStep2 = formData.title.length >= 5 && formData.description.length >= 20;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-400 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
        <div className="sticky top-0 bg-dark-400 px-6 py-4 border-b border-dark-300 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">
            {step === 1 && 'Post a Gig - Type & Category'}
            {step === 2 && 'Post a Gig - Details'}
            {step === 3 && 'Post a Gig - Media & Contact'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 font-medium mb-3">What type of post is this?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setFormData({ ...formData, gig_type: 'looking_for' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${formData.gig_type === 'looking_for' ? 'border-primary bg-primary/10' : 'border-dark-300 bg-dark-500 hover:border-dark-200'}`}>
                    <Search className={`w-8 h-8 mb-2 ${formData.gig_type === 'looking_for' ? 'text-primary' : 'text-gray-400'}`} />
                    <h4 className={`font-semibold ${formData.gig_type === 'looking_for' ? 'text-primary' : 'text-white'}`}>Looking For</h4>
                    <p className="text-gray-400 text-sm mt-1">Post what you need</p>
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, gig_type: 'services' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${formData.gig_type === 'services' ? 'border-primary bg-primary/10' : 'border-dark-300 bg-dark-500 hover:border-dark-200'}`}>
                    <Briefcase className={`w-8 h-8 mb-2 ${formData.gig_type === 'services' ? 'text-primary' : 'text-gray-400'}`} />
                    <h4 className={`font-semibold ${formData.gig_type === 'services' ? 'text-primary' : 'text-white'}`}>Services</h4>
                    <p className="text-gray-400 text-sm mt-1">Share what you offer</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-3">Select a category</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories?.categories?.map(cat => (
                    <button key={cat.value} type="button" onClick={() => setFormData({ ...formData, category: cat.value, subcategories: [] })}
                      className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${formData.category === cat.value ? 'border-primary bg-primary/10' : 'border-dark-300 bg-dark-500 hover:border-dark-200'}`}>
                      <span className="text-2xl">{cat.icon}</span>
                      <span className={`font-medium ${formData.category === cat.value ? 'text-primary' : 'text-white'}`}>{cat.label}</span>
                      {formData.category === cat.value && <Check className="w-5 h-5 text-primary ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              {formData.category && (
                <div>
                  <label className="block text-gray-300 font-medium mb-3">Select subcategories (optional)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-dark-500 rounded-xl">
                    {categories?.subcategories?.[formData.category]?.map(subcat => (
                      <button key={subcat} type="button" onClick={() => toggleSubcategory(subcat)}
                        className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${formData.subcategories.includes(subcat) ? 'bg-primary text-black font-medium' : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300'}`}>
                        {subcat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Genre selection */}
              <div>
                <label className="block text-gray-300 font-medium mb-3">Select music genres (optional)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 bg-dark-500 rounded-xl">
                  {categories?.genres?.map(genre => (
                    <button key={genre} type="button" onClick={() => toggleGenre(genre)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${formData.genres.includes(genre) ? 'bg-primary text-black font-medium' : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300'}`}>
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full btn btn-primary disabled:opacity-50">Continue</button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={formData.gig_type === 'looking_for' ? "e.g., Looking for a drummer for upcoming tour" : "e.g., Professional mixing and mastering services"}
                  className="w-full px-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" maxLength={200} />
                <p className="text-gray-500 text-xs mt-1">{formData.title.length}/200</p>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-2">Description *</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details..." rows={6} className="w-full px-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white resize-none" maxLength={5000} />
                <p className="text-gray-500 text-xs mt-1">{formData.description.length}/5000 (min 20)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Los Angeles, CA" className="w-full pl-10 pr-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-2">Budget/Rate</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="text" value={formData.budget_range} onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                      placeholder="e.g., $500-1000" className="w-full pl-10 pr-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(3)} disabled={!canProceedStep2} className="btn btn-primary flex-1 disabled:opacity-50">Continue</button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 font-medium mb-2">Photos & Videos (optional)</label>
                <p className="text-gray-500 text-sm mb-3">Up to 5 photos and 5 videos</p>
                
                {formData.media.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {formData.media.map((m, idx) => (
                      <div key={idx} className="relative aspect-square bg-dark-500 rounded-lg overflow-hidden">
                        {m.media_type === 'video' ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                        <button onClick={() => removeMedia(idx)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full"><X className="w-4 h-4 text-white" /></button>
                        {m.media_type === 'video' && <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/70 rounded text-xs text-white"><Video className="w-3 h-3 inline" /> Video</div>}
                      </div>
                    ))}
                  </div>
                )}
                
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" multiple className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-full py-3 border-2 border-dashed border-dark-300 rounded-xl text-gray-400 hover:text-white hover:border-primary transition-colors flex items-center justify-center gap-2">
                  {uploading ? 'Uploading...' : <><Image className="w-5 h-5" />Add Photos/Videos</>}
                </button>
                <p className="text-gray-500 text-xs mt-1">Photos: {formData.media.filter(m => m.media_type === 'image').length}/5 • Videos: {formData.media.filter(m => m.media_type === 'video').length}/5</p>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-3">Contact Information</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="Email address" className="w-full pl-10 pr-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="tel" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="Phone number" className="w-full pl-10 pr-4 py-3 bg-dark-500 border border-dark-300 rounded-xl text-white" />
                  </div>
                </div>
              </div>

              <div>
                <button type="button" onClick={() => setShowSocialLinks(!showSocialLinks)} className="flex items-center gap-2 text-gray-300 hover:text-white">
                  {showSocialLinks ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  <span className="font-medium">Social Media Links (optional)</span>
                </button>
                
                {showSocialLinks && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {[
                      { key: 'website', icon: Globe, placeholder: 'Website URL' },
                      { key: 'instagram', icon: Instagram, placeholder: 'Instagram URL' },
                      { key: 'facebook', icon: Facebook, placeholder: 'Facebook URL' },
                      { key: 'twitter', icon: Twitter, placeholder: 'Twitter/X URL' },
                      { key: 'youtube', icon: Youtube, placeholder: 'YouTube URL' },
                      { key: 'soundcloud', icon: Music, placeholder: 'SoundCloud URL' },
                      { key: 'spotify', icon: Music, placeholder: 'Spotify URL' },
                      { key: 'bandcamp', icon: Music, placeholder: 'Bandcamp URL' },
                    ].map(({ key, icon: Icon, placeholder }) => (
                      <div key={key} className="relative">
                        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input type="url" value={formData.social_links[key]} onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, [key]: e.target.value } })}
                          placeholder={placeholder} className="w-full pl-10 pr-4 py-2 bg-dark-500 border border-dark-300 rounded-lg text-white text-sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn btn-secondary flex-1">Back</button>
                <button onClick={handleSubmit} disabled={loading} className="btn btn-primary flex-1 disabled:opacity-50">{loading ? 'Posting...' : 'Post Gig'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// View Gig Modal Component
const ViewGigModal = ({ gig, isOwner, onClose, onDelete }) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const allMedia = gig.media?.length > 0 ? gig.media : [];
  const socialLinks = gig.social_links ? Object.entries(gig.social_links).filter(([_, v]) => v) : [];

  const nextMedia = () => {
    setActiveMediaIndex(prev => (prev + 1) % allMedia.length);
  };

  const prevMedia = () => {
    setActiveMediaIndex(prev => (prev - 1 + allMedia.length) % allMedia.length);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-400 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
        <div className="sticky top-0 bg-dark-400 px-6 py-4 border-b border-dark-300 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {gig.user_profile_image ? (
              <img src={gig.user_profile_image} alt={gig.username} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-dark-300 flex items-center justify-center"><User className="w-5 h-5 text-gray-500" /></div>
            )}
            <span className="text-2xl">{CATEGORY_ICONS[gig.category]}</span>
            <span className={`badge ${gig.gig_type === 'looking_for' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
              {gig.gig_type === 'looking_for' ? 'Looking For' : 'Services'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && <button onClick={onDelete} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 text-red-400"><Trash2 className="w-5 h-5" /></button>}
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="p-6">
          {/* Media Gallery - Full width with navigation */}
          {allMedia.length > 0 && (
            <div className="mb-6">
              {/* Main image/video display */}
              <div className="relative h-96 bg-dark-500 rounded-xl overflow-hidden mb-3">
                {allMedia[activeMediaIndex]?.media_type === 'video' ? (
                  <video 
                    src={allMedia[activeMediaIndex].url} 
                    controls 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={allMedia[activeMediaIndex]?.url} 
                    alt={gig.title} 
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center' }}
                  />
                )}
                
                {/* Navigation arrows */}
                {allMedia.length > 1 && (
                  <>
                    <button 
                      onClick={prevMedia}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={nextMedia}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    
                    {/* Image counter */}
                    <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 rounded-lg text-white text-sm">
                      {activeMediaIndex + 1} / {allMedia.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Thumbnail strip */}
              {allMedia.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allMedia.map((m, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        activeMediaIndex === idx ? 'border-primary scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      {m.media_type === 'video' ? (
                        <div className="w-full h-full bg-dark-600 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <h2 className="text-2xl font-bold text-white mb-2">{gig.title}</h2>
          <p className="text-primary mb-4">{CATEGORY_LABELS[gig.category]}</p>
          
          {/* Genres */}
          {gig.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {gig.genres.map(genre => <span key={genre} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">{genre}</span>)}
            </div>
          )}
          
          {/* Subcategories */}
          {gig.subcategories?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {gig.subcategories.map(sub => <span key={sub} className="px-3 py-1 bg-dark-500 rounded-full text-sm text-gray-300">{sub}</span>)}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <Link to={`/profile/${gig.user_id}`} className="flex items-center gap-2 text-primary hover:underline">
              {gig.user_profile_image ? <img src={gig.user_profile_image} alt="" className="w-6 h-6 rounded-full" /> : <User className="w-6 h-6" />}
              @{gig.username}
            </Link>
            {gig.location && <span className="text-gray-400 flex items-center gap-1"><MapPin className="w-4 h-4" /> {gig.location}</span>}
            {gig.budget_range && <span className="text-gray-400 flex items-center gap-1"><DollarSign className="w-4 h-4" /> {gig.budget_range}</span>}
            <span className="text-gray-500 flex items-center gap-1"><Eye className="w-4 h-4" /> {gig.view_count} views</span>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{gig.description}</p>
          </div>

          {(gig.contact_email || gig.contact_phone) && (
            <div className="mb-6 p-4 bg-dark-500 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-3">Contact</h3>
              <div className="flex flex-wrap gap-4">
                {gig.contact_email && <a href={`mailto:${gig.contact_email}`} className="flex items-center gap-2 text-primary hover:underline"><Mail className="w-5 h-5" />{gig.contact_email}</a>}
                {gig.contact_phone && <a href={`tel:${gig.contact_phone}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="w-5 h-5" />{gig.contact_phone}</a>}
              </div>
            </div>
          )}

          {socialLinks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Social Media</h3>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map(([key, url]) => {
                  const icons = { website: Globe, instagram: Instagram, facebook: Facebook, twitter: Twitter, youtube: Youtube, soundcloud: Music, spotify: Music, bandcamp: Music, tiktok: Music, linkedin: Briefcase };
                  const Icon = icons[key] || Globe;
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-dark-500 rounded-lg text-gray-300 hover:text-primary hover:bg-dark-400 transition-colors">
                      <Icon className="w-5 h-5" /><span className="capitalize">{key}</span><ExternalLink className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-gray-500 text-sm">Posted {new Date(gig.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
};

export default GigsPage;
