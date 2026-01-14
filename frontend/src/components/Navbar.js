import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, MessageSquare, LogOut, Settings, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import VinylLogo from './VinylLogo';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
    <nav className="sticky top-0 z-50 bg-dark-600 border-b border-dark-300">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <VinylLogo size={36} spinning={true} />
            <span className="text-xl font-bold text-white hidden sm:block">MicLocker</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for gear..."
                className="w-full pl-10 pr-4 py-2 bg-dark-400 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:border-primary focus:outline-none"
                data-testid="search-input"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
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
                <Link to="/messages" className="p-2 text-gray-400 hover:text-white" data-testid="messages-link">
                  <MessageSquare className="w-5 h-5" />
                </Link>
                <Link to="/cart" className="p-2 text-gray-400 hover:text-white relative" data-testid="cart-link">
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
                    className="flex items-center gap-2 p-2 text-gray-400 hover:text-white"
                    data-testid="user-menu-button"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-sm">{user?.username}</span>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-dark-400 border border-dark-300 rounded-lg shadow-xl py-2">
                      <Link
                        to={`/profile/${user?.id}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-dark-300 hover:text-white"
                        data-testid="profile-link"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-dark-300 hover:text-white"
                        data-testid="dashboard-link"
                      >
                        <Package className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-dark-300 hover:text-white"
                        data-testid="settings-link"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      {user?.is_admin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-primary hover:bg-dark-300"
                          data-testid="admin-link"
                        >
                          <Settings className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <hr className="my-2 border-dark-300" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-dark-300 w-full text-left"
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
            className="md:hidden p-2 text-gray-400 hover:text-white"
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
                placeholder="Search for gear..."
                className="w-full pl-10 pr-4 py-2 bg-dark-400 border border-dark-300 rounded-lg text-white placeholder-gray-500 focus:border-primary focus:outline-none"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            </div>
          </form>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-dark-300 pt-4">
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
                    className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Cart {cart.item_count > 0 && `(${cart.item_count})`}
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Messages
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white"
                  >
                    <Package className="w-5 h-5" />
                    Dashboard
                  </Link>
                  <Link
                    to={`/profile/${user?.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white"
                  >
                    <User className="w-5 h-5" />
                    Profile
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </>
              ) : (
                <>
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
