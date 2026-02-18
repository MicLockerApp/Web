/**
 * LearnChannelPage - View a teaching channel
 * 
 * Features:
 * - Intro video
 * - Tabs: Free Videos | Playlists
 * - Subscription tiers
 * - Reviews section
 * - Subscribe/Follow button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Play, Star, Users, Heart, Share2, Flag, ChevronDown, 
  Lock, Unlock, Clock, Eye, MessageSquare, Check, X, Loader2, Bell
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import SignUpModal from '../components/SignUpModal';

// Video Card for free videos
const VideoCard = ({ video, isOwner }) => {
  const { isDark } = useTheme();
  
  return (
    <Link 
      to={`/learn/video/${video.id}`}
      className={`block rounded-xl overflow-hidden transition-transform hover:scale-[1.02] ${
        isDark ? 'bg-dark-500 hover:bg-dark-400' : 'bg-gray-100 hover:bg-gray-200'
      }`}
    >
      <div className="aspect-video bg-dark-600 relative">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-10 h-10 text-gray-600" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
          {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
        </div>
        {video.is_free && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-green-500 text-white text-xs font-medium">
            FREE
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className={`font-medium line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {video.title}
        </h4>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
            {video.view_count || 0} views
          </span>
        </div>
      </div>
    </Link>
  );
};

// Playlist Card with reviews
const PlaylistCard = ({ playlist, onView }) => {
  const { isDark } = useTheme();
  
  return (
    <div 
      onClick={onView}
      className={`cursor-pointer rounded-xl overflow-hidden transition-transform hover:scale-[1.02] ${
        isDark ? 'bg-dark-500 hover:bg-dark-400' : 'bg-gray-100 hover:bg-gray-200'
      }`}
    >
      <div className="aspect-video bg-dark-600 relative">
        {playlist.thumbnail_url ? (
          <img src={playlist.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-10 h-10 text-gray-600" />
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
      <div className="p-3">
        <h4 className={`font-medium line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {playlist.title}
        </h4>
        <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {playlist.description}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
            {playlist.view_count || 0} views
          </span>
          {/* Show ratings prominently for paid playlists */}
          {playlist.average_rating > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-3 h-3 fill-current" />
              {playlist.average_rating.toFixed(1)}
              {playlist.review_count > 0 && (
                <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  ({playlist.review_count})
                </span>
              )}
            </span>
          )}
          {/* Show "No reviews yet" for paid playlists without reviews */}
          {!playlist.is_free && playlist.average_rating === 0 && (
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              No reviews yet
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Subscription Tier Card - For PAID monthly subscriptions
const TierCard = ({ tier, isPurchased, onPurchase }) => {
  const { isDark } = useTheme();
  
  return (
    <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-500' : 'bg-gray-100'} ${
      tier.includes_all_content ? 'ring-2 ring-primary' : ''
    }`}>
      <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {tier.name}
      </h4>
      <div className="text-3xl font-bold text-primary my-3">
        ${tier.price_usd}<span className="text-sm font-normal">/month</span>
      </div>
      {tier.description && (
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {tier.description}
        </p>
      )}
      <ul className="space-y-2 mb-4">
        {tier.benefits?.map((benefit, idx) => (
          <li key={idx} className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {benefit.is_included ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-red-500" />
            )}
            {benefit.description}
          </li>
        ))}
        {tier.includes_all_content && (
          <li className="flex items-center gap-2 text-sm text-primary font-medium">
            <Unlock className="w-4 h-4" />
            Access to ALL content
          </li>
        )}
      </ul>
      <button
        onClick={() => onPurchase(tier)}
        disabled={isPurchased}
        className={`w-full py-2 rounded-lg font-medium transition-colors ${
          isPurchased 
            ? 'bg-green-500 text-white cursor-not-allowed'
            : 'bg-primary text-black hover:bg-primary/90'
        }`}
      >
        {isPurchased ? 'Purchased' : 'Purchase'}
      </button>
    </div>
  );
};

// Review Card
const ReviewCard = ({ review }) => {
  const { isDark } = useTheme();
  
  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-dark-500' : 'bg-gray-100'}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-dark-400 flex items-center justify-center overflow-hidden">
          {review.reviewer_avatar ? (
            <img src={review.reviewer_avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{review.reviewer_username?.charAt(0) || '?'}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {review.reviewer_username}
            </span>
            {review.is_verified_purchase && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} 
              />
            ))}
          </div>
          {review.title && (
            <h5 className={`font-medium mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {review.title}
            </h5>
          )}
          {review.content && (
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {review.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
const LearnChannelPage = () => {
  const { channelId } = useParams();
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState(null);
  const [content, setContent] = useState({ free_videos: [], playlists: [], subscription_tiers: [] });
  const [reviews, setReviews] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);  // Free follow for notifications
  const [purchasedTierId, setPurchasedTierId] = useState(null);  // Paid subscription tier
  const [activeTab, setActiveTab] = useState('videos');
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [playingIntro, setPlayingIntro] = useState(false);

  const isOwner = user?.id === channel?.user_id;

  // Fetch channel data
  const fetchChannel = useCallback(async () => {
    try {
      const channelRes = await api.get(`/learn/channels/${channelId}`);
      setChannel(channelRes.data);
      
      const contentRes = await api.get(`/learn/channels/${channelId}/content`);
      setContent(contentRes.data);
      
      const reviewsRes = await api.get(`/learn/reviews/channel/${channelId}?limit=10`);
      setReviews(reviewsRes.data);
      
      // Check follow and subscription status if logged in
      if (isAuthenticated) {
        try {
          // Check if following (free)
          const followRes = await api.get('/learn/following');
          const isFollowingChannel = followRes.data.some(f => f.channel_id === channelId);
          setIsFollowing(isFollowingChannel);
          
          // Check purchased tier subscriptions
          const subsRes = await api.get('/learn/subscriptions');
          const purchasedTier = subsRes.data.find(s => s.channel_id === channelId);
          if (purchasedTier) {
            setPurchasedTierId(purchasedTier.tier_id);
          }
        } catch (e) {
          console.log('Not following or subscribed');
        }
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
    } finally {
      setLoading(false);
    }
  }, [channelId, isAuthenticated]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  // Follow channel (FREE - for notifications)
  const handleFollow = async () => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    
    try {
      await api.post(`/learn/channels/${channelId}/follow`);
      setIsFollowing(true);
      setChannel(prev => ({ ...prev, subscriber_count: (prev.subscriber_count || 0) + 1 }));
    } catch (error) {
      console.error('Error following:', error);
    }
  };

  // Unfollow channel (FREE)
  const handleUnfollow = async () => {
    try {
      await api.delete(`/learn/channels/${channelId}/follow`);
      setIsFollowing(false);
      setChannel(prev => ({ ...prev, subscriber_count: Math.max(0, (prev.subscriber_count || 1) - 1) }));
    } catch (error) {
      console.error('Error unfollowing:', error);
    }
  };

  // Purchase tier subscription (PAID - monthly)
  const handlePurchaseTier = async (tier) => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    
    // For now, show alert - will integrate Stripe later
    alert(`Payment integration coming soon!\n\nYou're purchasing: ${tier.name}\nPrice: $${tier.price_usd}/month\n\nThis will be connected to Stripe for secure payments.`);
    
    // Uncomment when Stripe is integrated:
    // try {
    //   await api.post(`/learn/channels/${channelId}/purchase-tier`, { tier_id: tier.id });
    //   setPurchasedTierId(tier.id);
    // } catch (error) {
    //   console.error('Error purchasing tier:', error);
    // }
  };

  if (loading) return <LoadingSpinner />;
  if (!channel) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Channel not found</p>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      {/* Channel Header/Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-primary/30 to-primary/10 relative">
        {channel.banner_image && (
          <img src={channel.banner_image} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Channel Info */}
        <div className="relative -mt-16 mb-6 flex flex-col md:flex-row md:items-end gap-4">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-dark-400 border-4 border-dark-600 overflow-hidden">
            {channel.owner_avatar ? (
              <img src={channel.owner_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-white">
                {channel.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {channel.name}
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              @{channel.owner_username}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Users className="w-4 h-4" />
                {channel.subscriber_count || 0} subscribers
              </span>
              {channel.average_rating > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  {channel.average_rating.toFixed(1)} ({channel.review_count} reviews)
                </span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            {!isOwner && (
              isFollowing ? (
                <button 
                  onClick={handleUnfollow}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Following
                </button>
              ) : (
                <button 
                  onClick={handleFollow}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Subscribe
                </button>
              )
            )}
            {isOwner && (
              <Link to="/learn/studio" className="btn btn-primary">
                Manage Channel
              </Link>
            )}
          </div>
        </div>

        {/* Description */}
        {channel.description && (
          <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {channel.description}
          </p>
        )}

        {/* Intro Video */}
        {channel.intro_video_url && (
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Welcome to My Channel
            </h2>
            <div className="aspect-video max-w-3xl rounded-xl overflow-hidden bg-black">
              <video
                src={channel.intro_video_url}
                poster={channel.intro_video_thumbnail}
                controls
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b mb-6 overflow-x-auto">
          {[
            { id: 'videos', label: 'Free Videos', count: content.free_videos?.length },
            { id: 'playlists', label: 'Playlists', count: content.playlists?.length },
            { id: 'tiers', label: 'Subscription Tiers', count: content.subscription_tiers?.length },
            { id: 'reviews', label: 'Reviews', count: channel.review_count }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : `border-transparent ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`
              }`}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {/* Free Videos Tab */}
          {activeTab === 'videos' && (
            <div>
              {content.free_videos?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {content.free_videos.map(video => (
                    <VideoCard key={video.id} video={video} isOwner={isOwner} />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No free videos yet</p>
                </div>
              )}
            </div>
          )}

          {/* Playlists Tab */}
          {activeTab === 'playlists' && (
            <div>
              {content.playlists?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {content.playlists.map(playlist => (
                    <PlaylistCard 
                      key={playlist.id} 
                      playlist={playlist} 
                      onView={() => navigate(`/learn/playlist/${playlist.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No playlists yet</p>
                </div>
              )}
            </div>
          )}

          {/* Subscription Tiers Tab */}
          {activeTab === 'tiers' && (
            <div>
              {content.subscription_tiers?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
                  {content.subscription_tiers.map(tier => (
                    <TierCard 
                      key={tier.id} 
                      tier={tier} 
                      isPurchased={purchasedTierId === tier.id}
                      onPurchase={handlePurchaseTier}
                    />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No subscription tiers available</p>
                  <p className="text-sm">This channel offers content for free or individual purchase</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="max-w-3xl">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No reviews yet</p>
                  <p className="text-sm">Be the first to review this channel</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sign Up Modal */}
      <SignUpModal 
        isOpen={showSignUpModal} 
        onClose={() => setShowSignUpModal(false)}
        action="interact"
      />
    </div>
  );
};

export default LearnChannelPage;
