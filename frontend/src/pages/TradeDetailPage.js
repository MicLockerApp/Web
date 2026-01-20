import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { tradesAPI, ticketsAPI } from '../services/api';
import { 
  ArrowLeftRight, Package, Truck, Check, X, MessageSquare,
  AlertTriangle, Clock, ChevronLeft, ExternalLink, MapPin,
  RefreshCw, Copy, CheckCircle
} from 'lucide-react';

// Shipping Address Form Component
const ShippingAddressForm = ({ onSubmit, loading, isDark }) => {
  const [address, setAddress] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    phone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(address);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Full Name *
          </label>
          <input
            type="text"
            required
            value={address.full_name}
            onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
            className="w-full"
            placeholder="John Doe"
          />
        </div>
        <div className="md:col-span-2">
          <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Address Line 1 *
          </label>
          <input
            type="text"
            required
            value={address.address_line1}
            onChange={(e) => setAddress({ ...address, address_line1: e.target.value })}
            className="w-full"
            placeholder="123 Main St"
          />
        </div>
        <div className="md:col-span-2">
          <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Address Line 2
          </label>
          <input
            type="text"
            value={address.address_line2}
            onChange={(e) => setAddress({ ...address, address_line2: e.target.value })}
            className="w-full"
            placeholder="Apt 4B"
          />
        </div>
        <div>
          <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            City *
          </label>
          <input
            type="text"
            required
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
            className="w-full"
            placeholder="Los Angeles"
          />
        </div>
        <div>
          <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            State *
          </label>
          <input
            type="text"
            required
            value={address.state}
            onChange={(e) => setAddress({ ...address, state: e.target.value })}
            className="w-full"
            placeholder="CA"
          />
        </div>
        <div>
          <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Postal Code *
          </label>
          <input
            type="text"
            required
            value={address.postal_code}
            onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
            className="w-full"
            placeholder="90001"
          />
        </div>
        <div>
          <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Phone (optional)
          </label>
          <input
            type="tel"
            value={address.phone}
            onChange={(e) => setAddress({ ...address, phone: e.target.value })}
            className="w-full"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? 'Submitting...' : 'Submit Shipping Address'}
      </button>
    </form>
  );
};

// Tracking Form Component
const TrackingForm = ({ onSubmit, loading, isDark }) => {
  const [tracking, setTracking] = useState({
    carrier: 'USPS',
    tracking_number: '',
    estimated_delivery: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(tracking);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Carrier *
        </label>
        <select
          value={tracking.carrier}
          onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })}
          className="w-full"
          required
        >
          <option value="USPS">USPS</option>
          <option value="UPS">UPS</option>
          <option value="FedEx">FedEx</option>
          <option value="DHL">DHL</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Tracking Number *
        </label>
        <input
          type="text"
          required
          value={tracking.tracking_number}
          onChange={(e) => setTracking({ ...tracking, tracking_number: e.target.value })}
          className="w-full"
          placeholder="9400111899223..."
        />
      </div>
      <div>
        <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Estimated Delivery (optional)
        </label>
        <input
          type="text"
          value={tracking.estimated_delivery}
          onChange={(e) => setTracking({ ...tracking, estimated_delivery: e.target.value })}
          className="w-full"
          placeholder="3-5 business days"
        />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? 'Adding Tracking...' : 'Add Tracking Info'}
      </button>
    </form>
  );
};

