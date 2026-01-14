import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, MessageSquare, LogOut, Package, Edit, Heart, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { messagesAPI } from '../services/api';
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

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

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                    <span className="text-sm">{user?.username}</span>
                  </button>
                  {userMenuOpen && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-xl py-2 border ${
                      isDark 
                        ? 'bg-dark-400 border-dark-300' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <Link
                        to={`/profile/${user?.id}`}
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-2 ${
                          isDark 
                            ? 'text-gray-300 hover:bg-dark-300 hover:text-white' 
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        data-testid="profile-link"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-2 ${
                          isDark 
                            ? 'text-gray-300 hover:bg-dark-300 hover:text-white' 
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        data-testid="edit-profile-link"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </Link>
                      <Link
                        to="/favorites"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-2 ${
                          isDark 
                            ? 'text-gray-300 hover:bg-dark-300 hover:text-white' 
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        data-testid="favorites-link"
                      >
                        <Heart className="w-4 h-4" />
                        Favorites
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-2 ${
                          isDark 
                            ? 'text-gray-300 hover:bg-dark-300 hover:text-white' 
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        data-testid="dashboard-link"
                      >
                        <Package className="w-4 h-4" />
                        Dashboard
                      </Link>
                      
                      {/* Theme Toggle */}
                      <hr className={`my-2 ${isDark ? 'border-dark-300' : 'border-gray-200'}`} />
                      <button
                        onClick={() => {
                          toggleTheme();
                        }}
                        className={`flex items-center gap-2 px-4 py-2 w-full text-left ${
                          isDark 
                            ? 'text-gray-300 hover:bg-dark-300 hover:text-white' 
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        data-testid="theme-toggle"
                      >
                        {isDark ? (
                          <>
                            <Sun className="w-4 h-4 text-yellow-400" />
                            Light Mode
                          </>
                        ) : (
                          <>
                            <Moon className="w-4 h-4 text-blue-500" />
                            Dark Mode
                          </>
                        )}
                      </button>
                      
                      {user?.is_admin && (
                        <>
                          <hr className={`my-2 ${isDark ? 'border-dark-300' : 'border-gray-200'}`} />
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className={`flex items-center gap-2 px-4 py-2 text-primary hover:bg-dark-300`}
                            data-testid="admin-link"
                          >
                            <Package className="w-4 h-4" />
                            Admin Panel
                          </Link>
                        </>
                      )}
                      <hr className={`my-2 ${isDark ? 'border-dark-300' : 'border-gray-200'}`} />
                      <button
                        onClick={handleLogout}
                        className={`flex items-center gap-2 px-4 py-2 text-red-400 w-full text-left ${
                          isDark ? 'hover:bg-dark-300' : 'hover:bg-red-50'
                        }`}
                        data-testid="logout-button"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {/* Theme Toggle for non-authenticated users */}
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'text-gray-400 hover:text-white hover:bg-dark-400' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  data-testid="theme-toggle-public"
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <Link to="/login" className="btn btn-secondary text-sm" data-testid="login-link">
                  Login
                </Link>
                <Link to="/register" className="btn btn-outline text-sm" data-testid="register-link">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            data-testid="mobile-menu-button"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary ${
                  isDark 
                    ? 'bg-dark-400 border border-dark-300 text-white' 
                    : 'bg-gray-100 border border-gray-200 text-gray-900'
                }`}
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
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden pb-4 pt-4 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
            <div className="flex flex-col gap-2">
              <Link
                to="/sell"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary w-full"
              >
                Sell Your Gear
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Cart {cart.item_count > 0 && `(${cart.item_count})`}
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/favorites"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                  >
                    <Heart className="w-5 h-5" />
                    Favorites
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                  >
                    <Package className="w-5 h-5" />
                    Dashboard
                  </Link>
                  <Link
                    to={`/profile/${user?.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                  >
                    <User className="w-5 h-5" />
                    Profile
                  </Link>
                  
                  {/* Mobile Theme Toggle */}
                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className={`flex items-center gap-2 px-4 py-2 w-full text-left ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                  >
                    {isDark ? (
                      <>
                        <Sun className="w-5 h-5 text-yellow-400" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="w-5 h-5 text-blue-500" />
                        Dark Mode
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-2 px-4 py-2 text-red-400 ${isDark ? 'hover:text-red-300' : 'hover:text-red-500'}`}
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {/* Mobile Theme Toggle for non-authenticated */}
                  <button
                    onClick={toggleTheme}
                    className={`flex items-center gap-2 px-4 py-2 w-full text-left ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                  >
                    {isDark ? (
                      <>
                        <Sun className="w-5 h-5 text-yellow-400" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="w-5 h-5 text-blue-500" />
                        Dark Mode
                      </>
                    )}
                  </button>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-secondary w-full"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-outline w-full"
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
