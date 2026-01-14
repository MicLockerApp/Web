import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, DollarSign, MessageSquare, Settings, Plus, Eye, Edit2, Trash2, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listingsAPI, ordersAPI, offersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusBadge = (status) => {
    const colors = {
      active: 'badge-success',
      sold: 'badge-primary',
      draft: 'badge-warning',
      removed: 'badge-error',
      pending: 'badge-warning',
      paid: 'badge-success',
      shipped: 'badge-primary',
      delivered: 'badge-success',
      completed: 'badge-success',
      cancelled: 'badge-error',
      countered: 'badge-warning',
      accepted: 'badge-success',
      declined: 'badge-error',
    };
    return colors[status] || 'bg-dark-300 text-gray-300';
  };

  return (
    <div className="min-h-screen" data-testid="dashboard-page">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Seller Dashboard</h1>
            <p className="text-gray-400">Welcome back, {user?.username}</p>
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
            <p className="text-2xl font-bold text-white">{listings.length}</p>
            <p className="text-gray-400 text-sm">Active Listings</p>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <DollarSign className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">{user?.total_sales || 0}</p>
            <p className="text-gray-400 text-sm">Total Sales</p>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <Star className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-white">{user?.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-gray-400 text-sm">Rating ({user?.review_count || 0} reviews)</p>
          </div>
          <div className="bg-dark-400 rounded-xl p-4">
            <MessageSquare className="w-8 h-8 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">{offers.filter(o => o.status === 'pending').length}</p>
            <p className="text-gray-400 text-sm">Pending Offers</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-dark-300 mb-8 overflow-x-auto">
          {[
            { id: 'listings', label: 'My Listings', icon: Package },
            { id: 'orders', label: 'Purchases', icon: Package },
            { id: 'sales', label: 'Sales', icon: DollarSign },
            { id: 'offers', label: 'Offers', icon: MessageSquare },
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
                          <span className={`badge ${getStatusBadge(listing.status)}`}>{listing.status}</span>
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {listing.view_count} views
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

            {/* Orders Tab */}
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
                        <span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {order.items?.length} item(s) · ${order.total?.toLocaleString()}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>No orders yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Sales Tab */}
            {activeTab === 'sales' && (
              <div className="space-y-4">
                {sales.length > 0 ? (
                  sales.map(order => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="bg-dark-400 rounded-xl p-4 block hover:bg-dark-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-medium">{order.order_number}</span>
                        <span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Buyer: {order.buyer_username} · ${order.total?.toLocaleString()}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p>No sales yet</p>
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
                          <span className={`badge ${getStatusBadge(offer.status)}`}>{offer.status}</span>
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
                    <p>No offers received</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
