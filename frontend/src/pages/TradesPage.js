import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { tradesAPI, listingsAPI } from '../services/api';
import { 
  ArrowLeftRight, Package, Truck, Check, X, MessageSquare,
  AlertTriangle, Clock, ChevronRight, ExternalLink, MapPin,
  RefreshCw, Star
} from 'lucide-react';

// Trade Rules Modal Component
const TradeRulesModal = ({ isOpen, onClose, onAccept, isDark }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className={`rounded-xl p-6 max-w-lg w-full ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-6">
          <ArrowLeftRight className="w-8 h-8 text-primary" />
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Trading on MicLocker
          </h2>
        </div>

        <div className="space-y-4 mb-6">
          <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
            <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              🎉 Trade for Free!
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Unlike sales, trades have <strong>no platform fees</strong>. You keep everything you trade for!
            </p>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
            <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              📆 Monthly Limit
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Each user gets <strong>1 free trade per month</strong>. Your trade count resets on the 1st of each month.
            </p>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
            <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              🤝 How It Works
            </h3>
            <ol className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <li>1. Propose a trade by selecting your item and theirs</li>
              <li>2. Wait for the other party to accept</li>
              <li>3. Both parties exchange shipping addresses</li>
              <li>4. Ship your items and add tracking</li>
              <li>5. Confirm receipt when items arrive</li>
            </ol>
          </div>

          <div className={`p-4 rounded-lg border ${isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
            <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
              <AlertTriangle className="w-4 h-4" />
              Need Help?
            </h3>
            <p className={`text-sm ${isDark ? 'text-yellow-300/80' : 'text-yellow-600'}`}>
              If there&apos;s an issue with your trade, you can open a dispute and our support team will assist you.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={onAccept} className="btn btn-primary flex-1">
            I Understand, Let&apos;s Trade!
          </button>
        </div>
      </div>
    </div>
  );
};

// Trade Status Badge
const TradeStatusBadge = ({ status, isDark }) => {
  const statusConfig = {
    pending: { color: 'yellow', label: 'Pending', icon: Clock },
    accepted: { color: 'blue', label: 'Accepted', icon: Check },
    addresses_submitted: { color: 'blue', label: 'Ready to Ship', icon: MapPin },
    shipping: { color: 'purple', label: 'Shipping', icon: Truck },
    completed: { color: 'green', label: 'Completed', icon: Check },
    declined: { color: 'red', label: 'Declined', icon: X },
    cancelled: { color: 'gray', label: 'Cancelled', icon: X },
    disputed: { color: 'orange', label: 'Disputed', icon: AlertTriangle },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  const colorClasses = {
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  return (
    <span className={`badge border ${colorClasses[config.color]} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Main Trades Page Component
const TradesPage = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchTrades = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const response = await tradesAPI.getAll(params);
      setTrades(response.data.trades || []);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchEligibility = async () => {
    try {
      const response = await tradesAPI.checkEligibility();
      setEligibility(response.data);
      
      // Show rules modal if user hasn't seen it
      if (response.data.eligible && !response.data.has_seen_rules) {
        setShowRulesModal(true);
      }
    } catch (error) {
      console.error('Failed to check eligibility:', error);
    }
  };

  useEffect(() => {
    fetchTrades();
    fetchEligibility();
  }, [fetchTrades]);

  const handleAcceptRules = async () => {
    try {
      await tradesAPI.acknowledgeRules();
      setShowRulesModal(false);
      fetchEligibility();
    } catch (error) {
      console.error('Failed to acknowledge rules:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              My Trades
            </h1>
            <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Swap gear directly with other musicians - no fees!
            </p>
          </div>
          
          {/* Eligibility Status */}
          {eligibility && (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
              {eligibility.eligible ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {eligibility.trades_remaining} Free Trade Available
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Resets on the 1st of each month
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Monthly Limit Reached
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Next trade: {eligibility.next_trade_available}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: '', label: 'All Trades' },
            { value: 'pending', label: 'Pending' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'shipping', label: 'Shipping' },
            { value: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'bg-primary text-black'
                  : isDark 
                    ? 'bg-dark-400 text-gray-300 hover:bg-dark-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Trades List */}
        {trades.length === 0 ? (
          <div className={`text-center py-16 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200'}`}>
            <ArrowLeftRight className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              No trades yet
            </h2>
            <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Browse listings and propose a trade to get started!
            </p>
            <Link to="/browse" className="btn btn-primary">
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map(trade => (
              <Link
                key={trade.id}
                to={`/trades/${trade.id}`}
                className={`block rounded-xl p-6 transition-all hover:scale-[1.01] ${
                  isDark 
                    ? 'bg-dark-400 hover:bg-dark-300' 
                    : 'bg-white border border-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {trade.trade_number}
                    </span>
                    <TradeStatusBadge status={trade.status} isDark={isDark} />
                  </div>
                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {new Date(trade.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Trade Items */}
                <div className="flex items-center gap-4">
                  {/* Your Item */}
                  <div className="flex-1">
                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {trade.initiator_id === user?.id ? 'You offered' : `${trade.initiator_username} offered`}
                    </p>
                    <div className="flex items-center gap-3">
                      {trade.initiator_item.listing_image ? (
                        <img 
                          src={trade.initiator_item.listing_image} 
                          alt={trade.initiator_item.listing_title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                          isDark ? 'bg-dark-300' : 'bg-gray-100'
                        }`}>
                          <Package className={`w-6 h-6 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                        </div>
                      )}
                      <div>
                        <p className={`font-medium line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {trade.initiator_item.listing_title}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          ${trade.initiator_item.listing_price?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="px-4">
                    <ArrowLeftRight className={`w-6 h-6 ${isDark ? 'text-primary' : 'text-primary'}`} />
                  </div>

                  {/* Their Item */}
                  <div className="flex-1">
                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {trade.recipient_id === user?.id ? 'You offered' : `${trade.recipient_username} offered`}
                    </p>
                    <div className="flex items-center gap-3">
                      {trade.recipient_item.listing_image ? (
                        <img 
                          src={trade.recipient_item.listing_image} 
                          alt={trade.recipient_item.listing_title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                          isDark ? 'bg-dark-300' : 'bg-gray-100'
                        }`}>
                          <Package className={`w-6 h-6 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                        </div>
                      )}
                      <div>
                        <p className={`font-medium line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {trade.recipient_item.listing_title}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          ${trade.recipient_item.listing_price?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Trade Rules Modal */}
      <TradeRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        onAccept={handleAcceptRules}
        isDark={isDark}
      />
    </div>
  );
};

export default TradesPage;