// Main Trade Detail Page
const TradeDetailPage = () => {
  const { tradeId } = useParams();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);

  const fetchTrade = useCallback(async () => {
    try {
      const response = await tradesAPI.getById(tradeId);
      setTrade(response.data);
    } catch (error) {
      console.error('Failed to fetch trade:', error);
      setMessage({ type: 'error', text: 'Failed to load trade details' });
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    fetchTrade();
  }, [fetchTrade]);

  // Determine user's role in this trade
  const isInitiator = trade?.initiator_id === user?.id;
  const isRecipient = trade?.recipient_id === user?.id;
  const myItem = isInitiator ? trade?.initiator_item : trade?.recipient_item;
  const theirItem = isInitiator ? trade?.recipient_item : trade?.initiator_item;
  const myAddress = isInitiator ? trade?.initiator_shipping_address : trade?.recipient_shipping_address;
  const theirAddress = isInitiator ? trade?.recipient_shipping_address : trade?.initiator_shipping_address;
  const myTracking = isInitiator ? trade?.initiator_tracking : trade?.recipient_tracking;
  const theirTracking = isInitiator ? trade?.recipient_tracking : trade?.initiator_tracking;
  const iShipped = isInitiator ? trade?.initiator_shipped : trade?.recipient_shipped;
  const theyShipped = isInitiator ? trade?.recipient_shipped : trade?.initiator_shipped;
  const iConfirmedReceipt = isInitiator ? trade?.initiator_confirmed_receipt : trade?.recipient_confirmed_receipt;
  const theyConfirmedReceipt = isInitiator ? trade?.recipient_confirmed_receipt : trade?.initiator_confirmed_receipt;
  const otherUsername = isInitiator ? trade?.recipient_username : trade?.initiator_username;

  const handleRespond = async (action) => {
    setActionLoading(true);
    try {
      await tradesAPI.respond(tradeId, action);
      setMessage({ type: 'success', text: action === 'accept' ? 'Trade accepted!' : 'Trade declined.' });
      fetchTrade();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to respond to trade' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitAddress = async (address) => {
    setActionLoading(true);
    try {
      await tradesAPI.submitAddress(tradeId, address);
      setMessage({ type: 'success', text: 'Shipping address submitted!' });
      fetchTrade();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to submit address' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTracking = async (tracking) => {
    setActionLoading(true);
    try {
      await tradesAPI.addTracking(tradeId, tracking.carrier, tracking.tracking_number, tracking.estimated_delivery);
      setMessage({ type: 'success', text: 'Tracking information added!' });
      fetchTrade();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add tracking' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setActionLoading(true);
    try {
      await tradesAPI.confirmReceipt(tradeId);
      setMessage({ type: 'success', text: 'Receipt confirmed!' });
      fetchTrade();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to confirm receipt' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this trade?')) return;
    setActionLoading(true);
    try {
      await tradesAPI.cancel(tradeId);
      setMessage({ type: 'success', text: 'Trade cancelled.' });
      fetchTrade();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to cancel trade' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!disputeReason.trim()) {
      setMessage({ type: 'error', text: 'Please describe the issue' });
      return;
    }
    setActionLoading(true);
    try {
      const response = await tradesAPI.openDispute(tradeId, disputeReason);
      setMessage({ type: 'success', text: `Dispute opened. Ticket: ${response.data.ticket_number}` });
      setShowDisputeModal(false);
      fetchTrade();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to open dispute' });
    } finally {
      setActionLoading(false);
    }
  };

  const copyAddress = (address) => {
    const text = `${address.full_name}\n${address.address_line1}\n${address.address_line2 ? address.address_line2 + '\n' : ''}${address.city}, ${address.state} ${address.postal_code}\n${address.country}${address.phone ? '\n' + address.phone : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Trade Not Found
          </h1>
          <Link to="/trades" className="btn btn-primary mt-4">
            Back to Trades
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link 
          to="/trades" 
          className={`inline-flex items-center gap-2 mb-6 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Trades
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Trade {trade.trade_number}
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Created {new Date(trade.created_at).toLocaleDateString()}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-lg font-medium ${
            trade.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            trade.status === 'disputed' ? 'bg-orange-500/20 text-orange-400' :
            trade.status === 'cancelled' || trade.status === 'declined' ? 'bg-red-500/20 text-red-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {trade.status.charAt(0).toUpperCase() + trade.status.slice(1).replace('_', ' ')}
          </span>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
          }`}>
            {message.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Trade Items */}
        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Trade Items
          </h2>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Your Item */}
            <div className="flex-1 w-full">
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                You&apos;re trading:
              </p>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-4">
                  {myItem?.listing_image ? (
                    <img 
                      src={myItem.listing_image} 
                      alt={myItem.listing_title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-dark-200' : 'bg-gray-200'
                    }`}>
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {myItem?.listing_title}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Value: ${myItem?.listing_price?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="p-3">
              <ArrowLeftRight className="w-8 h-8 text-primary" />
            </div>

            {/* Their Item */}
            <div className="flex-1 w-full">
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                You&apos;ll receive from {otherUsername}:
              </p>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-4">
                  {theirItem?.listing_image ? (
                    <img 
                      src={theirItem.listing_image} 
                      alt={theirItem.listing_title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-lg flex items-center justify-center ${
                      isDark ? 'bg-dark-200' : 'bg-gray-200'
                    }`}>
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {theirItem?.listing_title}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Value: ${theirItem?.listing_price?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Section - Based on Status */}
        {/* Pending - Show Accept/Decline for Recipient */}
        {trade.status === 'pending' && isRecipient && (
          <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Trade Request
            </h2>
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {trade.initiator_username} wants to trade their item for yours. Would you like to accept?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => handleRespond('decline')} 
                disabled={actionLoading}
                className="btn btn-secondary flex-1"
              >
                Decline
              </button>
              <button 
                onClick={() => handleRespond('accept')} 
                disabled={actionLoading}
                className="btn btn-primary flex-1"
              >
                {actionLoading ? 'Processing...' : 'Accept Trade'}
              </button>
            </div>
          </div>
        )}

        {/* Pending - Waiting message for Initiator */}
        {trade.status === 'pending' && isInitiator && (
          <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-yellow-400" />
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Waiting for Response
              </h2>
            </div>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Your trade proposal has been sent to {otherUsername}. They will be notified and can accept or decline.
            </p>
          </div>
        )}

        {/* Accepted - Show Address Form */}
        {trade.status === 'accepted' && !myAddress && (
          <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Submit Your Shipping Address
            </h2>
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Trade accepted! Please provide your shipping address so {otherUsername} knows where to send your item.
            </p>
            <ShippingAddressForm onSubmit={handleSubmitAddress} loading={actionLoading} isDark={isDark} />
          </div>
        )}

        {/* Accepted - Waiting for other address */}
        {trade.status === 'accepted' && myAddress && !theirAddress && (
          <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-yellow-400" />
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Waiting for Address
              </h2>
            </div>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              You&apos;ve submitted your address. Waiting for {otherUsername} to submit theirs.
            </p>
          </div>
        )}

        {/* Addresses Submitted / Shipping - Show shipping info */}
        {(trade.status === 'addresses_submitted' || trade.status === 'shipping') && (
          <>
            {/* Their Address - for you to ship to */}
            {theirAddress && (
              <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Ship Your Item To:
                  </h2>
                  <button 
                    onClick={() => copyAddress(theirAddress)}
                    className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {copiedAddress ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copiedAddress ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{theirAddress.full_name}</p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{theirAddress.address_line1}</p>
                  {theirAddress.address_line2 && (
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{theirAddress.address_line2}</p>
                  )}
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    {theirAddress.city}, {theirAddress.state} {theirAddress.postal_code}
                  </p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{theirAddress.country}</p>
                  {theirAddress.phone && (
                    <p className={`mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{theirAddress.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Add Tracking Form */}
            {!iShipped && (
              <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Add Tracking Information
                </h2>
                <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Once you&apos;ve shipped your item, add the tracking info below.
                </p>
                <TrackingForm onSubmit={handleAddTracking} loading={actionLoading} isDark={isDark} />
              </div>
            )}

            {/* My Tracking Status */}
            {iShipped && myTracking && (
              <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="w-6 h-6 text-green-400" />
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    You&apos;ve Shipped!
                  </h2>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    <span className="font-medium">Carrier:</span> {myTracking.carrier}
                  </p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    <span className="font-medium">Tracking:</span> {myTracking.tracking_number}
                  </p>
                  {myTracking.tracking_url && (
                    <a 
                      href={myTracking.tracking_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary mt-2"
                    >
                      Track Package <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Their Tracking */}
            {theyShipped && theirTracking ? (
              <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="w-6 h-6 text-purple-400" />
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {otherUsername} Has Shipped!
                  </h2>
                </div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    <span className="font-medium">Carrier:</span> {theirTracking.carrier}
                  </p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    <span className="font-medium">Tracking:</span> {theirTracking.tracking_number}
                  </p>
                  {theirTracking.tracking_url && (
                    <a 
                      href={theirTracking.tracking_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary mt-2"
                    >
                      Track Package <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                
                {/* Confirm Receipt Button */}
                {!iConfirmedReceipt && (
                  <button 
                    onClick={handleConfirmReceipt} 
                    disabled={actionLoading}
                    className="btn btn-primary w-full mt-4"
                  >
                    {actionLoading ? 'Confirming...' : 'Confirm I Received This Item'}
                  </button>
                )}
                
                {iConfirmedReceipt && (
                  <div className="flex items-center gap-2 text-green-400 mt-4">
                    <CheckCircle className="w-5 h-5" />
                    You&apos;ve confirmed receipt
                  </div>
                )}
              </div>
            ) : trade.status === 'shipping' && !theyShipped && (
              <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Waiting for {otherUsername} to Ship
                  </h2>
                </div>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  You&apos;ve done your part! Now waiting for the other party to ship their item.
                </p>
              </div>
            )}
          </>
        )}

        {/* Completed */}
        {trade.status === 'completed' && (
          <div className={`rounded-xl p-6 mb-6 border-2 border-green-500/30 ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <h2 className={`text-xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                Trade Complete!
              </h2>
            </div>
            <p className={`${isDark ? 'text-green-300/80' : 'text-green-600'}`}>
              Congratulations! Both items have been received. Enjoy your new gear!
            </p>
          </div>
        )}

        {/* Cancelled/Declined */}
        {(trade.status === 'cancelled' || trade.status === 'declined') && (
          <div className={`rounded-xl p-6 mb-6 border-2 border-red-500/30 ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              <X className="w-8 h-8 text-red-400" />
              <h2 className={`text-xl font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                Trade {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
              </h2>
            </div>
            <p className={`${isDark ? 'text-red-300/80' : 'text-red-600'}`}>
              This trade has been {trade.status}. The listings have been reactivated.
            </p>
          </div>
        )}

        {/* Disputed */}
        {trade.status === 'disputed' && (
          <div className={`rounded-xl p-6 mb-6 border-2 border-orange-500/30 ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
              <h2 className={`text-xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                Dispute Opened
              </h2>
            </div>
            <p className={`${isDark ? 'text-orange-300/80' : 'text-orange-600'}`}>
              A dispute has been opened for this trade. Our support team will review and contact both parties.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!['completed', 'cancelled', 'declined', 'disputed'].includes(trade.status) && (
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              {trade.status !== 'shipping' && (
                <button 
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="btn btn-secondary"
                >
                  Cancel Trade
                </button>
              )}
              <button 
                onClick={() => setShowDisputeModal(true)}
                className="btn btn-secondary"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Open Dispute
              </button>
              <Link to="/messages" className="btn btn-secondary">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message {otherUsername}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className={`rounded-xl p-6 max-w-md w-full ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Open a Dispute
            </h2>
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Please describe the issue with this trade. Our support team will review and contact both parties.
            </p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the issue..."
              rows={4}
              className="w-full mb-4"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDisputeModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleOpenDispute}
                disabled={actionLoading || !disputeReason.trim()}
                className="btn btn-primary flex-1"
              >
                {actionLoading ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeDetailPage;
