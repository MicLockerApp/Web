import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, offersAPI, listingsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Check, CreditCard, Lock, Tag, ArrowLeft, Truck, Shield } from 'lucide-react';

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
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const [formData, setFormData] = useState({
    full_name: user?.username || '',
    address_line1: user?.shipping_address?.address_line1 || '',
    address_line2: user?.shipping_address?.address_line2 || '',
    city: user?.shipping_address?.city || '',
    state: user?.shipping_address?.state || '',
    postal_code: user?.shipping_address?.postal_code || '',
    country: user?.shipping_address?.country || 'USA',
    phone: user?.phone || '',
    payment_method: 'card',
    card_number: '',
    card_expiry: '',
    card_cvc: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // If checkout is for an offer, fetch offer details
    if (offerId) {
      fetchOfferDetails();
    }
  }, [isAuthenticated, navigate, offerId]);

  const fetchOfferDetails = async () => {
    try {
      const offerRes = await offersAPI.getById(offerId);
      setOfferData(offerRes.data);
      
      // Also fetch listing for shipping info
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

    try {
      const orderData = {
        shipping_address: {
          full_name: formData.full_name,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
          phone: formData.phone,
        },
        payment_method: formData.payment_method,
      };

      // Add offer_id if checking out from an offer
      if (offerId) {
        orderData.offer_id = offerId;
      }

      const response = await ordersAPI.create(orderData);
      
      // Clear cart only if not an offer checkout
      if (!offerId) {
        await clearCart();
      }
      
      setOrderId(response.data.id);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to place order');
    } finally {
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
    
    // Regular cart checkout
    const subtotal = cart.subtotal;
    const shippingCost = cart.shipping_total;
    const platformFee = user?.has_lifetime_free_fees ? 0 : subtotal * 0.03;
    const processingFee = subtotal * 0.0319 + 0.49;
    const total = subtotal + shippingCost + processingFee;
    
    return { subtotal, shippingCost, platformFee, processingFee, total };
  };

  if (cartLoading || offerLoading) return <LoadingSpinner />;

  // Show success screen
  if (success && orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="checkout-success">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Order Placed!</h1>
          <p className="text-gray-400 mb-8">
            Thank you for your purchase. Your order has been received and is being processed.
          </p>
          <div className="space-y-3">
            <Link to={`/orders/${orderId}`} className="btn btn-primary w-full">
              View Order Details
            </Link>
            <Link to="/search" className="btn btn-secondary w-full">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if cart is empty (only for non-offer checkout)
  if (!offerId && cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-4">Your cart is empty</h2>
          <Link to="/search" className="btn btn-primary">Browse Gear</Link>
        </div>
      </div>
    );
  }

  const totals = getCheckoutTotals();

  return (
    <div className="min-h-screen" data-testid="checkout-page">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
          {offerId && (
            <span className="badge bg-green-500/20 text-green-400 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Offer Accepted
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit}>
              {/* Shipping Address */}
              <div className="bg-dark-400 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-black rounded-full flex items-center justify-center text-sm">1</span>
                  <Truck className="w-5 h-5" />
                  Shipping Address
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 mb-2 text-sm">Full Name *</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      data-testid="shipping-name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 mb-2 text-sm">Address *</label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      required
                      placeholder="Street address"
                      data-testid="shipping-address1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={formData.address_line2}
                      onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                      placeholder="Apt, suite, unit, etc. (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      data-testid="shipping-city"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">State *</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                      data-testid="shipping-state"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">ZIP Code *</label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      required
                      data-testid="shipping-zip"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Payment (Mock) */}
              <div className="bg-dark-400 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-black rounded-full flex items-center justify-center text-sm">2</span>
                  <CreditCard className="w-5 h-5" />
                  Payment
                </h2>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                  <p className="text-yellow-400 text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    This is a demo checkout. No real payment will be processed.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 mb-2 text-sm">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.card_number}
                        onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                        placeholder="4242 4242 4242 4242"
                        className="pl-10"
                        data-testid="card-number"
                      />
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">Expiry</label>
                    <input
                      type="text"
                      value={formData.card_expiry}
                      onChange={(e) => setFormData({ ...formData, card_expiry: e.target.value })}
                      placeholder="MM/YY"
                      data-testid="card-expiry"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">CVC</label>
                    <input
                      type="text"
                      value={formData.card_cvc}
                      onChange={(e) => setFormData({ ...formData, card_cvc: e.target.value })}
                      placeholder="123"
                      data-testid="card-cvc"
                    />
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className="bg-dark-400 rounded-xl p-4 mb-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">MicLocker Buyer Protection</p>
                  <p className="text-gray-400 text-xs">Your purchase is protected. If there's an issue, we've got you covered.</p>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-4 text-lg"
                disabled={loading}
                data-testid="place-order-button"
              >
                {loading ? 'Processing...' : `Place Order - $${totals.total.toFixed(2)}`}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-dark-400 rounded-xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>
              
              {/* Items */}
              <div className="space-y-4 mb-6">
                {offerId && offerData ? (
                  // Offer checkout
                  <div className="flex gap-3">
                    <img
                      src={offerData.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                      alt={offerData.listing_title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm line-clamp-2">{offerData.listing_title}</p>
                      <p className="text-gray-500 text-xs line-through">${offerData.listing_price?.toLocaleString()}</p>
                      <p className="text-green-400 text-sm font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Accepted offer
                      </p>
                    </div>
                    <p className="text-primary font-bold">${offerData.final_price?.toLocaleString()}</p>
                  </div>
                ) : (
                  // Cart checkout
                  cart.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <img
                        src={item.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                        alt={item.listing_title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm line-clamp-2">{item.listing_title}</p>
                        <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-white font-medium">${item.listing_price?.toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-dark-300 pt-4 space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white">${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="text-white">
                    {totals.shippingCost > 0 ? `$${totals.shippingCost.toFixed(2)}` : 'Free'}
                  </span>
                </div>
                {user?.has_lifetime_free_fees ? (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Platform Fee</span>
                    <div className="text-right">
                      <span className="text-green-400 font-medium">$0.00</span>
                      <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        LIFETIME FREE
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between text-gray-400">
                    <span>Platform Fee (3%)</span>
                    <span className="text-white">${totals.platformFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>Processing Fee</span>
                  <span className="text-white">${totals.processingFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-dark-300 pt-2 mt-2 flex justify-between text-lg font-semibold">
                  <span className="text-white">Total</span>
                  <span className="text-primary">${totals.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Seller info for offer checkout */}
              {offerId && offerData && (
                <div className="mt-4 pt-4 border-t border-dark-300">
                  <p className="text-gray-400 text-sm">
                    Seller: <Link to={`/profile/${offerData.seller_id}`} className="text-primary hover:underline">{offerData.seller_username}</Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
