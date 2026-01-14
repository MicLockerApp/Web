import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, MessageSquare, Heart, Share2, Star, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { listingsAPI, offersAPI, cartAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StarRating from '../components/StarRating';

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addItem } = useCart();
  
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await listingsAPI.getById(id);
        setListing(response.data);
      } catch (error) {
        console.error('Error fetching listing:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id, navigate]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await addItem(listing.id);
      setMessage({ type: 'success', text: 'Added to cart!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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

  const isOwnListing = user?.id === listing?.seller_id;
  const images = listing?.media?.filter(m => m.media_type === 'image') || [];
  const currentImage = images[currentImageIndex]?.url || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800';

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
          {/* Images */}
          <div>
            <div className="relative aspect-square bg-dark-400 rounded-xl overflow-hidden mb-4">
              <img
                src={currentImage}
                alt={listing.title}
                className="w-full h-full object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((currentImageIndex + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
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
                <button className="p-2 bg-dark-400 rounded-lg hover:bg-dark-300">
                  <Heart className="w-5 h-5 text-gray-400" />
                </button>
                <button className="p-2 bg-dark-400 rounded-lg hover:bg-dark-300">
                  <Share2 className="w-5 h-5 text-gray-400" />
                </button>
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
                {listing.accepts_offers && (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="btn btn-outline w-full py-3"
                    data-testid="make-offer-button"
                  >
                    Make an Offer
                  </button>
                )}
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
    </div>
  );
};

export default ListingDetailPage;
