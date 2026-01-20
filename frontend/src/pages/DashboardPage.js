import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, DollarSign, MessageSquare, Plus, Eye, Edit2, Trash2, Star, Truck, Clock, CheckCircle, AlertCircle, Copy, ExternalLink, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { listingsAPI, ordersAPI, offersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tracking modal state
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingData, setTrackingData] = useState({
    carrier: 'USPS',
    tracking_number: '',
    estimated_delivery: ''
  });
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [trackingSuccess, setTrackingSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'listings') {
        const res = await listingsAPI.search({ seller_id: user.id, limit: 50 });
        setListings(res.data.listings || []);
      } else if (activeTab === 'orders') {
        const res = await ordersAPI.getAll({ limit: 50 });
        setOrders(res.data.orders || []);
      } else if (activeTab === 'sales') {
        const res = await ordersAPI.getSales({ limit: 50 });
        setSales(res.data.orders || []);
      } else if (activeTab === 'offers') {
        const res = await offersAPI.getAll('received', { limit: 50 });
        setOffers(res.data.offers || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await listingsAPI.delete(listingId);
      setListings(listings.filter(l => l.id !== listingId));
    } catch (error) {
      console.error('Error deleting listing:', error);
    }
  };

  const handleOfferAction = async (offerId, action) => {
    try {
      if (action === 'accept') {
        await offersAPI.accept(offerId);
      } else if (action === 'decline') {
        await offersAPI.decline(offerId);
      }
      fetchData();
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const openTrackingModal = (order) => {
    setSelectedOrder(order);
    setTrackingData({
      carrier: order.tracking_info?.carrier || 'USPS',
      tracking_number: order.tracking_info?.tracking_number || '',
      estimated_delivery: order.tracking_info?.estimated_delivery || ''
    });
    setTrackingError('');
    setTrackingSuccess('');
    setShowTrackingModal(true);
  };

  const handleAddTracking = async (e) => {
    e.preventDefault();
    if (!trackingData.tracking_number.trim()) {
      setTrackingError('Please enter a tracking number');
      return;
    }
    
    setTrackingLoading(true);
    setTrackingError('');
    setTrackingSuccess('');
    
    try {
      await ordersAPI.addTracking(selectedOrder.id, trackingData);
      setTrackingSuccess('Tracking information added successfully! The buyer has been notified.');
      
      // Refresh sales data
      setTimeout(() => {
        fetchData();
        setShowTrackingModal(false);
      }, 2000);
    } catch (error) {
      setTrackingError(error.response?.data?.detail || 'Failed to add tracking information');
    } finally {
      setTrackingLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-500/20 text-green-400',
      sold: 'bg-primary/20 text-primary',
      draft: 'bg-yellow-500/20 text-yellow-400',
      removed: 'bg-red-500/20 text-red-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      awaiting_payment: 'bg-orange-500/20 text-orange-400',
      paid: 'bg-blue-500/20 text-blue-400',
      shipped: 'bg-purple-500/20 text-purple-400',
      delivered: 'bg-green-500/20 text-green-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
      refunded: 'bg-red-500/20 text-red-400',
      countered: 'bg-yellow-500/20 text-yellow-400',
      accepted: 'bg-green-500/20 text-green-400',
      declined: 'bg-red-500/20 text-red-400',
    };
    return colors[status] || 'bg-dark-300 text-gray-300';
  };

  const getPayoutStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
      held: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Funds Held' },
      released: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Released' },
      paid: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Paid Out' },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelled' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Calculate total earnings from sales
  const totalEarnings = sales
    .filter(s => ['paid', 'shipped', 'delivered', 'completed'].includes(s.status))
    .reduce((sum, s) => sum + (s.seller_payout_amount || 0), 0);

  const pendingShipments = sales.filter(s => s.status === 'paid').length;
  const releasedPayouts = sales.filter(s => s.seller_payout_status === 'released').length;

  return (
    <div className="min-h-screen" data-testid="dashboard-page">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Seller Dashboard</h1>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Welcome back, {user?.username}</p>
          </div>
          <Link to="/sell" className="btn btn-primary" data-testid="create-listing-button">
            <Plus className="w-4 h-4" />
            Create Listing
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-400 rounded-xl p-4">
            <Package className="w-8 h-8 text-primary mb-2" />
            <p className="text-2xl font-bold text-white">{listings.filter(l => l.status === 'active').length}</p>
            <p className="text-gray-400 text-sm">Active Listings</p>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <DollarSign className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">${totalEarnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-gray-400 text-sm">Total Earnings</p>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <Truck className="w-8 h-8 text-orange-400 mb-2" />
            <p className="text-2xl font-bold text-white">{pendingShipments}</p>
            <p className="text-gray-400 text-sm">Awaiting Shipment</p>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <Star className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-white">{user?.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-gray-400 text-sm">Rating ({user?.review_count || 0} reviews)</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-dark-300 mb-8 overflow-x-auto">
          {[
            { id: 'listings', label: 'My Listings', icon: Package },
            { id: 'sales', label: 'Sales', icon: DollarSign, badge: pendingShipments > 0 ? pendingShipments : null },
            { id: 'orders', label: 'Purchases', icon: Package },
            { id: 'offers', label: 'Offers', icon: MessageSquare, badge: offers.filter(o => o.status === 'pending').length || null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-2 font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Listings Tab */}
            {activeTab === 'listings' && (
              <div className="space-y-4">
                {listings.length > 0 ? (
                  listings.map(listing => (
                    <div key={listing.id} className="bg-dark-400 rounded-xl p-4 flex gap-4">
                      <img
                        src={listing.media?.[0]?.url || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                        alt={listing.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <Link to={`/listing/${listing.id}`} className="text-white font-medium hover:text-primary">
                          {listing.title}
                        </Link>
                        <p className="text-primary font-bold mt-1">${listing.price.toLocaleString()}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(listing.status)}`}>
                            {listing.status}
                          </span>
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {listing.view_count || 0} views
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to={`/dashboard/listings/${listing.id}/edit`}
                          className="p-2 bg-dark-300 rounded-lg hover:bg-dark-200"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </Link>
                        <button
                          onClick={() => handleDeleteListing(listing.id)}
                          className="p-2 bg-dark-300 rounded-lg hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No listings yet</p>
                    <Link to="/sell" className="btn btn-primary">Create Your First Listing</Link>
                  </div>
                )}
              </div>
            )}

            {/* Sales Tab - Enhanced with tracking */}
            {activeTab === 'sales' && (
              <div className="space-y-4">
                {/* Pending Shipments Alert */}
                {pendingShipments > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-orange-400 font-medium">
                        You have {pendingShipments} order{pendingShipments > 1 ? 's' : ''} awaiting shipment
                      </p>
                      <p className="text-orange-400/70 text-sm">
                        Add tracking information to notify buyers and release your funds after delivery.
                      </p>
                    </div>
                  </div>
                )}

                {sales.length > 0 ? (
                  sales.map(order => (
                    <div key={order.id} className="bg-dark-400 rounded-xl p-5">
                      {/* Order Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-bold">{order.order_number}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mt-1">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold text-lg">
                            +${(order.seller_payout_amount || 0).toFixed(2)}
                          </p>
                          {getPayoutStatusBadge(order.seller_payout_status)}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="flex gap-3 mb-4">
                        {order.items?.slice(0, 3).map((item, idx) => (
                          <img
                            key={idx}
                            src={item.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                            alt={item.listing_title}
                            className="w-14 h-14 object-cover rounded-lg"
                          />
                        ))}
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {order.items?.[0]?.listing_title}
                            {order.items?.length > 1 && ` +${order.items.length - 1} more`}
                          </p>
                          <p className="text-gray-400 text-sm">Buyer: {order.buyer_username}</p>
                        </div>
                      </div>

                      {/* Shipping Address */}
                      {order.shipping_address && (
                        <div className="bg-dark-300 rounded-lg p-3 mb-4">
                          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Ship To:</p>
                          <p className="text-white text-sm">
                            {order.shipping_address.full_name}<br />
                            {order.shipping_address.address_line1}<br />
                            {order.shipping_address.address_line2 && <>{order.shipping_address.address_line2}<br /></>}
                            {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                          </p>
                        </div>
                      )}

                      {/* Tracking Info or Add Tracking Button */}
                      {order.tracking_info?.tracking_number ? (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-400 text-xs uppercase tracking-wider mb-1">
                                <Truck className="w-3 h-3 inline mr-1" />
                                Tracking ({order.tracking_info.carrier})
                              </p>
                              <p className="text-white font-mono">{order.tracking_info.tracking_number}</p>
                              {order.tracking_info.estimated_delivery && (
                                <p className="text-gray-400 text-sm mt-1">
                                  Est. Delivery: {order.tracking_info.estimated_delivery}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => copyToClipboard(order.tracking_info.tracking_number)}
                                className="p-2 bg-dark-300 rounded-lg hover:bg-dark-200"
                                title="Copy tracking number"
                              >
                                <Copy className="w-4 h-4 text-gray-400" />
                              </button>
                              {order.tracking_info.tracking_url && (
                                <a
                                  href={order.tracking_info.tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-dark-300 rounded-lg hover:bg-dark-200"
                                  title="Track package"
                                >
                                  <ExternalLink className="w-4 h-4 text-gray-400" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : order.status === 'paid' ? (
                        <button
                          onClick={() => openTrackingModal(order)}
                          className="w-full btn btn-primary flex items-center justify-center gap-2"
                        >
                          <Truck className="w-4 h-4" />
                          Add Tracking Information
                        </button>
                      ) : null}

                      {/* View Order Link */}
                      <div className="mt-4 pt-4 border-t border-dark-300">
                        <Link
                          to={`/orders/${order.id}`}
                          className="text-primary text-sm hover:underline"
                        >
                          View Full Order Details →
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No sales yet</p>
                    <p className="text-gray-500 text-sm">
                      When someone purchases your items, they&apos;ll appear here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab (Purchases) */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length > 0 ? (
                  orders.map(order => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="bg-dark-400 rounded-xl p-4 block hover:bg-dark-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-medium">{order.order_number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {order.items?.length} item(s) · ${order.total?.toLocaleString()}
                      </p>
                      {order.tracking_info?.tracking_number && (
                        <p className="text-purple-400 text-sm mt-2 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Tracking: {order.tracking_info.tracking_number}
                        </p>
                      )}
                      <p className="text-gray-500 text-sm mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p>No orders yet</p>
                    <Link to="/search" className="text-primary hover:underline text-sm">
                      Browse gear to get started
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <div className="space-y-4">
                {offers.length > 0 ? (
                  offers.map(offer => (
                    <div key={offer.id} className="bg-dark-400 rounded-xl p-4">
                      <div className="flex gap-4">
                        <img
                          src={offer.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                          alt={offer.listing_title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{offer.listing_title}</p>
                          <p className="text-gray-400 text-sm">From: {offer.buyer_username}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-gray-400">List: ${offer.listing_price?.toLocaleString()}</span>
                            <span className="text-primary font-bold">Offer: ${offer.offer_price?.toLocaleString()}</span>
                            {offer.counter_price && (
                              <span className="text-yellow-400">Counter: ${offer.counter_price?.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(offer.status)}`}>
                            {offer.status}
                          </span>
                          {offer.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOfferAction(offer.id, 'accept')}
                                className="btn btn-primary text-sm py-1 px-3"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleOfferAction(offer.id, 'decline')}
                                className="btn btn-secondary text-sm py-1 px-3"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p>No offers received</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Tracking Modal */}
      {showTrackingModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-400 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add Tracking Information</h2>
              <button onClick={() => setShowTrackingModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-dark-300 rounded-lg p-3 mb-6">
              <p className="text-gray-400 text-sm">Order: <span className="text-white">{selectedOrder.order_number}</span></p>
              <p className="text-gray-400 text-sm">Buyer: <span className="text-white">{selectedOrder.buyer_username}</span></p>
            </div>

            {trackingError && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {trackingError}
              </div>
            )}

            {trackingSuccess && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-3 rounded-lg mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {trackingSuccess}
              </div>
            )}

            <form onSubmit={handleAddTracking} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Shipping Carrier *</label>
                <select
                  value={trackingData.carrier}
                  onChange={(e) => setTrackingData({...trackingData, carrier: e.target.value})}
                  className="w-full"
                >
                  <option value="USPS">USPS</option>
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DHL">DHL</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Tracking Number *</label>
                <input
                  type="text"
                  required
                  value={trackingData.tracking_number}
                  onChange={(e) => setTrackingData({...trackingData, tracking_number: e.target.value})}
                  placeholder="Enter tracking number"
                  className="w-full font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Estimated Delivery (optional)</label>
                <input
                  type="text"
                  value={trackingData.estimated_delivery}
                  onChange={(e) => setTrackingData({...trackingData, estimated_delivery: e.target.value})}
                  placeholder="e.g., January 25, 2026"
                  className="w-full"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  <strong>Note:</strong> Once you add tracking, the buyer will be notified. 
                  Your funds will be released when the buyer confirms delivery.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTrackingModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {trackingLoading ? (
                    'Saving...'
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      Save Tracking
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
