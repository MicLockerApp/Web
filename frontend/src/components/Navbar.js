import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, MessageSquare, LogOut, Package, Edit, Heart, Sun, Moon, Tag, ShoppingBag, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { messagesAPI, searchAPI } from '../services/api';
import VinylLogo from './VinylLogo';
import AnimatedSearchPlaceholder from './AnimatedSearchPlaceholder';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { cart } = useCart();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Search dropdown state
  const [searchResults, setSearchResults] = useState({ listings: [], users: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Fetch unread message count when authenticated
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!isAuthenticated) {
        setUnreadCount(0);
        return;
      }
      try {
        const response = await messagesAPI.getUnreadCount();
        setUnreadCount(response.data.unread_count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Handle search input with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults({ listings: [], users: [] });
      setShowSearchDropdown(false);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await searchAPI.globalSearch(searchQuery, 5);
        setSearchResults(response.data);
        setShowSearchDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowSearchDropdown(false);
    }
  };

  const handleResultClick = () => {
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  // Only count user results if authenticated
  const hasResults = searchResults.listings.length > 0 || (isAuthenticated && searchResults.users.length > 0);

  return (
    <nav className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
      isDark 
        ? 'bg-dark-600 border-dark-300' 
        : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Always show MicLocker text */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <VinylLogo size={36} spinning={true} />
            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              MicLocker
            </span>
          </Link>

          {/* Search Bar with Dropdown */}
          <div ref={searchRef} className="relative flex-1 max-w-xl mx-4 hidden md:block">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => hasResults && setShowSearchDropdown(true)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary transition-colors ${
                    isDark 
                      ? 'bg-dark-400 border border-dark-300 text-white' 
                      : 'bg-gray-100 border border-gray-200 text-gray-900'
                  }`}
                  data-testid="search-input"
                />
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                {/* Animated Placeholder */}
                {!searchQuery && (
                  <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none">
                    <AnimatedSearchPlaceholder isDark={isDark} />
                  </div>
                )}
              </div>
            </form>

            {/* Search Dropdown Results */}
            {showSearchDropdown && (searchQuery.trim().length >= 2) && (
              <div className={`absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden z-50 ${
                isDark ? 'bg-dark-400 border border-dark-300' : 'bg-white border border-gray-200'
              }`}>
                {searchLoading ? (
                  <div className={`p-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Searching...
                  </div>
                ) : !hasResults ? (
                  <div className={`p-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <>
                    {/* Users Section - Only show if authenticated and has results */}
                    {isAuthenticated && searchResults.users.length > 0 && (
                      <div>
                        <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                          isDark ? 'bg-dark-500 text-gray-400' : 'bg-gray-100 text-gray-500'
                        }`}>
                          Users
                        </div>
                        {searchResults.users.map((user) => (
                          <Link
                            key={user.id}
                            to={`/profile/${user.id}`}
                            onClick={handleResultClick}
                            className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                              isDark 
                                ? 'hover:bg-dark-300' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {user.profile_image ? (
                                <img src={user.profile_image} alt={user.username} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                @{user.username}
                              </p>
                              <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {user.category ? user.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Member'}
                                {user.rating > 0 && ` · ⭐ ${user.rating.toFixed(1)}`}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Listings Section */}
                    {searchResults.listings.length > 0 && (
                      <div>
                        <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                          isDark ? 'bg-dark-500 text-gray-400' : 'bg-gray-100 text-gray-500'
                        }`}>
                          Gear
                        </div>
                        {searchResults.listings.map((listing) => (
                          <Link
                            key={listing.id}
                            to={`/listing/${listing.id}`}
                            onClick={handleResultClick}
                            className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                              isDark 
                                ? 'hover:bg-dark-300' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-10 h-10 rounded bg-dark-300 flex-shrink-0 overflow-hidden">
                              {listing.images && listing.images.length > 0 ? (
                                <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {listing.title}
                              </p>
                              <p className="text-sm text-primary font-semibold">
                                ${listing.price?.toLocaleString()}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* View All Results */}
                    <Link
                      to={`/search?q=${encodeURIComponent(searchQuery)}`}
                      onClick={handleResultClick}
                      className={`block px-3 py-3 text-center text-sm font-medium border-t transition-colors ${
                        isDark 
                          ? 'border-dark-300 text-primary hover:bg-dark-300' 
                          : 'border-gray-200 text-primary hover:bg-gray-50'
                      }`}
                    >
                      View all results for &quot;{searchQuery}&quot;
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/sell"
              className="btn btn-primary text-sm"
              data-testid="sell-button"
            >
              Sell Your Gear
            </Link>

            {isAuthenticated ? (
              <>
                <Link to="/messages" className={`p-2 relative ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} data-testid="messages-link">
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/cart" className={`p-2 relative ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} data-testid="cart-link">
                  <ShoppingCart className="w-5 h-5" />
                  {cart.item_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-black text-xs font-bold rounded-full flex items-center justify-center">
                      {cart.item_count}
                    </span>
                  )}
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center gap-2 p-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    data-testid="user-menu-button"
                  >
                    <User className="w-5 h-5" />
                  </button>
                  {userMenuOpen && (
                    <div className={`absolute right-0 mt-2 w-64 rounded-lg shadow-lg overflow-hidden ${
                      isDark ? 'bg-dark-400 border border-dark-300' : 'bg-white border border-gray-200'
                    }`}>
                      <div className={`px-4 py-3 border-b ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.username}</p>
                        <p className={`text-sm break-all ${isDark ? 'text-gray-400' : 'text-gray-500'}`} title={user?.email}>{user?.email}</p>
                      </div>
                      <Link
                        to={`/profile/${user?.id}`}
                        className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:bg-dark-300' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </Link>
                      <Link
                        to="/edit-profile"
                        className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:bg-dark-300' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </Link>
                      <Link
                        to="/dashboard"
                        className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:bg-dark-300' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <Link
                        to="/orders"
                        className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:bg-dark-300' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Orders
                      </Link>
                      <Link
                        to="/offers"
                        className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:bg-dark-300' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Tag className="w-4 h-4" />
                        Offers
                      </Link>
                      <Link
                        to="/favorites"
                        className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:bg-dark-300' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Heart className="w-4 h-4" />
                        Favorites
                      </Link>
                      {/* Theme Toggle */}
                      <button
                        onClick={() => {
                          toggleTheme();
                          setUserMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 w-full text-left ${isDark ? 'text-gray-300 hover:bg-dark-300' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {isDark ? 'Light Mode' : 'Dark Mode'}
                      </button>
                      {user?.is_admin && (
                        <Link
                          to="/admin"
                          className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-primary hover:bg-dark-300' : 'text-primary hover:bg-gray-50'}`}
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className={`flex items-center gap-2 px-4 py-2 w-full text-left text-red-400 ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-50'}`}
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Theme Toggle for non-authenticated users */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <Link to="/login" className={isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-outline text-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden p-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-dark-400 border border-dark-300 text-white' 
                    : 'bg-gray-100 border border-gray-200 text-gray-900'
                }`}
                data-testid="mobile-search-input"
              />
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              {!searchQuery && (
                <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none">
                  <AnimatedSearchPlaceholder isDark={isDark} />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden py-4 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
            <div className="flex flex-col gap-2">
              <Link
                to="/sell"
                className="btn btn-primary text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sell Your Gear
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/messages"
                    className={`flex items-center gap-2 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageSquare className="w-5 h-5" />
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/cart"
                    className={`flex items-center gap-2 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Cart
                    {cart.item_count > 0 && (
                      <span className="ml-auto bg-primary text-black text-xs px-2 py-0.5 rounded-full">
                        {cart.item_count}
                      </span>
                    )}
                  </Link>
                  <Link
                    to={`/profile/${user?.id}`}
                    className={`flex items-center gap-2 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    My Profile
                  </Link>
                  <Link
                    to="/my-listings"
                    className={`flex items-center gap-2 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Package className="w-5 h-5" />
                    My Listings
                  </Link>
                  {user?.is_admin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 py-2 text-primary font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="w-5 h-5" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      toggleTheme();
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 py-2 w-full text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 py-2 text-red-400"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      toggleTheme();
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 py-2 w-full text-left ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <Link
                    to="/login"
                    className={`py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-outline text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
