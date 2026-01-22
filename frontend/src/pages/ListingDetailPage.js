import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, MessageSquare, Heart, Share2, Star, ChevronLeft, ChevronRight, Check, X, Copy, Facebook, Twitter, Mail, Link as LinkIcon, ArrowLeftRight, Flag, Play, Volume2 } from 'lucide-react';
import { listingsAPI, offersAPI, cartAPI, usersAPI, tradesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StarRating from '../components/StarRating';
import analytics from '../services/analytics';
import ReportListingModal from '../components/ReportListingModal';

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const videoRef = useRef(null);
  
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [selectedTradeListingId, setSelectedTradeListingId] = useState('');
  const [tradeEligibility, setTradeEligibility] = useState(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await listingsAPI.getById(id);
        setListing(response.data);
        
        // Track listing view in analytics
        analytics.listingViewed(
          response.data.id,
          response.data.price,
          response.data.category,
          response.data.seller_id,
          'direct'
        );
        
        // Check if listing is favorited
        if (isAuthenticated) {
          try {
            const favResponse = await usersAPI.getFavorites();
            const favorites = favResponse.data.listings || [];
            setIsFavorited(favorites.some(fav => fav.id === id));
          } catch (err) {
            console.error('Error checking favorites:', err);
          }
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id, navigate, isAuthenticated]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setFavLoading(true);
    try {
      if (isFavorited) {
        await usersAPI.removeFavorite(listing.id);
        setIsFavorited(false);
        setMessage({ type: 'success', text: 'Removed from favorites' });
        analytics.listingUnfavorited(listing.id);
      } else {
        await usersAPI.addFavorite(listing.id);
        setIsFavorited(true);
        setMessage({ type: 'success', text: 'Added to favorites!' });
        analytics.listingFavorited(listing.id);
      }
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update favorites' });
    } finally {
      setFavLoading(false);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = listing?.title || 'Check out this listing on MicLocker';
    const text = `${title} - $${listing?.price?.toLocaleString()} on MicLocker`;
    
    // Track share event
    analytics.listingShared(listing.id, platform);
    
    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(url);
        setMessage({ type: 'success', text: 'Link copied to clipboard!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setShowShareModal(false);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        setShowShareModal(false);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        setShowShareModal(false);
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this listing: ${url}`)}`;
        setShowShareModal(false);
        break;
      default:
        break;
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await addItem(listing.id);
      setMessage({ type: 'success', text: 'Added to cart!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
      // Track add to cart event
      analytics.addToCart(listing.id, listing.price, 1, listing.category, false);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add to cart' });
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await addItem(listing.id);
      navigate('/cart');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add to cart' });
    }
  };

  const handleMakeOffer = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSubmitting(true);
    try {
      await offersAPI.create({
        listing_id: listing.id,
        offer_price: parseFloat(offerPrice),
        message: offerMessage,
      });
      setShowOfferModal(false);
      setOfferPrice('');
      setOfferMessage('');
      setMessage({ type: 'success', text: 'Offer submitted!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to submit offer' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenTradeModal = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Check trade eligibility
    try {
      const eligResponse = await tradesAPI.checkEligibility();
      setTradeEligibility(eligResponse.data);
      
      if (!eligResponse.data.eligible) {
        setMessage({ type: 'error', text: eligResponse.data.reason });
        return;
      }
      
      // Fetch user's active listings
      const listingsResponse = await listingsAPI.getSellerListings(user.id, { status: 'active' });
      setMyListings(listingsResponse.data.listings || []);
      setShowTradeModal(true);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to check trade eligibility' });
    }
  };

  const handleProposeTrade = async (e) => {
    e.preventDefault();
    if (!selectedTradeListingId) {
      setMessage({ type: 'error', text: 'Please select one of your listings to trade' });
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await tradesAPI.create(selectedTradeListingId, listing.id);
      setShowTradeModal(false);
      setSelectedTradeListingId('');
      setMessage({ type: 'success', text: 'Trade proposal sent!' });
      
      // Navigate to trade detail page
      setTimeout(() => {
        navigate(`/trades/${response.data.trade_id}`);
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to propose trade' });
    } finally {
      setSubmitting(false);
    }
  };

  const isOwnListing = user?.id === listing?.seller_id;
  const images = listing?.media?.filter(m => m.media_type === 'image') || [];
  const videos = listing?.media?.filter(m => m.media_type === 'video') || [];
  const allMedia = [...images, ...videos];
  const currentMedia = allMedia[currentImageIndex];
  const isCurrentVideo = currentMedia?.media_type === 'video';
  const currentImage = currentMedia?.url || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800';

  if (loading) return <LoadingSpinner />;
  if (!listing) return <div className="text-center py-16 text-gray-400">Listing not found</div>;

  return (
    <div className="min-h-screen" data-testid="listing-detail-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <Link to={`/search?category=${encodeURIComponent(listing.category)}`} className="hover:text-white">
            {listing.category}
          </Link>
          <span>/</span>
          <span className="text-white truncate">{listing.title}</span>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images & Videos */}
          <div>
            <div className="relative aspect-square bg-dark-400 rounded-xl overflow-hidden mb-4">
              {isCurrentVideo ? (
                <video
                  key={currentMedia?.url}
                  src={currentImage}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain bg-black"
                  poster={images[0]?.url}
                  data-testid="video-player"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={currentImage}
                  alt={listing.title}
                  className="w-full h-full object-contain"
                  data-testid="image-display"
                />
              )}
              {allMedia.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((currentImageIndex - 1 + allMedia.length) % allMedia.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((currentImageIndex + 1) % allMedia.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {allMedia.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {allMedia.map((media, idx) => (
                  <button
                    key={media.id || idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    {media.media_type === 'video' ? (
                      <>
                        <video src={media.url} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{listing.title}</h1>
              <div className="flex gap-2">
                <button 
                  onClick={handleToggleFavorite}
                  disabled={favLoading}
                  className={`p-2 rounded-lg transition-colors ${
                    isFavorited 
                      ? 'bg-primary text-black hover:bg-primary/80' 
                      : 'bg-dark-400 hover:bg-dark-300'
                  }`}
                  data-testid="favorite-button"
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : 'text-gray-400'}`} />
                </button>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="p-2 bg-dark-400 rounded-lg hover:bg-dark-300"
                  data-testid="share-button"
                >
                  <Share2 className="w-5 h-5 text-gray-400" />
                </button>
                {/* Report/Flag Button - only show if not own listing */}
                {user?.id !== listing.seller_id && (
                  <button 
                    onClick={() => isAuthenticated ? setShowReportModal(true) : navigate('/login')}
                    className="p-2 bg-dark-400 rounded-lg hover:bg-dark-300 hover:text-red-400 transition-colors"
                    data-testid="report-button"
                    title="Report this listing"
                  >
                    <Flag className="w-5 h-5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-4xl font-bold text-primary mb-4">
              ${listing.price?.toLocaleString()}
            </p>

            {listing.shipping?.price > 0 && (
              <p className="text-gray-400 mb-4">
                + ${listing.shipping.price} shipping · {listing.shipping.estimated_days}
              </p>
            )}

            {/* Condition & Category */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="badge badge-primary">{listing.condition}</span>
              <span className="badge bg-dark-400 text-gray-300">{listing.category}</span>
              {listing.brand && <span className="badge bg-dark-400 text-gray-300">{listing.brand}</span>}
            </div>

            {/* Seller Info */}
            <Link
              to={`/profile/${listing.seller_id}`}
              className="flex items-center gap-3 p-4 bg-dark-400 rounded-lg mb-6 hover:bg-dark-300 transition-colors"
              data-testid="seller-link"
            >
              <div className="w-12 h-12 bg-dark-300 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {listing.seller_username?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{listing.seller_username}</p>
                <div className="flex items-center gap-2">
                  <StarRating rating={listing.seller_rating || 0} size={14} />
                  {listing.seller_rating > 0 && (
                    <span className="text-sm text-gray-400">{listing.seller_rating?.toFixed(1)}</span>
                  )}
                </div>
              </div>
              <MessageSquare className="w-5 h-5 text-gray-400" />
            </Link>

            {/* Action Buttons */}
            {!isOwnListing && listing.status === 'active' && (
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleBuyNow}
                  className="btn btn-primary w-full py-3 text-lg"
                  data-testid="buy-now-button"
                >
                  Buy It Now
                </button>
                <button
                  onClick={handleAddToCart}
                  className="btn btn-secondary w-full py-3"
                  data-testid="add-to-cart-button"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
                <div className="flex gap-3">
                  {listing.accepts_offers && (
                    <button
                      onClick={() => setShowOfferModal(true)}
                      className="btn btn-outline flex-1 py-3"
                      data-testid="make-offer-button"
                    >
                      Make an Offer
                    </button>
                  )}
                  <button
                    onClick={handleOpenTradeModal}
                    className="btn btn-outline flex-1 py-3"
                    data-testid="propose-trade-button"
                  >
                    <ArrowLeftRight className="w-5 h-5 mr-2" />
                    Trade
                  </button>
                </div>
              </div>
            )}

            {isOwnListing && (
              <div className="bg-dark-400 rounded-lg p-4 mb-6">
                <p className="text-gray-400 text-sm mb-3">This is your listing</p>
                <Link to={`/dashboard/listings/${listing.id}/edit`} className="btn btn-primary w-full">
                  Edit Listing
                </Link>
              </div>
            )}

            {/* Payment Plan */}
            {listing.payment_plan?.enabled && (
              <div className="bg-dark-400 rounded-lg p-4 mb-6">
                <p className="text-white font-medium mb-2">Payment Plan Available</p>
                <p className="text-gray-400 text-sm">
                  {listing.payment_plan.num_payments} payments of ${(listing.price / listing.payment_plan.num_payments).toFixed(2)}
                </p>
              </div>
            )}

            {/* Description */}
            <div className="border-t border-dark-300 pt-6">
              <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{listing.description}</p>
            </div>

            {/* Details */}
            <div className="border-t border-dark-300 pt-6 mt-6">
              <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
              <dl className="grid grid-cols-2 gap-4">
                {listing.brand && (
                  <>
                    <dt className="text-gray-400">Brand</dt>
                    <dd className="text-white">{listing.brand}</dd>
                  </>
                )}
                {listing.model && (
                  <>
                    <dt className="text-gray-400">Model</dt>
                    <dd className="text-white">{listing.model}</dd>
                  </>
                )}
                <dt className="text-gray-400">Condition</dt>
                <dd className="text-white">{listing.condition}</dd>
                <dt className="text-gray-400">Category</dt>
                <dd className="text-white">{listing.category}</dd>
                <dt className="text-gray-400">Quantity</dt>
                <dd className="text-white">{listing.quantity - (listing.sold_quantity || 0)} available</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-400 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Make an Offer</h2>
              <button onClick={() => setShowOfferModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleMakeOffer}>
              <div className="mb-4">
                <label className="block text-gray-400 mb-2">Your Offer</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder={listing.price.toString()}
                    className="pl-8"
                    required
                    min="1"
                    step="0.01"
                    data-testid="offer-price-input"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">List price: ${listing.price.toLocaleString()}</p>
              </div>
              <div className="mb-6">
                <label className="block text-gray-400 mb-2">Message (optional)</label>
                <textarea
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  rows={3}
                  placeholder="Add a message to the seller..."
                  data-testid="offer-message-input"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full py-3"
                disabled={submitting}
                data-testid="submit-offer-button"
              >
                {submitting ? 'Submitting...' : 'Submit Offer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-400 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Share this listing</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleShare('copy')}
                className="flex items-center justify-center gap-2 p-4 bg-dark-300 rounded-lg hover:bg-dark-200 transition-colors"
              >
                <Copy className="w-5 h-5 text-primary" />
                <span className="text-white">Copy Link</span>
              </button>
              
              <button
                onClick={() => handleShare('facebook')}
                className="flex items-center justify-center gap-2 p-4 bg-dark-300 rounded-lg hover:bg-dark-200 transition-colors"
              >
                <Facebook className="w-5 h-5 text-blue-500" />
                <span className="text-white">Facebook</span>
              </button>
              
              <button
                onClick={() => handleShare('twitter')}
                className="flex items-center justify-center gap-2 p-4 bg-dark-300 rounded-lg hover:bg-dark-200 transition-colors"
              >
                <Twitter className="w-5 h-5 text-sky-400" />
                <span className="text-white">Twitter</span>
              </button>
              
              <button
                onClick={() => handleShare('email')}
                className="flex items-center justify-center gap-2 p-4 bg-dark-300 rounded-lg hover:bg-dark-200 transition-colors"
              >
                <Mail className="w-5 h-5 text-red-400" />
                <span className="text-white">Email</span>
              </button>
            </div>

            {/* URL Preview */}
            <div className="mt-6 p-3 bg-dark-500 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <LinkIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{window.location.href}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-400 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Propose a Trade</h2>
              <button onClick={() => setShowTradeModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trade Info Banner */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-primary">
                <strong>🎉 Trades are free!</strong> No platform fees. You have {tradeEligibility?.trades_remaining || 1} free trade(s) this month.
              </p>
            </div>

            {/* Item you want */}
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">You want:</p>
              <div className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg">
                {listing.media?.[0]?.url ? (
                  <img 
                    src={listing.media[0].url} 
                    alt={listing.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-dark-200 rounded-lg" />
                )}
                <div>
                  <p className="text-white font-medium">{listing.title}</p>
                  <p className="text-gray-400 text-sm">${listing.price?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Select your listing */}
            <form onSubmit={handleProposeTrade}>
              <div className="mb-6">
                <label className="block text-gray-400 mb-2">Select one of your listings to trade:</label>
                
                {myListings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">You don&apos;t have any active listings to trade.</p>
                    <Link to="/sell" className="btn btn-primary">
                      Create a Listing
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {myListings.map(myListing => (
                      <label 
                        key={myListing.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                          selectedTradeListingId === myListing.id 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-dark-300 border-transparent hover:bg-dark-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tradeListing"
                          value={myListing.id}
                          checked={selectedTradeListingId === myListing.id}
                          onChange={(e) => setSelectedTradeListingId(e.target.value)}
                          className="text-primary"
                        />
                        {myListing.media?.[0]?.url ? (
                          <img 
                            src={myListing.media[0].url} 
                            alt={myListing.title}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-dark-200 rounded-lg" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{myListing.title}</p>
                          <p className="text-gray-400 text-sm">${myListing.price?.toLocaleString()}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {myListings.length > 0 && (
                <button
                  type="submit"
                  className="btn btn-primary w-full py-3"
                  disabled={submitting || !selectedTradeListingId}
                  data-testid="submit-trade-button"
                >
                  {submitting ? 'Sending...' : 'Propose Trade'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Report Listing Modal */}
      <ReportListingModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        listing={listing}
      />
    </div>
  );
};

export default ListingDetailPage;
