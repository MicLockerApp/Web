import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { paymentsAPI, offersAPI, listingsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Check, CreditCard, Lock, Tag, ArrowLeft, Truck, Shield, AlertCircle, ExternalLink } from 'lucide-react';
import analytics from '../services/analytics';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const offerId = searchParams.get('offer');
  
  const { user, isAuthenticated } = useAuth();
  const { cart, clearCart, loading: cartLoading } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [offerLoading, setOfferLoading] = useState(!!offerId);
  const [offerData, setOfferData] = useState(null);
  const [listingData, setListingData] = useState(null);
  const [error, setError] = useState('');
  const [redirectingToStripe, setRedirectingToStripe] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    phone: '',
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: user.username || '',
        address_line1: user.shipping_address?.address_line1 || '',
        address_line2: user.shipping_address?.address_line2 || '',
        city: user.shipping_address?.city || '',
        state: user.shipping_address?.state || '',
        postal_code: user.shipping_address?.postal_code || '',
        country: user.shipping_address?.country || 'USA',
        phone: user.phone_number || user.phone || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (offerId) {
      fetchOfferDetails();
    }
  }, [isAuthenticated, navigate, offerId]);

  const fetchOfferDetails = async () => {
    try {
      const offerRes = await offersAPI.getById(offerId);
      setOfferData(offerRes.data);
      
      const listingRes = await listingsAPI.getById(offerRes.data.listing_id);
      setListingData(listingRes.data);
    } catch (err) {
      setError('Failed to load offer details');
    } finally {
      setOfferLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate form
    if (!formData.full_name || !formData.address_line1 || !formData.city || 
        !formData.state || !formData.postal_code) {
      setError('Please fill in all required shipping fields');
      setLoading(false);
      return;
    }

    // Track checkout started
    const totals = getCheckoutTotals();
    analytics.checkoutStarted(totals.total, offerId ? 1 : cart.items?.length || 0, !!offerId);

    try {
      // Create checkout session with Stripe
      const checkoutData = {
        origin_url: window.location.origin,
        shipping_address: {
          full_name: formData.full_name,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || null,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
          phone: formData.phone || null,
        },
      };

      // Add offer_id if checking out from an offer
      if (offerId) {
        checkoutData.offer_id = offerId;
      }

      const response = await paymentsAPI.createCheckout(checkoutData);
      
      // Redirect to Stripe checkout
      setRedirectingToStripe(true);
      window.location.href = response.data.checkout_url;
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create checkout session. Please try again.');
      setLoading(false);
    }
  };

  // Calculate totals
  const getCheckoutTotals = () => {
    if (offerId && offerData && listingData) {
      const subtotal = offerData.final_price;
      const shippingCost = listingData?.shipping?.price || 0;
      const platformFee = user?.has_lifetime_free_fees ? 0 : subtotal * 0.03;
      const processingFee = subtotal * 0.0319 + 0.49;
      const total = subtotal + shippingCost + processingFee;
      
      return { subtotal, shippingCost, platformFee, processingFee, total };
    }
    
    const subtotal = cart.subtotal || 0;
    const shippingCost = cart.shipping_total || 0;
    const platformFee = user?.has_lifetime_free_fees ? 0 : subtotal * 0.03;
    const processingFee = subtotal > 0 ? subtotal * 0.0319 + 0.49 : 0;
    const total = subtotal + shippingCost + processingFee;
    
    return { subtotal, shippingCost, platformFee, processingFee, total };
  };

  if (cartLoading || offerLoading) return <LoadingSpinner />;

  // Show redirecting state
  if (redirectingToStripe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CreditCard className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Redirecting to Secure Payment...</h1>
          <p className="text-gray-400 mb-4">
            You&apos;re being redirected to Stripe&apos;s secure checkout page.
          </p>
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Lock className="w-4 h-4" />
            <span className="text-sm">256-bit SSL Encryption</span>
          </div>
        </div>
      </div>
    );
  }

  // Check if cart/offer is empty
  const hasItems = offerId ? !!offerData : (cart.items && cart.items.length > 0);
  if (!hasItems) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-white mb-4">Your Cart is Empty</h1>
          <p className="text-gray-400 mb-8">Add some items to your cart to continue.</p>
          <Link to="/search" className="btn btn-primary">
            Browse Gear
          </Link>
        </div>
      </div>
    );
  }

  const totals = getCheckoutTotals();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-testid="checkout-page">
      <Link to="/cart" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Shipping Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            {/* Shipping Address */}
            <div className="bg-dark-400 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Shipping Address
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="John Doe"
                    data-testid="shipping-name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-1">Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    value={formData.address_line1}
                    onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
                    placeholder="123 Main St"
                    data-testid="shipping-address1"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({...formData, address_line2: e.target.value})}
                    placeholder="Apt 4B (optional)"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="New York"
                    data-testid="shipping-city"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="NY"
                    data-testid="shipping-state"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.postal_code}
                    onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    placeholder="10001"
                    data-testid="shipping-postal"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                  >
                    <option value="USA">United States</option>
                    <option value="CAN">Canada</option>
                    <option value="GBR">United Kingdom</option>
                    <option value="AUS">Australia</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-dark-400 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment
              </h2>

              <div className="bg-dark-300 rounded-lg p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#635BFF] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Secure Payment via Stripe</p>
                  <p className="text-gray-400 text-sm">
                    You&apos;ll be redirected to Stripe&apos;s secure checkout
                  </p>
                </div>
                <Lock className="w-5 h-5 text-green-400" />
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Buyer Protection:</strong> Your payment is held securely until you confirm 
                    delivery of your item. Funds are only released to the seller after you receive your purchase.
                  </span>
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
              data-testid="checkout-submit"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Pay ${totals.total.toFixed(2)} Securely
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-dark-400 rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>

            {/* Items */}
            <div className="space-y-4 mb-6">
              {offerId && offerData && listingData ? (
                <div className="flex gap-3">
                  <img
                    src={listingData.media?.[0]?.url || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                    alt={listingData.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium line-clamp-2">{listingData.title}</p>
                    <p className="text-primary font-bold">${offerData.final_price.toFixed(2)}</p>
                    <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                      Accepted Offer
                    </span>
                  </div>
                </div>
              ) : (
                cart.items?.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                      alt={item.listing_title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium line-clamp-2">{item.listing_title}</p>
                      <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                      <p className="text-primary font-bold">${item.listing_price.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            <div className="border-t border-dark-300 pt-4 space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>${totals.shippingCost.toFixed(2)}</span>
              </div>
              {user?.has_lifetime_free_fees ? (
                <div className="flex justify-between text-green-400">
                  <span className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    Platform Fee (0% VIP)
                  </span>
                  <span>$0.00</span>
                </div>
              ) : (
                <div className="flex justify-between text-gray-400">
                  <span>Platform Fee (3%)</span>
                  <span>${totals.platformFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>Processing Fee</span>
                <span>${totals.processingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-dark-300">
                <span>Total</span>
                <span className="text-primary">${totals.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Trust Badges */}
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
