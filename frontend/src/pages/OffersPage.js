import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tag, Clock, Check, X, MessageSquare, DollarSign, ArrowRight, Send, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { offersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const OffersPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('received');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [counterModal, setCounterModal] = useState(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOffers();
  }, [isAuthenticated, navigate, activeTab]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await offersAPI.getAll(activeTab, { limit: 50 });
      setOffers(res.data.offers || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (offerId) => {
    setActionLoading(offerId);
    try {
      await offersAPI.accept(offerId);
      setMessage({ type: 'success', text: 'Offer accepted! The buyer can now complete the purchase.' });
      fetchOffers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to accept offer' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (offerId) => {
    if (!window.confirm('Are you sure you want to decline this offer?')) return;
    setActionLoading(offerId);
    try {
      await offersAPI.decline(offerId);
      setMessage({ type: 'success', text: 'Offer declined.' });
      fetchOffers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to decline offer' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdraw = async (offerId) => {
    if (!window.confirm('Are you sure you want to withdraw this offer?')) return;
    setActionLoading(offerId);
    try {
      await offersAPI.withdraw(offerId);
      setMessage({ type: 'success', text: 'Offer withdrawn.' });
      fetchOffers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to withdraw offer' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCounter = async (e) => {
    e.preventDefault();
    if (!counterModal) return;
    setActionLoading(counterModal.id);
    try {
      await offersAPI.counter(counterModal.id, parseFloat(counterPrice), counterMessage);
      setMessage({ type: 'success', text: 'Counter offer sent!' });
      setCounterModal(null);
      setCounterPrice('');
      setCounterMessage('');
      fetchOffers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to counter offer' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckoutOffer = (offerId) => {
    navigate(`/checkout?offer=${offerId}`);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      countered: 'bg-blue-500/20 text-blue-400',
      accepted: 'bg-green-500/20 text-green-400',
      declined: 'bg-red-500/20 text-red-400',
      withdrawn: 'bg-gray-500/20 text-gray-400',
      expired: 'bg-gray-500/20 text-gray-400',
      ordered: 'bg-purple-500/20 text-purple-400',
    };
    return styles[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'countered': return <RefreshCw className="w-4 h-4" />;
      case 'accepted': return <Check className="w-4 h-4" />;
      case 'declined': return <X className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen" data-testid="offers-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Offers</h1>
            <p className="text-gray-400">Manage your buying and selling offers</p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-dark-300 mb-6">
          <button
            onClick={() => setActiveTab('received')}
            className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'received' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Received ({offers.filter(o => o.seller_id === user?.id).length || 0})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'sent' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            Sent
          </button>
        </div>

        {/* Offers List */}
        {loading ? (
          <LoadingSpinner />
        ) : offers.length > 0 ? (
          <div className="space-y-4">
            {offers.map(offer => (
              <div key={offer.id} className="bg-dark-400 rounded-xl p-4 md:p-6" data-testid={`offer-${offer.id}`}>
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Image */}
                  <Link to={`/listing/${offer.listing_id}`} className="flex-shrink-0">
                    <img
                      src={offer.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200'}
                      alt={offer.listing_title}
                      className="w-full md:w-32 h-32 object-cover rounded-lg"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link to={`/listing/${offer.listing_id}`} className="text-white font-medium hover:text-primary truncate">
                        {offer.listing_title}
                      </Link>
                      <span className={`badge flex items-center gap-1 ${getStatusBadge(offer.status)}`}>
                        {getStatusIcon(offer.status)}
                        {offer.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm mb-3">
                      <span className="text-gray-400">List price: <span className="text-white">${offer.listing_price?.toLocaleString()}</span></span>
                      <span className="text-gray-400">Offer: <span className="text-primary font-bold">${offer.offer_price?.toLocaleString()}</span></span>
                      {offer.counter_price && (
                        <span className="text-gray-400">Counter: <span className="text-yellow-400 font-bold">${offer.counter_price?.toLocaleString()}</span></span>
                      )}
                      {offer.final_price && (
                        <span className="text-gray-400">Final: <span className="text-green-400 font-bold">${offer.final_price?.toLocaleString()}</span></span>
                      )}
                    </div>

                    <p className="text-gray-500 text-sm mb-3">
                      {activeTab === 'received' ? `From: ${offer.buyer_username}` : `To: ${offer.seller_username}`} · {formatTimeAgo(offer.created_at)}
                    </p>

                    {offer.message && (
                      <div className="bg-dark-300 rounded-lg p-3 mb-3">
                        <p className="text-gray-300 text-sm">&quot;{offer.message}&quot;</p>
                      </div>
                    )}

                    {offer.counter_message && offer.status === 'countered' && (
                      <div className="bg-dark-300 rounded-lg p-3 mb-3 border-l-2 border-yellow-400">
                        <p className="text-yellow-400 text-xs mb-1">Counter message:</p>
                        <p className="text-gray-300 text-sm">&quot;{offer.counter_message}&quot;</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {/* Seller actions for received offers */}
                      {activeTab === 'received' && offer.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAccept(offer.id)}
                            disabled={actionLoading === offer.id}
                            className="btn btn-primary text-sm py-2 px-4"
                            data-testid={`accept-offer-${offer.id}`}
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              setCounterModal(offer);
                              setCounterPrice(offer.offer_price.toString());
                            }}
                            disabled={actionLoading === offer.id}
                            className="btn btn-secondary text-sm py-2 px-4"
                            data-testid={`counter-offer-${offer.id}`}
                          >
                            <RefreshCw className="w-4 h-4" />
                            Counter
                          </button>
                          <button
                            onClick={() => handleDecline(offer.id)}
                            disabled={actionLoading === offer.id}
                            className="btn btn-outline text-sm py-2 px-4 text-red-400 border-red-400 hover:bg-red-400/10"
                            data-testid={`decline-offer-${offer.id}`}
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </button>
                        </>
                      )}

                      {/* Buyer actions for sent offers */}
                      {activeTab === 'sent' && offer.status === 'pending' && (
                        <button
                          onClick={() => handleWithdraw(offer.id)}
                          disabled={actionLoading === offer.id}
                          className="btn btn-outline text-sm py-2 px-4"
                          data-testid={`withdraw-offer-${offer.id}`}
                        >
                          <X className="w-4 h-4" />
                          Withdraw Offer
                        </button>
                      )}

                      {/* Buyer can accept counter */}
                      {activeTab === 'sent' && offer.status === 'countered' && (
                        <>
                          <button
                            onClick={() => handleAccept(offer.id)}
                            disabled={actionLoading === offer.id}
                            className="btn btn-primary text-sm py-2 px-4"
                            data-testid={`accept-counter-${offer.id}`}
                          >
                            <Check className="w-4 h-4" />
                            Accept Counter (${offer.counter_price?.toLocaleString()})
                          </button>
                          <button
                            onClick={() => handleWithdraw(offer.id)}
                            disabled={actionLoading === offer.id}
                            className="btn btn-outline text-sm py-2 px-4"
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </button>
                        </>
                      )}

                      {/* Checkout button for accepted offers */}
                      {activeTab === 'sent' && offer.status === 'accepted' && (
                        <button
                          onClick={() => handleCheckoutOffer(offer.id)}
                          className="btn btn-primary text-sm py-2 px-4"
                          data-testid={`checkout-offer-${offer.id}`}
                        >
                          <ArrowRight className="w-4 h-4" />
                          Complete Purchase (${offer.final_price?.toLocaleString()})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Tag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No {activeTab} offers</p>
            <p className="text-gray-500 text-sm">
              {activeTab === 'received' ? 'When buyers make offers on your listings, they will appear here.' : 'When you make offers on items, they will appear here.'}
            </p>
          </div>
        )}
      </div>

      {/* Counter Offer Modal */}
      {counterModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-400 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Counter Offer</h2>
              <button onClick={() => setCounterModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm">Original offer: <span className="text-primary">${counterModal.offer_price?.toLocaleString()}</span></p>
              <p className="text-gray-400 text-sm">List price: <span className="text-white">${counterModal.listing_price?.toLocaleString()}</span></p>
            </div>

            <form onSubmit={handleCounter}>
              <div className="mb-4">
                <label className="block text-gray-400 mb-2">Your Counter Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    className="pl-8"
                    required
                    min="1"
                    step="0.01"
                    data-testid="counter-price-input"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-400 mb-2">Message (optional)</label>
                <textarea
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  rows={3}
                  placeholder="Add a message to the buyer..."
                  data-testid="counter-message-input"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-3"
                disabled={actionLoading === counterModal.id}
                data-testid="submit-counter-button"
              >
                {actionLoading === counterModal.id ? 'Sending...' : 'Send Counter Offer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersPage;
