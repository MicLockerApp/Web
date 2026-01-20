import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, MessageSquare, Calendar, Music, Mic2, Building2, Package, Mail, Phone, Globe, ShoppingBag } from 'lucide-react';
import { usersAPI, listingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ListingCard from '../components/ListingCard';
import StarRating from '../components/StarRating';

// Social media icons component
const SocialIcon = ({ platform }) => {
  const icons = {
    instagram: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    twitter: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    facebook: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    youtube: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    soundcloud: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899 1.465c-.053 0-.09.037-.094.094L0 14.48l.182.69c.008.058.042.095.094.095.05 0 .085-.04.094-.094l.205-.69-.205-.696c-.009-.057-.044-.094-.094-.094zm1.83-1.203c-.059 0-.105.051-.111.109l-.219 1.888.219 1.827c.006.06.052.108.111.108.061 0 .105-.048.113-.108l.248-1.827-.248-1.888c-.008-.06-.052-.109-.113-.109zm.924-.456c-.066 0-.117.06-.123.121l-.206 2.343.206 2.246c.006.067.057.12.123.12.064 0 .115-.053.123-.12l.234-2.246-.234-2.343c-.008-.064-.059-.121-.123-.121zm1.111.543c-.073 0-.128.063-.136.136l-.165 1.664.165 2.173c.008.073.063.133.136.133.07 0 .127-.06.134-.133l.188-2.173-.188-1.664c-.007-.073-.064-.136-.134-.136zm.887-.583c-.078 0-.143.072-.148.15l-.157 2.248.157 2.194c.005.08.07.15.148.15.08 0 .145-.072.15-.15l.177-2.194-.177-2.248c-.005-.078-.07-.15-.15-.15zm.967-.085c-.085 0-.156.079-.16.16l-.145 2.332.145 2.196c.004.085.075.16.16.16.085 0 .156-.075.16-.16l.166-2.196-.166-2.332c-.004-.084-.075-.16-.16-.16zm.974-.2c-.091 0-.166.084-.17.177l-.134 2.532.134 2.187c.004.093.08.177.17.177.09 0 .166-.084.171-.177l.152-2.187-.152-2.532c-.005-.093-.081-.177-.171-.177zm.993.116c-.098 0-.18.09-.183.188l-.124 2.227.124 2.192c.003.098.085.19.183.19.098 0 .18-.09.186-.19l.14-2.192-.14-2.227c-.006-.098-.088-.188-.186-.188zm1.018-.412c-.105 0-.193.096-.199.203l-.112 2.637.112 2.188c.006.107.094.2.2.2.103 0 .191-.093.197-.2l.127-2.188-.127-2.637c-.006-.107-.094-.203-.198-.203zm.986-.046c-.112 0-.203.102-.208.215l-.103 2.683.103 2.184c.005.112.096.215.208.215.11 0 .2-.103.208-.215l.116-2.184-.116-2.683c-.008-.113-.098-.215-.208-.215zm1.003-.119c-.117 0-.214.11-.217.228l-.093 2.802.093 2.178c.003.12.1.228.217.228.118 0 .214-.108.22-.228l.104-2.178-.104-2.802c-.006-.12-.102-.228-.22-.228zm2.078-.51c-.133 0-.242.116-.248.25l-.068 3.313.068 2.165c.006.135.115.249.248.249.134 0 .243-.114.25-.249l.078-2.165-.078-3.312c-.007-.135-.116-.251-.25-.251zm1.03.185c-.14 0-.255.12-.26.261l-.056 3.126.056 2.159c.005.143.12.262.26.262.139 0 .254-.12.26-.262l.063-2.159-.063-3.126c-.006-.14-.121-.261-.26-.261zm.982-.174c-.144 0-.264.126-.27.272l-.046 3.3.046 2.154c.006.147.126.27.27.27.146 0 .265-.123.272-.27l.052-2.154-.052-3.3c-.007-.146-.126-.272-.272-.272zm3.113-.93c-.093 0-.18.02-.262.051-.173-2.003-1.869-3.575-3.94-3.575-.494 0-.976.09-1.418.254-.162.06-.218.126-.218.249v7.026c0 .13.097.24.224.248.006 0 5.622.005 5.622.005 1.13 0 2.046-.914 2.046-2.042 0-1.128-.915-2.042-2.046-2.042l-.008-.174z"/>
      </svg>
    ),
    spotify: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  };
  return icons[platform] || null;
};

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings');

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, listingsRes, reviewsRes] = await Promise.all([
          usersAPI.getProfile(id),
          usersAPI.getUserListings(id, { limit: 12 }),
          usersAPI.getUserReviews(id, { limit: 10 }),
        ]);
        setProfile(profileRes.data);
        setListings(listingsRes.data.listings || []);
        setReviews(reviewsRes.data.reviews || []);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!profile) return <div className="text-center py-16 text-gray-400">Profile not found</div>;

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'musician': return Music;
      case 'audio_engineer': return Mic2;
      case 'recording_studio': return Building2;
      case 'venue': return MapPin;
      case 'merchant': return ShoppingBag;
      default: return Music;
    }
  };

  const getCategoryLabel = (cat) => {
    return cat?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
  };

  const CategoryIcon = getCategoryIcon(profile.category);

  // Check if user has any contact info that they've opted to show
  const hasContactInfo = (profile.show_email && profile.email) || 
    (profile.show_phone && profile.phone) || 
    profile.website || 
    (profile.show_social && (profile.instagram || profile.twitter || profile.facebook || 
      profile.youtube || profile.soundcloud || profile.spotify));

  // Check if user has any social media they've opted to show
  const hasSocialMedia = profile.show_social && (profile.instagram || profile.twitter || profile.facebook || 
    profile.youtube || profile.soundcloud || profile.spotify);

  // Build formatted address from shipping_address
  const formattedAddress = profile.show_address && profile.shipping_address ? (() => {
    const addr = profile.shipping_address;
    const parts = [];
    if (addr.address_line1) parts.push(addr.address_line1);
    if (addr.address_line2) parts.push(addr.address_line2);
    if (addr.city || addr.state || addr.postal_code) {
      const cityStateParts = [];
      if (addr.city) cityStateParts.push(addr.city);
      if (addr.state) cityStateParts.push(addr.state);
      if (addr.postal_code) cityStateParts.push(addr.postal_code);
      parts.push(cityStateParts.join(', '));
    }
    if (addr.country) parts.push(addr.country);
    return parts.join(' • ');
  })() : null;

  // Build formatted physical address
  const formattedPhysicalAddress = profile.show_physical_address && profile.physical_address ? (() => {
    const addr = profile.physical_address;
    const parts = [];
    if (addr.address_line1) parts.push(addr.address_line1);
    if (addr.address_line2) parts.push(addr.address_line2);
    if (addr.city || addr.state || addr.postal_code) {
      const cityStateParts = [];
      if (addr.city) cityStateParts.push(addr.city);
      if (addr.state) cityStateParts.push(addr.state);
      if (addr.postal_code) cityStateParts.push(addr.postal_code);
      parts.push(cityStateParts.join(', '));
    }
    if (addr.country) parts.push(addr.country);
    return parts.join(', ');
  })() : null;

  // Build Google Maps query for physical address
  const googleMapsQuery = profile.show_physical_address && profile.physical_address ? (() => {
    const addr = profile.physical_address;
    const parts = [];
    if (addr.address_line1) parts.push(addr.address_line1);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.postal_code) parts.push(addr.postal_code);
    if (addr.country) parts.push(addr.country);
    return encodeURIComponent(parts.join(', '));
  })() : null;

  const GOOGLE_MAPS_API_KEY = 'AIzaSyBzqrdVWl7XQRUv6yID3vIAEAwdr6p1mBY';

  return (
    <div className="min-h-screen" data-testid="profile-page">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className={`rounded-xl p-6 md:p-8 mb-8 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt={profile.username}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover"
                />
              ) : (
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-300' : 'bg-gray-200'}`}>
                  <span className="text-4xl md:text-5xl font-bold text-primary">
                    {profile.username?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{profile.username}</h1>
                {profile.category && (
                  <span className="badge badge-primary flex items-center gap-1">
                    <CategoryIcon className="w-3 h-3" />
                    {getCategoryLabel(profile.category)}
                  </span>
                )}
              </div>

              {/* Sub-categories */}
              {profile.sub_categories && profile.sub_categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.sub_categories.map(subCat => {
                    const SubCatIcon = getCategoryIcon(subCat);
                    return (
                      <span key={subCat} className={`badge flex items-center gap-1 ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        <SubCatIcon className="w-3 h-3" />
                        {getCategoryLabel(subCat)}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <StarRating rating={profile.rating || 0} showValue totalReviews={profile.review_count} />
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>· {profile.total_sales} sales</span>
                {/* Lifetime Free Fees Badge - only visible on own profile */}
                {isOwnProfile && currentUser?.has_lifetime_free_fees && (
                  <span className="badge bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    0% Platform Fees For Life
                  </span>
                )}
              </div>

              {/* Location & Member Since */}
              <div className={`flex flex-wrap gap-4 text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{profile.bio}</p>
              )}

              {/* Category Specific Info */}
              {profile.category === 'musician' && profile.instruments?.length > 0 && (
                <div className="mb-4">
                  <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {profile.genre && <span className="text-primary">{profile.genre}</span>}
                    {profile.genre && ' · '}
                    Instruments:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.instruments.map(inst => (
                      <span key={inst} className={`badge ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>{inst}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.category === 'audio_engineer' && profile.specializations?.length > 0 && (
                <div className="mb-4">
                  <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Specializations:</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.specializations.slice(0, 5).map(spec => (
                      <span key={spec} className={`badge ${isDark ? 'bg-dark-300 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>{spec}</span>
                    ))}
                    {profile.specializations.length > 5 && (
                      <span className={`badge ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>+{profile.specializations.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}

              {profile.category === 'merchant' && profile.business_name && (
                <div className="mb-4">
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Business: <span className={isDark ? 'text-white' : 'text-gray-900'}>{profile.business_name}</span></p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {!isOwnProfile && (
                <Link
                  to={`/messages?to=${profile.id}`}
                  className="btn btn-primary"
                  data-testid="message-seller-button"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </Link>
              )}
              {isOwnProfile && (
                <Link to="/settings" className="btn btn-secondary">
                  Edit Profile
                </Link>
              )}
            </div>
          </div>

          {/* Contact Information Section */}
          {(hasContactInfo || formattedAddress) && (
            <div className={`mt-6 pt-6 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.show_email && profile.email && (
                  <a href={`mailto:${profile.email}`} className={`flex items-center gap-3 hover:text-primary transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Mail className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span>{profile.email}</span>
                  </a>
                )}
                {profile.show_phone && profile.phone && (
                  <a href={`tel:${profile.phone}`} className={`flex items-center gap-3 hover:text-primary transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Phone className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span>{profile.phone}</span>
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 hover:text-primary transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <Globe className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span>{profile.website}</span>
                  </a>
                )}
              </div>

              {/* Show formatted address if enabled */}
              {formattedAddress && (
                <div className="mt-4">
                  <div className={`flex items-center gap-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <MapPin className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span>{formattedAddress}</span>
                  </div>
                </div>
              )}

              {/* Social Media Links */}
              {hasSocialMedia && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {profile.instagram && (
                    <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:text-pink-500 ${isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} title="Instagram">
                      <SocialIcon platform="instagram" />
                    </a>
                  )}
                  {profile.twitter && (
                    <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:text-blue-400 ${isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} title="Twitter/X">
                      <SocialIcon platform="twitter" />
                    </a>
                  )}
                  {profile.facebook && (
                    <a href={`https://facebook.com/${profile.facebook}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:text-blue-600 ${isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} title="Facebook">
                      <SocialIcon platform="facebook" />
                    </a>
                  )}
                  {profile.youtube && (
                    <a href={`https://youtube.com/${profile.youtube}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:text-red-500 ${isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} title="YouTube">
                      <SocialIcon platform="youtube" />
                    </a>
                  )}
                  {profile.soundcloud && (
                    <a href={`https://soundcloud.com/${profile.soundcloud}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:text-orange-500 ${isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} title="SoundCloud">
                      <SocialIcon platform="soundcloud" />
                    </a>
                  )}
                  {profile.spotify && (
                    <a href={`https://open.spotify.com/artist/${profile.spotify}`} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:text-green-500 ${isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`} title="Spotify">
                      <SocialIcon platform="spotify" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Physical Address Section with Google Map */}
          {formattedPhysicalAddress && googleMapsQuery && (
            <div className={`mt-6 pt-6 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <MapPin className="w-5 h-5 text-primary" />
                Physical Location
              </h3>
              <div className={`flex items-center gap-3 mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <span>{formattedPhysicalAddress}</span>
              </div>
              <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
                <iframe
                  title="Physical Location Map"
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${googleMapsQuery}`}
                />
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${googleMapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline mt-2 inline-block"
              >
                View on Google Maps →
              </a>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className={`flex gap-4 border-b mb-8 ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'listings'
                ? 'text-primary border-b-2 border-primary'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Listings ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'reviews'
                ? 'text-primary border-b-2 border-primary'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Star className="w-4 h-4 inline mr-2" />
            Reviews ({reviews.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'listings' && (
          <div>
            {listings.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No listings yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {/* Review Stats Summary */}
            <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {profile.rating?.toFixed(1) || '0.0'}
                  </p>
                  <div className="flex justify-center my-1">
                    <StarRating rating={profile.rating || 0} size={16} />
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Overall ({profile.review_count || 0} reviews)
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold text-green-500`}>
                    {profile.seller_rating?.toFixed(1) || 'N/A'}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    As Seller ({profile.seller_review_count || 0})
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold text-blue-500`}>
                    {profile.buyer_rating?.toFixed(1) || 'N/A'}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    As Buyer ({profile.buyer_review_count || 0})
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <div className="flex items-start gap-4">
                      <Link 
                        to={`/profile/${review.reviewer_id}`}
                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-dark-300 hover:bg-dark-200' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                      >
                        <span className="font-bold text-lg text-primary">
                          {review.reviewer_username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </Link>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Link 
                            to={`/profile/${review.reviewer_id}`}
                            className={`font-medium hover:text-primary ${isDark ? 'text-white' : 'text-gray-900'}`}
                          >
                            {review.reviewer_username || 'Unknown'}
                          </Link>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            review.reviewer_role === 'buyer' 
                              ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                              : isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                          }`}>
                            {review.reviewer_role === 'buyer' ? 'Buyer' : 'Seller'}
                          </span>
                          <StarRating rating={review.rating} size={14} />
                        </div>
                        <p className={`text-sm mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Transaction: {review.listing_title}
                        </p>
                        {review.comment && (
                          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            &ldquo;{review.comment}&rdquo;
                          </p>
                        )}
                        <p className={`text-sm mt-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                          {new Date(review.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No reviews yet</p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Reviews appear here after completed transactions
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
