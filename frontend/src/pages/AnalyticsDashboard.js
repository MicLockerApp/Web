import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDateRange } from '../context/DateRangeContext';
import api, { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart3, TrendingUp, DollarSign, Package, Users, Search, MessageSquare,
  ShoppingCart, Tag, AlertTriangle, RefreshCw, Calendar, Clock, ArrowUp, ArrowDown,
  Activity, Target, Percent, Shield, Eye, Ticket, ChevronRight, Globe, ArrowLeft, X
} from 'lucide-react';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { startDate, endDate, setStartDate, setEndDate, formatDateRange, getDateParams, setLast7Days, setLast30Days, setLast90Days } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [realtimeMetrics, setRealtimeMetrics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [offerFunnel, setOfferFunnel] = useState(null);
  const [searchFunnel, setSearchFunnel] = useState(null);
  const [marketplaceHealth, setMarketplaceHealth] = useState(null);
  const [trustSafety, setTrustSafety] = useState(null);
  const [topSearchTerms, setTopSearchTerms] = useState([]);
  const [ticketStats, setTicketStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [dailyVisitors, setDailyVisitors] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    reset_orders: false,
    reset_analytics_events: false,
    reset_analytics_rollups: false,
    reset_support_tickets: false,
    reset_all: false
  });
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  
  // Check if user can reset (admin or owner)
  const canResetAnalytics = user?.role === 'owner' || user?.role === 'admin' || user?.is_admin;

  const fetchAnalytics = useCallback(async () => {
    if (!isAuthenticated || !user?.is_admin) return;
    
    setLoading(true);
    const { start_date, end_date } = getDateParams();
    
    try {
      const [realtime, revenue, offers, search, health, safety, terms, tickets, ticketList, visitors] = await Promise.all([
        api.get('/analytics/realtime'),
        api.get(`/analytics/revenue?start_date=${start_date}&end_date=${end_date}`),
        api.get(`/analytics/offer-funnel?start_date=${start_date}&end_date=${end_date}`),
        api.get(`/analytics/search-funnel?start_date=${start_date}&end_date=${end_date}`),
        api.get(`/analytics/marketplace-health?start_date=${start_date}&end_date=${end_date}`),
        api.get(`/analytics/trust-safety?start_date=${start_date}&end_date=${end_date}`),
        api.get(`/analytics/search-terms?start_date=${start_date}&end_date=${end_date}&limit=10`),
        api.get('/tickets/admin/stats').catch(() => ({ data: null })),
        api.get('/tickets/admin/all?limit=5').catch(() => ({ data: { tickets: [] } })),
        api.get(`/analytics/daily-visitors?start_date=${start_date}&end_date=${end_date}`)
      ]);
      
      setRealtimeMetrics(realtime.data);
      setRevenueData(revenue.data);
      setOfferFunnel(offers.data);
      setSearchFunnel(search.data);
      setMarketplaceHealth(health.data);
      setTrustSafety(safety.data);
      setTopSearchTerms(terms.data.terms || []);
      setTicketStats(tickets.data);
      setRecentTickets(ticketList.data?.tickets || []);
      setDailyVisitors(visitors.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, getDateParams]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!authLoading && user && !user.is_admin) {
      navigate('/');
      return;
    }
    fetchAnalytics();
  }, [authLoading, isAuthenticated, user, navigate, fetchAnalytics]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  // Handle reset analytics
  const handleResetAnalytics = async () => {
    if (resetConfirmation !== 'CONFIRM_RESET') {
      setResetError('Please type CONFIRM_RESET to proceed');
      return;
    }
    
    const hasSelection = resetOptions.reset_all || resetOptions.reset_orders || 
                         resetOptions.reset_analytics_events || resetOptions.reset_analytics_rollups ||
                         resetOptions.reset_support_tickets;
    
    if (!hasSelection) {
      setResetError('Please select at least one option to reset');
      return;
    }
    
    setResetLoading(true);
    setResetError('');
    
    try {
      await adminAPI.resetAnalytics({
        ...resetOptions,
        confirmation: resetConfirmation
      });
      
      // Refresh analytics data
      fetchAnalytics();
      
      // Close modal and reset state
      setShowResetModal(false);
      setResetOptions({
        reset_orders: false,
        reset_analytics_events: false,
        reset_analytics_rollups: false,
        reset_support_tickets: false,
        reset_all: false
      });
      setResetConfirmation('');
      
      alert('Analytics data reset successfully!');
    } catch (error) {
      setResetError(error.response?.data?.detail || 'Failed to reset analytics');
    } finally {
      setResetLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-dark-600" data-testid="analytics-dashboard">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 bg-dark-400 rounded-lg hover:bg-dark-300 transition-colors"
              data-testid="back-to-admin-btn"
              title="Back to Admin Panel"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                <p className="text-gray-400 text-sm">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Reset Analytics Button - Only for Admin/Owner */}
            {canResetAnalytics && (
              <button
                onClick={() => setShowResetModal(true)}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-900/30 border border-red-500/30 text-red-400 hover:bg-red-900/50 transition-colors flex items-center gap-1"
                data-testid="reset-analytics-btn"
              >
                <AlertTriangle className="w-3 h-3" />
                Reset Data
              </button>
            )}
            
            {/* Quick date presets */}
            <div className="flex gap-1">
              <button
                onClick={() => { setLast7Days(); }}
                className="px-3 py-1.5 text-xs rounded-lg bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300 transition-colors"
              >
                7D
              </button>
              <button
                onClick={() => { setLast30Days(); }}
                className="px-3 py-1.5 text-xs rounded-lg bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300 transition-colors"
              >
                30D
              </button>
              <button
                onClick={() => { setLast90Days(); }}
                className="px-3 py-1.5 text-xs rounded-lg bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300 transition-colors"
              >
                90D
              </button>
            </div>
            
            {/* Custom Date Range Picker - Modern Styled */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-dark-400 to-dark-300 rounded-xl p-3 border border-dark-200 shadow-lg">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wider">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input-themed bg-dark-300 border border-dark-200 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer hover:bg-dark-200 transition-colors"
                  data-testid="start-date-input"
                />
              </div>
              <div className="w-8 h-0.5 bg-gradient-to-r from-primary/50 to-cyan-500/50 rounded-full"></div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wider">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input-themed bg-dark-300 border border-dark-200 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer hover:bg-dark-200 transition-colors"
                  data-testid="end-date-input"
                />
              </div>
            </div>
            
            <button
              onClick={fetchAnalytics}
              className="btn btn-primary"
              disabled={loading}
              data-testid="apply-date-range-btn"
            >
              Apply
            </button>
            
            <button
              onClick={fetchAnalytics}
              className="btn btn-secondary"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Date Range Display */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm">
            Showing data for: <span className="text-primary font-medium">{formatDateRange()}</span>
          </p>
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-dark-400 rounded-xl p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-gray-400 text-sm">Orders Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{realtimeMetrics?.orders_today || 0}</p>
            {realtimeMetrics?.orders_delta_pct !== 0 && (
              <p className={`text-xs flex items-center gap-1 ${realtimeMetrics?.orders_delta_pct > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {realtimeMetrics?.orders_delta_pct > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {formatPercent(Math.abs(realtimeMetrics?.orders_delta_pct))} vs yesterday
              </p>
            )}
          </div>
          
          <div className="bg-dark-400 rounded-xl p-4 border-l-4 border-primary">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-gray-400 text-sm">GMV Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(realtimeMetrics?.gmv_today)}</p>
          </div>
          
          <div className="bg-dark-400 rounded-xl p-4 border-l-4 border-cyan-500">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-400 text-sm">Visitors Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{realtimeMetrics?.visitors_today || 0}</p>
            <p className="text-xs text-gray-500">Unique sessions</p>
          </div>
          
          <div className="bg-dark-400 rounded-xl p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400 text-sm">New Users Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{realtimeMetrics?.new_users_today || 0}</p>
          </div>
          
          <div className="bg-dark-400 rounded-xl p-4 border-l-4 border-purple-500">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400 text-sm">New Listings Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{realtimeMetrics?.new_listings_today || 0}</p>
          </div>
        </div>

        {/* Revenue Section */}
        <div className="bg-dark-400 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Revenue Summary
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Gross Merchandise Value</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(revenueData?.totals?.gross_merchandise_value)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Platform Fees (3%)</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(revenueData?.totals?.platform_fees_collected)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Processing Fees</p>
              <p className="text-2xl font-bold text-cyan-400">{formatCurrency(revenueData?.totals?.processing_fees_collected)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Net Platform Revenue</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(revenueData?.totals?.net_platform_revenue)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-white">{revenueData?.totals?.order_count || 0}</p>
              <p className="text-gray-500 text-xs">AOV: {formatCurrency(revenueData?.totals?.average_order_value)}</p>
            </div>
          </div>
        </div>

        {/* Daily Visitors Section */}
        <div className="bg-dark-400 rounded-xl p-6 mb-8" data-testid="daily-visitors-section">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Daily Visitors
          </h2>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-dark-500 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-cyan-400">{dailyVisitors?.total_visitors || 0}</p>
              <p className="text-gray-500 text-sm">Total Visitors</p>
            </div>
            <div className="bg-dark-500 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">{dailyVisitors?.avg_daily_visitors || 0}</p>
              <p className="text-gray-500 text-sm">Avg Daily</p>
            </div>
            <div className="bg-dark-500 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">{dailyVisitors?.days_with_data || 0}</p>
              <p className="text-gray-500 text-sm">Days Tracked</p>
            </div>
          </div>
          
          {/* Visitor Chart */}
          {dailyVisitors?.timeline && dailyVisitors.timeline.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-white font-medium mb-4">Daily Breakdown</h3>
              <div className="overflow-x-auto pb-4">
                <div className="flex items-end gap-2 min-w-fit h-64 pt-8 relative">
                  {dailyVisitors.timeline.map((day, index) => {
                    const maxVisitors = Math.max(...dailyVisitors.timeline.map(d => d.visitors), 1);
                    const height = (day.visitors / maxVisitors) * 100;
                    // Parse date as local time to avoid timezone shift
                    const [year, month, dayNum] = day.date.split('-').map(Number);
                    const localDate = new Date(year, month - 1, dayNum);
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 min-w-[50px] max-w-[80px]">
                        {/* Visitor count label above bar */}
                        <span className="text-cyan-400 text-sm font-bold mb-1">
                          {day.visitors}
                        </span>
                        {/* Bar */}
                        <div 
                          className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md hover:from-cyan-500 hover:to-cyan-300 transition-all cursor-pointer relative"
                          style={{ height: `${Math.max(height, 8)}%`, minHeight: '20px' }}
                          title={`${day.visitors} visitors on ${localDate.toLocaleDateString()}`}
                        />
                        {/* Date label below bar */}
                        <div className="mt-2 text-center">
                          <span className="text-gray-400 text-xs block">
                            {localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Y-axis reference line */}
              <div className="flex justify-between text-gray-500 text-xs mt-2 border-t border-dark-300 pt-2">
                <span>0 visitors</span>
                <span>{Math.max(...dailyVisitors.timeline.map(d => d.visitors))} visitors (max)</span>
              </div>
            </div>
          ) : (
            <div className="bg-dark-500 rounded-lg p-8 text-center">
              <Globe className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No visitor data available yet</p>
              <p className="text-gray-600 text-sm">Visitor tracking requires page view events</p>
            </div>
          )}
        </div>

        {/* Funnels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Offer Funnel */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-yellow-400" />
              Offer Funnel
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Created</span>
                <span className="text-white font-medium">{offerFunnel?.funnel?.offers_created || 0}</span>
              </div>
              <div className="w-full bg-dark-300 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Countered</span>
                <span className="text-white font-medium">{offerFunnel?.funnel?.offers_countered || 0}</span>
              </div>
              <div className="w-full bg-dark-300 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${offerFunnel?.funnel?.offers_created ? (offerFunnel.funnel.offers_countered / offerFunnel.funnel.offers_created) * 100 : 0}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Accepted</span>
                <span className="text-white font-medium">{offerFunnel?.funnel?.offers_accepted || 0}</span>
              </div>
              <div className="w-full bg-dark-300 rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full" style={{ width: `${offerFunnel?.funnel?.offers_created ? (offerFunnel.funnel.offers_accepted / offerFunnel.funnel.offers_created) * 100 : 0}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Converted to Purchase</span>
                <span className="text-white font-medium">{offerFunnel?.funnel?.offers_converted_to_purchase || 0}</span>
              </div>
              <div className="w-full bg-dark-300 rounded-full h-2">
                <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${offerFunnel?.funnel?.offers_created ? (offerFunnel.funnel.offers_converted_to_purchase / offerFunnel.funnel.offers_created) * 100 : 0}%` }}></div>
              </div>
              
              <div className="pt-4 border-t border-dark-300 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-xs">Created → Accepted</p>
                  <p className="text-white font-bold">{formatPercent(offerFunnel?.funnel?.created_to_accepted_rate)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Accepted → Purchase</p>
                  <p className="text-white font-bold">{formatPercent(offerFunnel?.funnel?.accepted_to_purchase_rate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Funnel */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              Search Funnel
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Searches</span>
                <span className="text-white font-medium">{searchFunnel?.funnel?.total_searches || 0}</span>
              </div>
              <div className="w-full bg-dark-300 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Listing Views</span>
                <span className="text-white font-medium">{searchFunnel?.funnel?.listing_views_from_search || 0}</span>
              </div>
              <div className="w-full bg-dark-300 rounded-full h-2">
                <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${searchFunnel?.funnel?.total_searches ? (searchFunnel.funnel.listing_views_from_search / searchFunnel.funnel.total_searches) * 100 : 0}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Add to Cart</span>
                <span className="text-white font-medium">{searchFunnel?.funnel?.cart_adds_from_search || 0}</span>
              </div>
              <div className="w-full bg-dark-300 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${searchFunnel?.funnel?.total_searches ? (searchFunnel.funnel.cart_adds_from_search / searchFunnel.funnel.total_searches) * 100 : 0}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Purchases</span>
                <span className="text-white font-medium">{searchFunnel?.funnel?.purchases_from_search || 0}</span>
              </div>
              <div className="w-full bg-dark-300 rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full" style={{ width: `${searchFunnel?.funnel?.total_searches ? (searchFunnel.funnel.purchases_from_search / searchFunnel.funnel.total_searches) * 100 : 0}%` }}></div>
              </div>
              
              <div className="pt-4 border-t border-dark-300 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-xs">Zero Result Rate</p>
                  <p className={`font-bold ${searchFunnel?.funnel?.zero_result_rate > 10 ? 'text-red-400' : 'text-white'}`}>
                    {formatPercent(searchFunnel?.funnel?.zero_result_rate)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Search → Purchase</p>
                  <p className="text-white font-bold">{formatPercent(searchFunnel?.funnel?.search_to_purchase_rate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Marketplace Health */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Marketplace Health
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Listings</span>
                <span className="text-white">{marketplaceHealth?.health?.active_listings || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Buyers</span>
                <span className="text-white">{marketplaceHealth?.health?.active_buyers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Sellers</span>
                <span className="text-white">{marketplaceHealth?.health?.active_sellers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Buyer/Seller Ratio</span>
                <span className="text-white">{(marketplaceHealth?.health?.buyer_to_seller_ratio || 0).toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Inventory Turnover</span>
                <span className="text-white">{formatPercent((marketplaceHealth?.health?.inventory_turnover_rate || 0) * 100)}</span>
              </div>
            </div>
          </div>

          {/* Trust & Safety */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Trust & Safety
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Refunds Initiated</span>
                <span className={`${trustSafety?.metrics?.refunds_initiated > 0 ? 'text-yellow-400' : 'text-white'}`}>
                  {trustSafety?.metrics?.refunds_initiated || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Refund Rate</span>
                <span className={`${trustSafety?.metrics?.refund_rate > 0.05 ? 'text-red-400' : 'text-white'}`}>
                  {formatPercent((trustSafety?.metrics?.refund_rate || 0) * 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Listings Flagged</span>
                <span className="text-white">{trustSafety?.metrics?.listings_flagged || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Users Suspended</span>
                <span className="text-white">{trustSafety?.metrics?.users_suspended || 0}</span>
              </div>
            </div>
          </div>

          {/* Top Search Terms */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-400" />
              Top Search Terms
            </h2>
            
            {topSearchTerms.length > 0 ? (
              <div className="space-y-2">
                {topSearchTerms.slice(0, 8).map((term, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-300 truncate flex-1 mr-2">{term.term}</span>
                    <span className="text-gray-500 text-sm">{term.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No search data available</p>
            )}
          </div>
        </div>

        {/* Support Tickets Section */}
        <div className="mt-6">
          <div className="bg-dark-400 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-orange-400" />
                Pending Customer Tickets
              </h2>
              <Link 
                to="/admin/tickets" 
                className="text-primary hover:text-yellow-400 text-sm flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Ticket Stats */}
            {ticketStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-dark-500 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-orange-400">{ticketStats.pending_total || 0}</p>
                  <p className="text-gray-500 text-sm">Pending</p>
                </div>
                <div className="bg-dark-500 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-400">{ticketStats.urgent_tickets || 0}</p>
                  <p className="text-gray-500 text-sm">Urgent</p>
                </div>
                <div className="bg-dark-500 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-yellow-400">{ticketStats.high_priority || 0}</p>
                  <p className="text-gray-500 text-sm">High Priority</p>
                </div>
                <div className="bg-dark-500 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-400">{ticketStats.tickets_today || 0}</p>
                  <p className="text-gray-500 text-sm">Today</p>
                </div>
                <div className="bg-dark-500 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{ticketStats.resolved || 0}</p>
                  <p className="text-gray-500 text-sm">Resolved</p>
                </div>
              </div>
            )}

            {/* Recent Tickets */}
            <h3 className="text-white font-medium mb-3">Recent Tickets</h3>
            {recentTickets.length > 0 ? (
              <div className="space-y-2">
                {recentTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="bg-dark-500 rounded-lg p-4 flex items-center justify-between hover:bg-dark-300 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-primary font-mono text-sm">{ticket.ticket_number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                          ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          ticket.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {ticket.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          ticket.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                          ticket.status === 'in_progress' ? 'bg-purple-500/20 text-purple-400' :
                          ticket.status === 'waiting_on_customer' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-white font-medium">{ticket.subject}</p>
                      <p className="text-gray-500 text-sm">{ticket.category} • {ticket.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-sm">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-dark-500 rounded-lg p-8 text-center">
                <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No support tickets yet</p>
                <p className="text-gray-600 text-sm">Customer tickets will appear here</p>
              </div>
            )}

            {/* Category Breakdown */}
            {ticketStats?.top_categories?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-dark-300">
                <h3 className="text-white font-medium mb-3">Top Categories (Open Tickets)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {ticketStats.top_categories.map((cat, index) => (
                    <div key={index} className="bg-dark-500 rounded-lg p-3 text-center">
                      <p className="text-white font-bold">{cat.count}</p>
                      <p className="text-gray-500 text-xs truncate">{cat.category}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reset Analytics Modal */}
        {showResetModal && canResetAnalytics && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-400 rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Reset Analytics Data</h2>
                    <p className="text-gray-500 text-sm">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetError('');
                    setResetConfirmation('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {resetError && (
                <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                  {resetError}
                </div>
              )}

              <div className="space-y-3 mb-6">
                <p className="text-gray-400 text-sm mb-4">Select the data you want to reset:</p>
                
                <label className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-200">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_orders}
                    onChange={(e) => setResetOptions({ ...resetOptions, reset_orders: e.target.checked, reset_all: false })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-white font-medium">Orders</p>
                    <p className="text-gray-500 text-xs">Delete all order records</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-200">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_analytics_events}
                    onChange={(e) => setResetOptions({ ...resetOptions, reset_analytics_events: e.target.checked, reset_all: false })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-white font-medium">Analytics Events</p>
                    <p className="text-gray-500 text-xs">Delete raw analytics event data</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-200">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_analytics_rollups}
                    onChange={(e) => setResetOptions({ ...resetOptions, reset_analytics_rollups: e.target.checked, reset_all: false })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-white font-medium">Analytics Rollups</p>
                    <p className="text-gray-500 text-xs">Delete aggregated analytics (Dashboard stats)</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-200">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_support_tickets}
                    onChange={(e) => setResetOptions({ ...resetOptions, reset_support_tickets: e.target.checked, reset_all: false })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-white font-medium">Support Tickets</p>
                    <p className="text-gray-500 text-xs">Delete all support ticket records</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg cursor-pointer hover:bg-red-900/30">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_all}
                    onChange={(e) => setResetOptions({
                      reset_orders: e.target.checked,
                      reset_analytics_events: e.target.checked,
                      reset_analytics_rollups: e.target.checked,
                      reset_support_tickets: e.target.checked,
                      reset_all: e.target.checked
                    })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-red-400 font-medium">Reset All</p>
                    <p className="text-gray-500 text-xs">Delete ALL analytics and order data</p>
                  </div>
                </label>
              </div>

              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2">
                  Type <span className="text-red-400 font-mono">CONFIRM_RESET</span> to proceed:
                </label>
                <input
                  type="text"
                  value={resetConfirmation}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  placeholder="CONFIRM_RESET"
                  className="w-full bg-dark-300 border border-dark-200 rounded-lg px-4 py-3 text-white font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetError('');
                    setResetConfirmation('');
                  }}
                  className="flex-1 py-3 bg-dark-300 hover:bg-dark-200 text-gray-400 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAnalytics}
                  disabled={resetLoading || resetConfirmation !== 'CONFIRM_RESET'}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Data'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
