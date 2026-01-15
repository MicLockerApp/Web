import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Package, Truck, Check, MapPin, CreditCard, Star, MessageSquare, ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, reviewsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import StarRating from '../components/StarRating';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [hasReviewed, setHasReviewed] = useState(false);

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
      // Check if already reviewed (would need backend support)
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      await reviewsAPI.create({
        order_id: order.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      setMessage({ type: 'success', text: 'Review submitted! Thank you for your feedback.' });
      setShowReviewModal(false);
      setHasReviewed(true);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to submit review' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const isBuyer = user?.id === order?.buyer_id;
  const isSeller = order?.items?.some(item => item.seller_id === user?.id);
  const canReview = isBuyer && ['delivered', 'completed'].includes(order?.status) && !hasReviewed;

  const getStatusStep = (status) => {
    const steps = ['pending', 'paid', 'shipped', 'delivered', 'completed'];
    return steps.indexOf(status);
  };

  const statusSteps = [
    { key: 'paid', label: 'Paid', icon: CreditCard },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: Package },
    { key: 'completed', label: 'Completed', icon: Check },
  ];

  if (loading) return <LoadingSpinner />;
  if (!order) return <div className="text-center py-16 text-gray-400">Order not found</div>;

  return (
    <div className="min-h-screen" data-testid="order-detail-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Order {order.order_number}</h1>
            <p className="text-gray-400 text-sm">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Status Timeline */}
        <div className="bg-dark-400 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order Status</h2>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => {
              const currentStep = getStatusStep(order.status);
              const stepIndex = getStatusStep(step.key);
              const isActive = stepIndex <= currentStep;
              const isCurrent = step.key === order.status;
              const StepIcon = step.icon;

              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-primary text-black' : 'bg-dark-300 text-gray-500'
                    } ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-dark-400' : ''}`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-sm mt-2 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${stepIndex < currentStep ? 'bg-primary' : 'bg-dark-300'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {order.status === 'cancelled' && (
            <div className="mt-4 p-3 bg-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>This order has been cancelled</span>
            </div>
          )}
        </div>

        {/* Seller Actions */}
        {isSeller && order.status === 'paid' && (
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Ship This Order</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number (optional)"
                className="flex-1"
              />
              <button
                onClick={() => handleUpdateStatus('shipped')}
                disabled={updating}
                className="btn btn-primary"
                data-testid="mark-shipped-button"
              >
                <Truck className="w-4 h-4" />
                {updating ? 'Updating...' : 'Mark as Shipped'}
              </button>
            </div>
          </div>
        )}

        {/* Buyer Actions */}
        {isBuyer && order.status === 'shipped' && (
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Confirm Delivery</h2>
            <p className="text-gray-400 mb-4">Did you receive your order?</p>
            <button
              onClick={() => handleUpdateStatus('delivered')}
              disabled={updating}
              className="btn btn-primary"
              data-testid="mark-delivered-button"
            >
              <Package className="w-4 h-4" />
              {updating ? 'Updating...' : 'Confirm Delivery'}
            </button>
          </div>
        )}

        {/* Review Section */}
        {canReview && (
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Leave a Review</h2>
            <p className="text-gray-400 mb-4">Share your experience with other buyers</p>
            <button
              onClick={() => setShowReviewModal(true)}
              className="btn btn-primary"
              data-testid="leave-review-button"
            >
              <Star className="w-4 h-4" />
              Write a Review
            </button>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-dark-400 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Items</h2>
          <div className="space-y-4">
            {order.items?.map((item, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b border-dark-300 last:border-0 last:pb-0">
                <img
                  src={item.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                  alt={item.listing_title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <Link to={`/listing/${item.listing_id}`} className="text-white font-medium hover:text-primary">
                    {item.listing_title}
                  </Link>
                  <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                  <Link to={`/profile/${item.seller_id}`} className="text-gray-500 text-sm hover:text-primary">
                    Seller: {item.seller_username}
                  </Link>
                </div>
                <div className="text-right">
                  <p className="text-primary font-bold">${item.listing_price?.toLocaleString()}</p>
                  {item.shipping_cost > 0 && (
                    <p className="text-gray-500 text-sm">+${item.shipping_cost} shipping</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shipping Address */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Shipping Address
            </h2>
            <div className="text-gray-300">
              <p className="font-medium">{order.shipping_address?.full_name}</p>
              <p>{order.shipping_address?.address_line1}</p>
              {order.shipping_address?.address_line2 && <p>{order.shipping_address?.address_line2}</p>}
              <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}</p>
              <p>{order.shipping_address?.country}</p>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Summary
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>${order.subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>${order.shipping_total?.toLocaleString()}</span>
              </div>
              {order.payment_processing_fee > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Processing Fee</span>
                  <span>${order.payment_processing_fee?.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-dark-300 pt-2 mt-2 flex justify-between text-white font-bold">
                <span>Total</span>
                <span className="text-primary">${order.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Seller/Buyer */}
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
          <div className="bg-dark-400 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-6">Write a Review</h2>
            <form onSubmit={handleSubmitReview}>
              <div className="mb-6">
                <label className="block text-gray-400 mb-3">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-8 h-8 ${star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-400 mb-2">Comment (optional)</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder="Tell others about your experience..."
                  maxLength={1000}
                  data-testid="review-comment-input"
                />
                <p className="text-gray-500 text-sm mt-1">{reviewComment.length}/1000</p>
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
                  disabled={reviewSubmitting}
                  className="btn btn-primary flex-1"
                  data-testid="submit-review-button"
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
