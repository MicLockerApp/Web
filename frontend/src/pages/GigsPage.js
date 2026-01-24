/**
 * GigsPage - Gig Board Main Page
 * 
 * Displays the gig board with:
 * - Tab switcher (Looking For / Services)
 * - Search and multi-select filters
 * - Grid of gig cards
 * - Create and view gig modals
 * 
 * Components extracted to /components/gigs/:
 * - GigCard: Individual gig display with image slider
 * - CreateGigModal: Multi-step gig creation form
 * - ViewGigModal: Full gig detail view
 * 
 * UI/UX: Unchanged - pure code reorganization
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gigsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { GigCard, CreateGigModal, ViewGigModal, CATEGORY_ICONS, CATEGORY_LABELS } from '../components/gigs';
import {
  List, Search, Filter, Plus, X, ChevronDown, ChevronUp,
  User, Eye, Trash2, Check, Music, Briefcase
} from 'lucide-react';

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
                : `Be the first to post ${activeTab === 'looking_for' ? "what you're looking for" : 'your services'}!`}
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

export default GigsPage;
