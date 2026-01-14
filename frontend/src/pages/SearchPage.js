import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { listingsAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORIES = [
  'Guitars', 'Bass', 'Keyboards & Synths', 'Drums & Percussion',
  'Pro Audio', 'Recording Equipment', 'Microphones', 'DJ Equipment',
  'Studio Monitors', 'Headphones', 'Cables & Connectors', 'Effects Pedals',
  'Amplifiers', 'Wind Instruments', 'String Instruments', 'Accessories'
];

const CONDITIONS = ['Brand New', 'Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDark } = useTheme();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    condition: searchParams.get('condition') || '',
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
    sortBy: searchParams.get('sort_by') || 'created_at',
    page: parseInt(searchParams.get('page') || '1'),
  });

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const params = {
          page: filters.page,
          limit: 24,
        };
        if (filters.q) params.q = filters.q;
        if (filters.category) params.category = filters.category;
        if (filters.condition) params.condition = filters.condition;
        if (filters.minPrice) params.min_price = parseFloat(filters.minPrice);
        if (filters.maxPrice) params.max_price = parseFloat(filters.maxPrice);
        if (filters.sortBy) params.sort_by = filters.sortBy;

        const response = await listingsAPI.search(params);
        setListings(response.data.listings || []);
        setTotalResults(response.data.total || 0);
        setTotalPages(response.data.pages || 1);
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [filters]);

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);

    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && v !== '') params.set(k === 'minPrice' ? 'min_price' : k === 'maxPrice' ? 'max_price' : k === 'sortBy' ? 'sort_by' : k, v);
    });
    setSearchParams(params);
  };

  const clearFilters = () => {
    const newFilters = {
      q: '',
      category: '',
      condition: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'created_at',
      page: 1,
    };
    setFilters(newFilters);
    setSearchParams({});
  };

  const hasActiveFilters = filters.category || filters.condition || filters.minPrice || filters.maxPrice;

  return (
    <div className="min-h-screen" data-testid="search-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {filters.q ? `Results for "${filters.q}"` : filters.category || 'All Listings'}
            </h1>
            <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{totalResults} results found</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden btn btn-secondary"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className={`w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <div className={`rounded-xl p-6 sticky top-24 ${
              isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full text-sm"
                  data-testid="filter-category"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div className="mb-6">
                <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Condition</label>
                <select
                  value={filters.condition}
                  onChange={(e) => updateFilter('condition', e.target.value)}
                  className="w-full text-sm"
                  data-testid="filter-condition"
                >
                  <option value="">Any Condition</option>
                  {CONDITIONS.map(cond => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => updateFilter('minPrice', e.target.value)}
                    className="w-1/2 text-sm"
                    data-testid="filter-min-price"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => updateFilter('maxPrice', e.target.value)}
                    className="w-1/2 text-sm"
                    data-testid="filter-max-price"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="w-full text-sm"
                  data-testid="filter-sort"
                >
                  <option value="created_at">Newest First</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {loading ? (
              <LoadingSpinner />
            ) : listings.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => updateFilter('page', page)}
                        className={`w-10 h-10 rounded-lg ${
                          filters.page === page
                            ? 'bg-primary text-black'
                            : isDark 
                              ? 'bg-dark-400 text-gray-400 hover:bg-dark-300' 
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Search className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No listings found</h3>
                <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Try adjusting your filters or search terms</p>
                <button onClick={clearFilters} className="btn btn-primary">
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
