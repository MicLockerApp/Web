import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tag, Clock, Check, X, MessageSquare, DollarSign, ArrowRight, Send, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { offersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import analytics from '../services/analytics';

const OffersPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('received');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [counterModal, setCounterModal] = useState(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [expandedOffer, setExpandedOffer] = useState(null);
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
      const offer = offers.find(o => o.id === offerId);
      await offersAPI.accept(offerId);
      setMessage({ type: 'success', text: 'Offer accepted! The buyer can now complete the purchase.' });
      
      // Track offer accepted
      if (offer) {
        analytics.offerAccepted(offerId, offer.final_price || offer.counter_price || offer.offer_price);
      }
      
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

  const openCounterModal = (offer) => {
    // Get the latest price to suggest
    const latestPrice = offer.counter_price || offer.offer_price;
    setCounterModal(offer);
    setCounterPrice(latestPrice.toString());
    setCounterMessage('');
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

  const isMyTurn = (offer) => {
    const myRole = offer.seller_id === user?.id ? 'seller' : 'buyer';
    return offer.pending_action_from === myRole;
  };

  const getLatestPrice = (offer) => {
    if (offer.negotiation_history?.length > 0) {
      return offer.negotiation_history[offer.negotiation_history.length - 1].price;
    }
    return offer.counter_price || offer.offer_price;
  };

  return (
    <div className="min-h-screen" data-testid="offers-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Offers</h1>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Manage your buying and selling offers</p>
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
            Received
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
              <div key={offer.id} className="bg-dark-400 rounded-xl overflow-hidden" data-testid={`offer-${offer.id}`}>
                <div className="p-4 md:p-6">
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
                        <div className="flex items-center gap-2">
                          {isMyTurn(offer) && offer.status !== 'accepted' && (
                            <span className="badge bg-primary/20 text-primary text-xs animate-pulse">
                              Your turn
                            </span>
                          )}
                          <span className={`badge flex items-center gap-1 ${getStatusBadge(offer.status)}`}>
                            {getStatusIcon(offer.status)}
                            {offer.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm mb-3">
                        <span className="text-gray-400">List price: <span className="text-white">${offer.listing_price?.toLocaleString()}</span></span>
                        <span className="text-gray-400">Initial offer: <span className="text-primary font-bold">${offer.offer_price?.toLocaleString()}</span></span>
                        {offer.counter_price && (
                          <span className="text-gray-400">Latest: <span className="text-yellow-400 font-bold">${getLatestPrice(offer)?.toLocaleString()}</span></span>
                        )}
                        {offer.final_price && (
                          <span className="text-gray-400">Agreed: <span className="text-green-400 font-bold">${offer.final_price?.toLocaleString()}</span></span>
                        )}
                      </div>

                      <p className="text-gray-500 text-sm mb-3">
                        {activeTab === 'received' ? `From: ${offer.buyer_username}` : `To: ${offer.seller_username}`} · {formatTimeAgo(offer.updated_at || offer.created_at)}
                      </p>

                      {/* Negotiation History Toggle */}
                      {offer.negotiation_history?.length > 1 && (
                        <button
                          onClick={() => setExpandedOffer(expandedOffer === offer.id ? null : offer.id)}
                          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
                        >
                          {expandedOffer === offer.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          View negotiation history ({offer.negotiation_history.length} messages)
                        </button>
                      )}

                      {/* Latest message preview */}
                      {!expandedOffer && offer.negotiation_history?.length > 0 && (
                        <div className="bg-dark-300 rounded-lg p-3 mb-3">
                          <p className="text-gray-500 text-xs mb-1">
                            {offer.negotiation_history[offer.negotiation_history.length - 1].username}:
                          </p>
                          <p className="text-gray-300 text-sm">
                            ${offer.negotiation_history[offer.negotiation_history.length - 1].price?.toLocaleString()}
                            {offer.negotiation_history[offer.negotiation_history.length - 1].message && (
                              <span className="text-gray-400"> - &quot;{offer.negotiation_history[offer.negotiation_history.length - 1].message}&quot;</span>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {/* When it's my turn and offer is active */}
                        {isMyTurn(offer) && ['pending', 'countered'].includes(offer.status) && (
                          <>
                            <button
                              onClick={() => handleAccept(offer.id)}
                              disabled={actionLoading === offer.id}
                              className="btn btn-primary text-sm py-2 px-4"
                              data-testid={`accept-offer-${offer.id}`}
                            >
                              <Check className="w-4 h-4" />
                              Accept ${getLatestPrice(offer)?.toLocaleString()}
                            </button>
                            <button
                              onClick={() => openCounterModal(offer)}
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

                        {/* Waiting for other party */}
                        {!isMyTurn(offer) && ['pending', 'countered'].includes(offer.status) && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4 animate-pulse" />
                            <span className="text-sm">Waiting for {offer.pending_action_from === 'seller' ? offer.seller_username : offer.buyer_username} to respond...</span>
                          </div>
                        )}

                        {/* Buyer can withdraw anytime while active */}
                        {activeTab === 'sent' && ['pending', 'countered'].includes(offer.status) && (
                          <button
                            onClick={() => handleWithdraw(offer.id)}
                            disabled={actionLoading === offer.id}
                            className="btn btn-outline text-sm py-2 px-4 ml-auto"
                            data-testid={`withdraw-offer-${offer.id}`}
                          >
                            <X className="w-4 h-4" />
                            Withdraw
                          </button>
                        )}

                        {/* Checkout button for accepted offers (buyer only) */}
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

                {/* Expanded Negotiation History */}
                {expandedOffer === offer.id && offer.negotiation_history?.length > 0 && (
                  <div className="border-t border-dark-300 bg-dark-500 p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Negotiation History
                    </h4>
                    <div className="space-y-3">
                      {offer.negotiation_history.map((entry, index) => {
                        const isMe = entry.user_id === user?.id;
                        return (
                          <div
                            key={entry.id || index}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                              isMe ? 'bg-primary/20 text-primary' : 'bg-dark-300 text-gray-300'
                            }`}>
                              <div className="flex items-center justify-between gap-4 mb-1">
                                <span className="font-medium text-sm">{entry.username}</span>
                                <span className="text-xs opacity-70">{formatTimeAgo(entry.created_at)}</span>
                              </div>
                              <p className="font-bold">${entry.price?.toLocaleString()}</p>
                              {entry.message && (
                                <p className="text-sm mt-1 opacity-80">&quot;{entry.message}&quot;</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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

            <div className="mb-4 space-y-1">
              <p className="text-gray-400 text-sm">List price: <span className="text-white">${counterModal.listing_price?.toLocaleString()}</span></p>
              <p className="text-gray-400 text-sm">Current offer: <span className="text-primary">${getLatestPrice(counterModal)?.toLocaleString()}</span></p>
              {counterModal.negotiation_history?.length > 1 && (
                <p className="text-gray-500 text-xs">{counterModal.negotiation_history.length} offers exchanged</p>
              )}
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
                  placeholder="Add a message explaining your counter offer..."
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
