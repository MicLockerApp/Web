import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Music, Mic2, Building2, MapPin, ChevronRight, ShoppingBag, Users } from 'lucide-react';
import { listingsAPI } from '../services/api';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PromoModal from '../components/PromoModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { name: 'Guitars', icon: '🎸', color: 'from-orange-500 to-red-500' },
  { name: 'Bass', icon: '🎸', color: 'from-purple-500 to-indigo-500' },
  { name: 'Keyboards & Synths', icon: '🎹', color: 'from-blue-500 to-cyan-500' },
  { name: 'Drums & Percussion', icon: '🥁', color: 'from-red-500 to-pink-500' },
  { name: 'Microphones', icon: '🎤', color: 'from-green-500 to-emerald-500' },
  { name: 'Pro Audio', icon: '🎚️', color: 'from-yellow-500 to-orange-500' },
  { name: 'DJ Equipment', icon: '💿', color: 'from-pink-500 to-purple-500' },
  { name: 'Effects Pedals', icon: '🎛️', color: 'from-cyan-500 to-blue-500' },
];

// Animated counter component
const AnimatedCounter = ({ target, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return <span>{count.toLocaleString()}</span>;
};

const HomePage = () => {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [featuredListings, setFeaturedListings] = useState([]);
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [promoEligible, setPromoEligible] = useState(false);
  const [promoSpotsRemaining, setPromoSpotsRemaining] = useState(100);
  const [showPromoModal, setShowPromoModal] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const [featured, recent, stats] = await Promise.all([
          listingsAPI.getFeatured(8),
          listingsAPI.getRecent(12),
          listingsAPI.getCount()
        ]);
        setFeaturedListings(featured.data.listings || []);
        setRecentListings(recent.data.listings || []);
        setActiveListingsCount(stats.data.active_listings || 0);
        setTotalUsersCount(stats.data.total_users || 0);
        setPromoEligible(stats.data.promo_eligible || false);
        setPromoSpotsRemaining(stats.data.promo_spots_remaining || 0);
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  // Show promo modal for non-authenticated users on first visit
  useEffect(() => {
    if (!loading && !isAuthenticated && promoEligible) {
      // Check if user has seen the promo modal in this session
      const hasSeenPromo = sessionStorage.getItem('miclocker_promo_seen');
      
      if (!hasSeenPromo) {
        // Small delay for better UX - let the page load first
        const timer = setTimeout(() => {
          setShowPromoModal(true);
          sessionStorage.setItem('miclocker_promo_seen', 'true');
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [loading, isAuthenticated, promoEligible]);

  const handleClosePromoModal = () => {
    setShowPromoModal(false);
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Promo Modal */}
      <PromoModal 
        isOpen={showPromoModal} 
        onClose={handleClosePromoModal}
        spotsRemaining={promoSpotsRemaining}
      />

      {/* Hero Section */}
      <section className={`relative py-20 px-4 overflow-hidden ${isDark ? '' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
        {isDark && <div className="absolute inset-0 bg-gradient-to-br from-dark-600 via-dark-500 to-dark-600" />}
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            By Music Pros. <span className="text-primary">For Music Pros.</span>
          </h1>
          <p className={`text-xl mb-8 max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            The gold standard of the music industry
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/search" className="btn btn-primary px-8 py-3 text-lg">
              Browse Gear
            </Link>
            <Link to="/sell" className="btn btn-outline px-8 py-3 text-lg">
              Sell Your Gear
            </Link>
          </div>
          
          {/* Stats - Reordered: Users, Listings, Platform Fee, Satisfaction */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-2xl mx-auto">
            <div>
              <p className="text-3xl font-bold text-primary">
                <AnimatedCounter target={totalUsersCount} duration={2500} />
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Active Users</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">
                <AnimatedCounter target={activeListingsCount} duration={2500} />
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Active Listings</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">3%</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Platform Fee</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">100%</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className={`py-16 px-4 ${isDark ? 'bg-dark-500' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Shop by Category</h2>
            <Link to="/search" className="text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((category) => (
              <Link
                key={category.name}
                to={`/search?category=${encodeURIComponent(category.name)}`}
                className={`rounded-xl p-6 text-center transition-colors group ${
                  isDark 
                    ? 'bg-dark-400 hover:bg-dark-300' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
                data-testid={`category-${category.name}`}
              >
                <span className="text-4xl mb-3 block">{category.icon}</span>
                <span className={`font-medium group-hover:text-primary transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className={`py-16 px-4 ${isDark ? '' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Trending Gear</h2>
            <Link to="/search?sort=popular" className="text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <LoadingSpinner />
          ) : featuredListings.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p>No featured listings yet. Be the first to list!</p>
              <Link to="/sell" className="btn btn-primary mt-4">List Your Gear</Link>
            </div>
          )}
        </div>
      </section>

      {/* Recent Listings */}
      <section className={`py-16 px-4 ${isDark ? 'bg-dark-500' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recently Listed</h2>
            <Link to="/search?sort=newest" className="text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <LoadingSpinner />
          ) : recentListings.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recentListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p>No listings yet. Be the first!</p>
            </div>
          )}
        </div>
      </section>

      {/* User Types */}
      <section className={`py-16 px-4 ${isDark ? '' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-2xl font-bold text-center mb-12 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            A Marketplace for Everyone
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { icon: Music, title: 'Musicians', desc: 'Buy and sell instruments, gear, and accessories' },
              { icon: Mic2, title: 'Audio Engineers', desc: 'Find professional recording and mixing equipment' },
              { icon: Building2, title: 'Studios', desc: 'Upgrade your studio with quality gear' },
              { icon: MapPin, title: 'Venues', desc: 'Source sound systems and stage equipment' },
              { icon: ShoppingBag, title: 'Merchants', desc: 'Sell apparel, accessories, and music merchandise' },
            ].map((item, index) => (
              <div key={index} className={`rounded-xl p-6 text-center ${
                isDark 
                  ? 'bg-dark-400' 
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}>
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 px-4 ${isDark ? 'bg-gradient-to-r from-primary/20 to-primary/5' : 'bg-gradient-to-r from-yellow-50 to-orange-50'}`}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Ready to Start Selling?
          </h2>
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            List your gear in minutes and reach thousands of potential buyers. 
            {promoEligible ? (
              <span className="block mt-2 text-primary font-semibold">
                🎁 Sign up now and get 0% platform fees for LIFE! Only {promoSpotsRemaining} spots remaining!
              </span>
            ) : (
              ' Only 3% platform fee on completed sales.'
            )}
          </p>
          <Link to="/register" className="btn btn-primary px-8 py-3 text-lg">
            Create Your Account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
