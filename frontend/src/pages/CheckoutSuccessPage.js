import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { paymentsAPI, ordersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Check, AlertCircle, Package, ArrowRight, Clock, User, MapPin, CreditCard, Home } from 'lucide-react';
import analytics from '../services/analytics';

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  
  const { isAuthenticated } = useAuth();
  const { clearCart } = useCart();
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState('');
  const [pollAttempts, setPollAttempts] = useState(0);

  const pollPaymentStatus = async () => {
    const maxAttempts = 10;
    const pollInterval = 2000; // 2 seconds

    if (pollAttempts >= maxAttempts) {
      setError('Payment verification timed out. Please check your orders page or contact support.');
      setLoading(false);
      return;
    }

    try {
      const response = await paymentsAPI.getStatus(sessionId);
      const paymentStatus = response.data;

      if (paymentStatus.payment_status === 'paid') {
        setStatus(paymentStatus);
        
        // Fetch full order details
        try {
          const orderResponse = await ordersAPI.getById(paymentStatus.order_id);
          setOrderDetails(orderResponse.data);
        } catch (orderErr) {
          console.error('Error fetching order details:', orderErr);
        }
        
        setLoading(false);
        
        // Clear cart
        await clearCart();
        
        // Track purchase
        analytics.purchaseCompleted(paymentStatus.order_id, 0, []);
        
        return;
      } else if (paymentStatus.status === 'expired') {
        setError('Payment session expired. Please try again.');
        setLoading(false);
        return;
      }

      // Continue polling
      setPollAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
      
    } catch (err) {
      console.error('Error checking payment status:', err);
      setPollAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!sessionId) {
      setError('Invalid checkout session');
      setLoading(false);
      return;
    }

    pollPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sessionId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Verifying Payment...</h1>
          <p className="text-gray-400 mb-4">
            Please wait while we confirm your payment.
          </p>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Payment Issue</h1>
          <p className="text-gray-400 mb-8">{error}</p>
          <div className="space-y-3">
            <Link to="/orders" className="btn btn-primary w-full">
              Check Your Orders
            </Link>
            <Link to="/cart" className="btn btn-secondary w-full">
              Return to Cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" data-testid="checkout-success">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-gray-400">
            Thank you for your purchase. Your payment has been processed successfully.
          </p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-dark-400 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-dark-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">
                  Order #{(status?.order_id || orderId)?.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-gray-400 text-sm">
                  {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
              Paid
            </span>
          </div>

          {/* Items Purchased */}
          {orderDetails?.items && orderDetails.items.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Items Purchased</h3>
              <div className="space-y-3">
                {orderDetails.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-dark-300 rounded-lg">
                    {item.listing_image ? (
                      <img 
                        src={item.listing_image} 
                        alt={item.listing_title}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-dark-200 rounded-lg flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{item.listing_title}</p>
                      <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-primary font-bold">${item.listing_price?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller Info */}
          {orderDetails?.items?.[0] && (
            <div className="mb-6 p-4 bg-dark-300 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Seller</p>
                  <p className="text-white font-medium">{orderDetails.items[0].seller_username}</p>
                </div>
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="border-t border-dark-300 pt-4 space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>${orderDetails?.subtotal?.toLocaleString() || '0.00'}</span>
            </div>
            {orderDetails?.shipping_total > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>${orderDetails.shipping_total?.toLocaleString()}</span>
              </div>
            )}
            {orderDetails?.payment_processing_fee > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Processing Fee</span>
                <span>${orderDetails.payment_processing_fee?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-dark-300">
              <span>Total Paid</span>
              <span className="text-primary">${orderDetails?.total?.toLocaleString() || status?.amount || '0.00'}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        {orderDetails?.shipping_address && (
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="text-white font-semibold">Shipping Address</h3>
            </div>
            <div className="text-gray-300">
              <p>{orderDetails.shipping_address.full_name}</p>
              <p>{orderDetails.shipping_address.address_line1}</p>
              {orderDetails.shipping_address.address_line2 && (
                <p>{orderDetails.shipping_address.address_line2}</p>
              )}
              <p>
                {orderDetails.shipping_address.city}, {orderDetails.shipping_address.state} {orderDetails.shipping_address.postal_code}
              </p>
              <p>{orderDetails.shipping_address.country}</p>
            </div>
          </div>
        )}

        {/* Order Status */}
        <div className="bg-dark-400 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Order Status</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-green-400">
              <Check className="w-5 h-5" />
              <span>Payment confirmed</span>
            </div>
            <div className="flex items-center gap-3 text-yellow-400">
              <Clock className="w-5 h-5" />
              <span>Seller notified - awaiting shipment</span>
            </div>
          </div>

          {/* Funds Held Notice */}
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-400 font-medium mb-1">Buyer Protection Active</p>
                <p className="text-gray-400 text-sm">
                  Your funds are being held securely. They will only be released to the seller once you confirm delivery.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link 
            to={`/orders/${status?.order_id || orderId}`} 
            className="btn btn-primary w-full flex items-center justify-center gap-2 py-3"
            data-testid="view-order-button"
          >
            View Order Details
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            to="/" 
            className="btn btn-secondary w-full flex items-center justify-center gap-2 py-3"
            data-testid="done-button"
          >
            <Home className="w-4 h-4" />
            Done - Return to Home
          </Link>
        </div>

        <p className="text-gray-500 text-sm text-center mt-8">
          A confirmation email has been sent to your email address.
        </p>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
