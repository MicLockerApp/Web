import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { paymentsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Check, AlertCircle, Package, ArrowRight, Clock } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [pollAttempts, setPollAttempts] = useState(0);

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
  }, [isAuthenticated, sessionId]);

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
    <div className="min-h-screen flex items-center justify-center py-12" data-testid="checkout-success">
      <div className="text-center max-w-lg mx-auto px-4">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-12 h-12 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">Order Confirmed!</h1>
        
        <p className="text-gray-400 mb-6">
          Thank you for your purchase. Your payment has been processed successfully.
        </p>

        {/* Order Info Card */}
        <div className="bg-dark-400 rounded-xl p-6 mb-8 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-white font-medium">Order #{status?.order_id?.slice(0, 8).toUpperCase()}</p>
              <p className="text-gray-400 text-sm">Payment received</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-dark-300">
            <div className="flex items-center gap-2 text-gray-400">
              <Check className="w-4 h-4 text-green-400" />
              <span>Payment confirmed</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span>Seller notified - awaiting shipment</span>
            </div>
          </div>

          {/* Funds Held Notice */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>Buyer Protection Active:</strong> Your funds are being held securely. 
              They will only be released to the seller once you confirm delivery.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link 
            to={`/orders/${status?.order_id || orderId}`} 
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            View Order Details
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/search" className="btn btn-secondary w-full">
            Continue Shopping
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          A confirmation email has been sent to your email address.
        </p>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
