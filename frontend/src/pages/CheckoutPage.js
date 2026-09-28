import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext';
import { listingsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { CreditCard, Lock, ArrowLeft, Truck, Shield, AlertCircle } from 'lucide-react';
import analytics from '../services/analytics';

// One listing per purchase, paid with Stripe on this page (same payment
// intent flow as the iOS/Android apps). The shipping address is the mailing
// address saved on the buyer's profile — the backend reads it from there.

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const PaymentForm = ({ orderId, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order_id=${encodeURIComponent(orderId)}`,
      },
    });
    // Only reached on an immediate error (otherwise Stripe redirects).
    if (error) onError(error.message || 'Payment failed. Please try again.');
    setPaying(false);
  };

  return (
    <form onSubmit={handlePay}>
      <PaymentElement />
      <button
        type="submit"
        className="btn btn-primary w-full py-3 mt-6 text-lg"
        disabled={!stripe || paying}
        data-testid="pay-button"
      >
        <Lock className="w-5 h-5" />
        {paying ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listing');
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [listing, setListing] = useState(null);
  const [quote, setQuote] = useState(null);
  const [intent, setIntent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!listingId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [l, q] = await Promise.all([
          listingsAPI.getById(listingId),
          listingsAPI.getCheckoutQuote(listingId),
        ]);
        setListing(l.data);
        setQuote(q.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'This item is not available for checkout.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, isAuthenticated, listingId, navigate]);

  const address = user?.shipping_address;
  const hasAddress = !!(address?.address_line1 && address?.city && address?.state && address?.postal_code);

  const startPayment = async () => {
    setError('');
    if (!hasAddress) {
      setError('Add your mailing address in Settings before checking out.');
      return;
    }
    if (!stripePromise) {
      setError('Payments are not configured on this site yet.');
      return;
    }
    setStarting(true);
    try {
      const res = await listingsAPI.createPaymentIntent(listingId);
      setIntent(res.data);
      analytics.checkoutStarted((res.data.total_cents || 0) / 100, 1, false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start checkout. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const elementsOptions = useMemo(() => (intent ? {
    clientSecret: intent.client_secret,
    appearance: { theme: 'night', variables: { colorPrimary: '#FFD700' } },
  } : null), [intent]);

  if (authLoading || loading) return <LoadingSpinner />;

  if (!listingId || (!listing && !error)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Nothing to check out</h1>
        <Link to="/search" className="btn btn-primary">Browse Gear</Link>
      </div>
    );
  }

  const totals = intent || quote || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-testid="checkout-page">
      <Link to={listing ? `/listing/${listing.id}` : '/'} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Listing
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

      {error && (
        <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Shipping Address */}
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Shipping Address
            </h2>
            {hasAddress ? (
              <div className="text-gray-300">
                <p className="text-white font-medium">{address.full_name || user?.display_name}</p>
                <p>{address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}</p>
                <p>{address.city}, {address.state} {address.postal_code}</p>
              </div>
            ) : (
              <p className="text-gray-400">No mailing address on your profile yet.</p>
            )}
            <Link to="/profile/edit" className="inline-block text-primary hover:underline text-sm mt-3">
              {hasAddress ? 'Change address in Settings' : 'Add your address in Settings'}
            </Link>
          </div>

          {/* Payment */}
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Payment
            </h2>
            {intent && elementsOptions ? (
              <Elements stripe={stripePromise} options={elementsOptions}>
                <PaymentForm orderId={intent.order_id} onError={setError} />
              </Elements>
            ) : (
              <button
                onClick={startPayment}
                className="btn btn-primary w-full py-3 text-lg"
                disabled={starting || !listing || listing.status !== 'active'}
                data-testid="continue-to-payment"
              >
                {starting ? 'Preparing...' : 'Continue to Payment'}
              </button>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-dark-400 rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>

            {listing && (
              <div className="flex gap-3 mb-6">
                <img
                  src={listing.media?.[0]?.url || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                  alt={listing.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="text-white font-medium line-clamp-2">{listing.title}</p>
                  <p className="text-gray-400 text-sm">Sold by {listing.seller_username}</p>
                </div>
              </div>
            )}

            <div className="border-t border-dark-300 pt-4 space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Item</span>
                <span>{money(totals.item_cents)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>{money(totals.shipping_cents)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tax{quote?.tax_estimated && !intent ? ' (est.)' : ''}</span>
                <span>{money(totals.tax_cents)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-dark-300">
                <span>Total</span>
                <span className="text-primary">{money(totals.total_cents)}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-dark-300">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Lock className="w-4 h-4 text-green-400" />
                <span>Secure checkout powered by Stripe</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Funds held until delivery confirmed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
