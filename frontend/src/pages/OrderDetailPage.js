import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Package, Truck, Check, MapPin, CreditCard, Star, MessageSquare, ArrowLeft, Clock, AlertCircle, X, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ordersAPI, reviewsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import StarRating from '../components/StarRating';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewType, setReviewType] = useState('buyer_to_seller');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Item condition state (for buyer reviews)
  const [itemCondition, setItemCondition] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  
  // Reviews state
  const [orderReviews, setOrderReviews] = useState({
    buyer_to_seller: null,
    seller_to_buyer: null,
    can_buyer_review: false,
    can_seller_review: false
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrder();
  }, [id, isAuthenticated, navigate]);

  const fetchOrder = async () => {
    try {
      const res = await ordersAPI.getById(id);
      setOrder(res.data);
      
      // Fetch existing reviews for this order
      try {
        const reviewsRes = await reviewsAPI.getOrderReviews(id);
        setOrderReviews(reviewsRes.data);
      } catch (err) {
        console.error('Error fetching order reviews:', err);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await ordersAPI.updateStatus(id, newStatus, trackingNumber || undefined);
      setMessage({ type: 'success', text: `Order marked as ${newStatus}` });
      fetchOrder();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update order' });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddTracking = async () => {
    if (!trackingNumber.trim()) {
      setMessage({ type: 'error', text: 'Please enter a tracking number' });
      return;
    }
    setUpdating(true);
    try {
      await ordersAPI.addTracking(id, { 
        tracking_number: trackingNumber,
        carrier: 'Standard Shipping'
      });
      setMessage({ type: 'success', text: 'Tracking information added!' });
      fetchOrder();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add tracking' });
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelivery = async () => {
    setUpdating(true);
    try {
      await ordersAPI.confirmDelivery(id);
      setMessage({ type: 'success', text: 'Delivery confirmed! Thank you.' });
      fetchOrder();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to confirm delivery' });
    } finally {
      setUpdating(false);
    }
  };

  const openReviewModal = (type) => {
    setReviewType(type);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      await reviewsAPI.create({
        order_id: order.id,
        rating: reviewRating,
        comment: reviewComment,
        review_type: reviewType
      });
      setMessage({ type: 'success', text: 'Review submitted! Thank you for your feedback.' });
      setShowReviewModal(false);
      fetchOrder(); // Refresh to get updated review status
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to submit review' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const isBuyer = user?.id === order?.buyer_id;
  const isSeller = order?.items?.some(item => item.seller_id === user?.id);
  const canBuyerReview = isBuyer && ['delivered', 'completed'].includes(order?.status) && orderReviews.can_buyer_review;
  const canSellerReview = isSeller && ['delivered', 'completed'].includes(order?.status) && orderReviews.can_seller_review;

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      paid: 'bg-green-500/20 text-green-400 border-green-500/30',
      shipped: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      delivered: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      refunded: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'paid': return <CreditCard className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered':
      case 'completed': return <Check className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return null;

  // Get the other party for review purposes
  const sellerInfo = order.items?.[0];
  const revieweeForBuyer = { id: sellerInfo?.seller_id, username: sellerInfo?.seller_username };
  const revieweeForSeller = { id: order.buyer_id, username: order.buyer_username };

  return (
    <div className="min-h-screen" data-testid="order-detail-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/orders')}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
          </button>
          <div className="flex-1">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Order {order.order_number}
            </h1>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className={`badge border ${getStatusColor(order.status)} flex items-center gap-1`}>
            {getStatusIcon(order.status)}
            {order.status}
          </span>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
          }`}>
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Order Progress */}
        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Order Progress</h2>
          <div className="flex items-center justify-between">
            {['paid', 'shipped', 'delivered', 'completed'].map((status, index) => (
              <React.Fragment key={status}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    ['paid', 'shipped', 'delivered', 'completed'].indexOf(order.status) >= index
                      ? 'bg-primary text-black'
                      : isDark ? 'bg-dark-300 text-gray-500' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {getStatusIcon(status)}
                  </div>
                  <span className={`text-xs mt-2 capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{status}</span>
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${
                    ['paid', 'shipped', 'delivered', 'completed'].indexOf(order.status) > index
                      ? 'bg-primary'
                      : isDark ? 'bg-dark-300' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Seller Actions */}
        {isSeller && order.status === 'paid' && (
          <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Seller Actions</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="flex-1"
              />
              <button
                onClick={handleAddTracking}
                disabled={updating || !trackingNumber.trim()}
                className="btn btn-primary"
              >
                {updating ? 'Adding...' : 'Add Tracking & Ship'}
              </button>
            </div>
          </div>
        )}

        {/* Buyer Delivery Confirmation */}
        {isBuyer && order.status === 'shipped' && (
          <div className={`rounded-xl p-6 mb-6 border-2 border-primary/30 ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
            <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Received Your Order?
            </h2>
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Once you confirm delivery, the payment will be released to the seller.
            </p>
            <button
              onClick={handleConfirmDelivery}
              disabled={updating}
              className="btn btn-primary"
              data-testid="confirm-delivery-btn"
            >
              {updating ? 'Confirming...' : 'Confirm Delivery'}
            </button>
          </div>
        )}

        {/* Review Section */}
        {['delivered', 'completed'].includes(order.status) && (
          <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Star className="w-5 h-5 text-yellow-400" />
              Reviews
            </h2>
            
            {/* Existing Reviews */}
            <div className="space-y-4 mb-6">
              {orderReviews.buyer_to_seller && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-200' : 'bg-gray-200'}`}>
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {orderReviews.buyer_to_seller.reviewer_username}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          Buyer
                        </span>
                        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                          {orderReviews.buyer_to_seller.reviewee_username}
                        </span>
                      </div>
                      <StarRating rating={orderReviews.buyer_to_seller.rating} size={16} />
                      {orderReviews.buyer_to_seller.comment && (
                        <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {orderReviews.buyer_to_seller.comment}
                        </p>
                      )}
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(orderReviews.buyer_to_seller.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {orderReviews.seller_to_buyer && (
                <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-200' : 'bg-gray-200'}`}>
                      <User className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {orderReviews.seller_to_buyer.reviewer_username}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                          Seller
                        </span>
                        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                          {orderReviews.seller_to_buyer.reviewee_username}
                        </span>
                      </div>
                      <StarRating rating={orderReviews.seller_to_buyer.rating} size={16} />
                      {orderReviews.seller_to_buyer.comment && (
                        <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {orderReviews.seller_to_buyer.comment}
                        </p>
                      )}
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(orderReviews.seller_to_buyer.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!orderReviews.buyer_to_seller && !orderReviews.seller_to_buyer && (
                <p className={`text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No reviews yet for this order
                </p>
              )}
            </div>

            {/* Review Buttons */}
            <div className="flex flex-wrap gap-3">
              {canBuyerReview && (
                <button
                  onClick={() => openReviewModal('buyer_to_seller')}
                  className="btn btn-primary flex items-center gap-2"
                  data-testid="review-seller-btn"
                >
                  <Star className="w-4 h-4" />
                  Review Seller ({revieweeForBuyer.username})
                </button>
              )}
              {canSellerReview && (
                <button
                  onClick={() => openReviewModal('seller_to_buyer')}
                  className="btn btn-secondary flex items-center gap-2"
                  data-testid="review-buyer-btn"
                >
                  <Star className="w-4 h-4" />
                  Review Buyer ({revieweeForSeller.username})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Order Items</h2>
          <div className="space-y-4">
            {order.items?.map((item) => (
              <div key={item.listing_id} className={`flex gap-4 p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                <img
                  src={item.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                  alt={item.listing_title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <Link 
                    to={`/listings/${item.listing_id}`} 
                    className={`font-medium hover:text-primary ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {item.listing_title}
                  </Link>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Qty: {item.quantity}</p>
                  <Link 
                    to={`/profile/${item.seller_id}`} 
                    className={`text-sm hover:text-primary ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    Seller: {item.seller_username}
                  </Link>
                </div>
                <div className="text-right">
                  <p className="text-primary font-bold">${item.listing_price?.toLocaleString()}</p>
                  {item.shipping_cost > 0 && (
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      +${item.shipping_cost} shipping
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shipping Address */}
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <MapPin className="w-5 h-5" />
              Shipping Address
            </h2>
            <div className={isDark ? 'text-gray-300' : 'text-gray-600'}>
              <p className="font-medium">{order.shipping_address?.full_name}</p>
              <p>{order.shipping_address?.address_line1}</p>
              {order.shipping_address?.address_line2 && <p>{order.shipping_address?.address_line2}</p>}
              <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}</p>
              <p>{order.shipping_address?.country}</p>
            </div>
            
            {/* Tracking Info */}
            {order.tracking_number && (
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tracking Number:</p>
                <p className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{order.tracking_number}</p>
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <CreditCard className="w-5 h-5" />
              Payment Summary
            </h2>
            <div className="space-y-2">
              <div className={`flex justify-between ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>Subtotal</span>
                <span>${order.subtotal?.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>Shipping</span>
                <span>${order.shipping_total?.toLocaleString()}</span>
              </div>
              {order.payment_processing_fee > 0 && (
                <div className={`flex justify-between ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span>Processing Fee</span>
                  <span>${order.payment_processing_fee?.toFixed(2)}</span>
                </div>
              )}
              <div className={`border-t pt-2 mt-2 flex justify-between font-bold ${isDark ? 'border-dark-300 text-white' : 'border-gray-200 text-gray-900'}`}>
                <span>Total</span>
                <span className="text-primary">${order.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Button */}
        <div className="mt-6">
          <Link
            to={`/messages?to=${isBuyer ? order.items?.[0]?.seller_id : order.buyer_id}`}
            className="btn btn-secondary"
          >
            <MessageSquare className="w-4 h-4" />
            {isBuyer ? 'Contact Seller' : 'Contact Buyer'}
          </Link>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className={`rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {reviewType === 'buyer_to_seller' ? 'Review Seller' : 'Review Buyer'}
              </h2>
              <button 
                onClick={() => setShowReviewModal(false)} 
                className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Who you're reviewing */}
            <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                You are reviewing:
              </p>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {reviewType === 'buyer_to_seller' ? revieweeForBuyer.username : revieweeForSeller.username}
              </p>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="mb-6">
                <label className={`block mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                      data-testid={`star-${star}`}
                    >
                      <Star
                        className={`w-8 h-8 ${star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : isDark ? 'text-gray-600' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Condition (only for buyer reviewing seller) */}
              {reviewType === 'buyer_to_seller' && (
                <div className="mb-6">
                  <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Item Condition <span className="text-primary">*</span>
                  </label>
                  <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    How did the item compare to the listing description?
                  </p>
                  <div className="space-y-2">
                    {[
                      { value: 'as_described', label: 'As Described', desc: 'Item exactly as described', color: 'text-green-400' },
                      { value: 'minor_issues', label: 'Minor Issues', desc: 'Small cosmetic or minor differences', color: 'text-yellow-400' },
                      { value: 'significantly_different', label: 'Significantly Different', desc: 'Major differences from description', color: 'text-orange-400' },
                      { value: 'damaged', label: 'Damaged', desc: 'Item arrived damaged', color: 'text-red-400' }
                    ].map(option => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                          itemCondition === option.value
                            ? isDark ? 'border-primary bg-primary/10' : 'border-primary bg-primary/5'
                            : isDark ? 'border-dark-200 hover:border-dark-100' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="itemCondition"
                          value={option.value}
                          checked={itemCondition === option.value}
                          onChange={(e) => setItemCondition(e.target.value)}
                          className="mt-1"
                          required
                        />
                        <div>
                          <span className={`font-medium ${option.color}`}>{option.label}</span>
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{option.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {/* Condition notes for issues */}
                  {itemCondition && itemCondition !== 'as_described' && (
                    <div className="mt-3">
                      <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Please describe the issue (optional)
                      </label>
                      <textarea
                        value={conditionNotes}
                        onChange={(e) => setConditionNotes(e.target.value)}
                        placeholder="Describe any issues with the item..."
                        rows={2}
                        className="w-full text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Written Review <span className="text-primary">*</span>
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={reviewType === 'buyer_to_seller' 
                    ? "How was your experience with this seller? Describe the item quality, shipping speed, communication, etc."
                    : "How was your experience with this buyer? Were they communicative, prompt with payment, etc."}
                  rows={4}
                  required
                  minLength={10}
                  className="w-full"
                  data-testid="review-comment"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  This review will be publicly displayed on the user&apos;s profile. Minimum 10 characters.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting || reviewComment.length < 10 || (reviewType === 'buyer_to_seller' && !itemCondition)}
                  className="btn btn-primary flex-1"
                  data-testid="submit-review-btn"
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
