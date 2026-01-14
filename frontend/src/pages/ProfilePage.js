import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, MessageSquare, Calendar, Music, Mic2, Building2, Package } from 'lucide-react';
import { usersAPI, listingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ListingCard from '../components/ListingCard';
import StarRating from '../components/StarRating';

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
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

  const getCategoryIcon = () => {
    switch (profile.category) {
      case 'musician': return Music;
      case 'audio_engineer': return Mic2;
      case 'recording_studio': return Building2;
      case 'venue': return MapPin;
      default: return Music;
    }
  };
  const CategoryIcon = getCategoryIcon();

  return (
    <div className="min-h-screen" data-testid="profile-page">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-dark-400 rounded-xl p-6 md:p-8 mb-8">
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
                <div className="w-24 h-24 md:w-32 md:h-32 bg-dark-300 rounded-full flex items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-primary">
                    {profile.username?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{profile.username}</h1>
                {profile.category && (
                  <span className="badge badge-primary flex items-center gap-1">
                    <CategoryIcon className="w-3 h-3" />
                    {profile.category.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <StarRating rating={profile.rating || 0} showValue totalReviews={profile.review_count} />
                <span className="text-gray-400">· {profile.total_sales} sales</span>
              </div>

              {/* Location & Member Since */}
              <div className="flex flex-wrap gap-4 text-gray-400 text-sm mb-4">
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
                <p className="text-gray-300">{profile.bio}</p>
              )}

              {/* Category Specific Info */}
              {profile.category === 'musician' && profile.instruments?.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">Instruments:</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.instruments.map(inst => (
                      <span key={inst} className="badge bg-dark-300 text-gray-300">{inst}</span>
                    ))}
                  </div>
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
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-dark-300 mb-8">
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'listings'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-400 hover:text-white'
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
                : 'text-gray-400 hover:text-white'
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
              <div className="text-center py-12 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No listings yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-dark-400 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-dark-300 rounded-full flex items-center justify-center">
                        <span className="font-bold text-primary">
                          {review.buyer_username?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white font-medium">{review.buyer_username}</span>
                          <StarRating rating={review.rating} size={14} />
                        </div>
                        <p className="text-gray-400 text-sm mb-2">
                          For: {review.listing_title}
                        </p>
                        {review.comment && (
                          <p className="text-gray-300">{review.comment}</p>
                        )}
                        <p className="text-gray-500 text-sm mt-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No reviews yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
