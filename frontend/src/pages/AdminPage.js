import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  DollarSign, Package, Users, ShoppingCart, TrendingUp, AlertCircle, CreditCard, Percent,
  Search, ChevronLeft, ChevronRight, Eye, Ban, CheckCircle, Trash2, Flag, RefreshCw,
  BarChart3, Calendar, UserCheck, UserX, Package2, MessageSquare, Settings
} from 'lucide-react';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [listings, setListings] = useState([]);
  const [listingsPagination, setListingsPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [orders, setOrders] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [listingStatus, setListingStatus] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !user?.is_admin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, user, navigate, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const analyticsRes = await adminAPI.getAnalytics();
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      const res = await adminAPI.getUsers({ page, limit: 20, search: userSearch || undefined });
      setUsers(res.data.users || []);
      setUsersPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchListings = async (page = 1) => {
    try {
      const res = await adminAPI.getListings({ page, limit: 20, status: listingStatus || undefined });
      setListings(res.data.listings || []);
      setListingsPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const fetchOrders = async (page = 1) => {
    try {
      const res = await adminAPI.getOrders({ page, limit: 20, status: orderStatus || undefined });
      setOrders(res.data.orders || []);
      setOrdersPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'listings') fetchListings();
    else if (activeTab === 'orders') fetchOrders();
  }, [activeTab]);

  const handleSuspendUser = async (userId, isSuspended) => {
    if (!window.confirm(`Are you sure you want to ${isSuspended ? 'unsuspend' : 'suspend'} this user?`)) return;
    setActionLoading(userId);
    try {
      if (isSuspended) {
        await adminAPI.unsuspendUser(userId);
      } else {
        await adminAPI.suspendUser(userId);
      }
      fetchUsers(usersPagination.page);
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    setActionLoading(listingId);
    try {
      await adminAPI.removeListing(listingId);
      fetchListings(listingsPagination.page);
    } catch (error) {
      console.error('Error removing listing:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400',
      sold: 'bg-purple-500/20 text-purple-400',
      draft: 'bg-gray-500/20 text-gray-400',
      removed: 'bg-red-500/20 text-red-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      paid: 'bg-green-500/20 text-green-400',
      shipped: 'bg-blue-500/20 text-blue-400',
      delivered: 'bg-purple-500/20 text-purple-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
      refunded: 'bg-orange-500/20 text-orange-400',
    };
    return styles[status] || 'bg-gray-500/20 text-gray-400';
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen" data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-dark-300 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'listings', label: 'Listings', icon: Package },
            { id: 'orders', label: 'Orders', icon: ShoppingCart },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-black'
                  : 'text-gray-400 hover:text-white hover:bg-dark-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-dark-400 rounded-xl p-6">
                <DollarSign className="w-10 h-10 text-green-400 mb-3" />
                <p className="text-3xl font-bold text-white">
                  ${analytics?.total_gmv?.toLocaleString() || '0'}
                </p>
                <p className="text-gray-400 text-sm">Total GMV</p>
              </div>
              <div className="bg-dark-400 rounded-xl p-6">
                <TrendingUp className="w-10 h-10 text-primary mb-3" />
                <p className="text-3xl font-bold text-white">
                  ${analytics?.total_fees_collected?.toLocaleString() || '0'}
                </p>
                <p className="text-gray-400 text-sm">Platform Fees ({analytics?.platform_fee_percent || 3}%)</p>
              </div>
              <div className="bg-dark-400 rounded-xl p-6">
                <CreditCard className="w-10 h-10 text-cyan-400 mb-3" />
                <p className="text-3xl font-bold text-white">
                  ${analytics?.total_processing_fees_collected?.toLocaleString() || '0'}
                </p>
                <p className="text-gray-400 text-sm">Payment Processing</p>
                <p className="text-gray-500 text-xs mt-1">
                  {analytics?.payment_processing_percent || 3.19}% + ${analytics?.payment_processing_fixed || 0.49}
                </p>
              </div>
              <div className="bg-dark-400 rounded-xl p-6">
                <Percent className="w-10 h-10 text-emerald-400 mb-3" />
                <p className="text-3xl font-bold text-white">
                  ${((analytics?.total_fees_collected || 0) + (analytics?.total_processing_fees_collected || 0)).toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">Total Fees Collected</p>
              </div>
              <div className="bg-dark-400 rounded-xl p-6">
                <Package className="w-10 h-10 text-blue-400 mb-3" />
                <p className="text-3xl font-bold text-white">
                  {analytics?.active_listings || 0}
                </p>
                <p className="text-gray-400 text-sm">Active Listings</p>
              </div>
              <div className="bg-dark-400 rounded-xl p-6">
                <Users className="w-10 h-10 text-purple-400 mb-3" />
                <p className="text-3xl font-bold text-white">
                  {analytics?.total_users || 0}
                </p>
                <p className="text-gray-400 text-sm">Total Users</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-dark-400 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Orders by Status
                </h2>
                <div className="space-y-3">
                  {Object.entries(analytics?.orders_by_status || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className={`badge ${getStatusBadge(status)}`}>{status}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  ))}
                  {Object.keys(analytics?.orders_by_status || {}).length === 0 && (
                    <p className="text-gray-500">No orders yet</p>
                  )}
                </div>
              </div>
              <div className="bg-dark-400 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Activity (30 days)
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Package2 className="w-4 h-4" />
                      <span>New Orders</span>
                    </div>
                    <span className="text-white font-medium">{analytics?.recent_orders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                      <UserCheck className="w-4 h-4" />
                      <span>New Signups</span>
                    </div>
                    <span className="text-white font-medium">{analytics?.recent_signups || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Search */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  placeholder="Search by username or email..."
                  className="pl-10"
                />
              </div>
              <button onClick={() => fetchUsers()} className="btn btn-primary">
                Search
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-dark-400 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">User</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Category</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Rating</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Sales</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Status</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Joined</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-t border-dark-300 hover:bg-dark-300/50">
                        <td className="px-6 py-4">
                          <Link to={`/profile/${u.id}`} className="flex items-center gap-3 hover:text-primary">
                            <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
                              {u.profile_image ? (
                                <img src={u.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-primary font-bold">{u.username?.[0]?.toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">{u.username}</p>
                              <p className="text-gray-500 text-sm">{u.email}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-gray-400 capitalize">{u.category?.replace('_', ' ') || '-'}</td>
                        <td className="px-6 py-4 text-gray-400">{u.rating?.toFixed(1) || '0.0'} ({u.review_count || 0})</td>
                        <td className="px-6 py-4 text-gray-400">{u.total_sales || 0}</td>
                        <td className="px-6 py-4">
                          {u.is_admin ? (
                            <span className="badge bg-primary/20 text-primary">Admin</span>
                          ) : u.is_suspended ? (
                            <span className="badge bg-red-500/20 text-red-400">Suspended</span>
                          ) : u.has_lifetime_free_fees ? (
                            <span className="badge bg-green-500/20 text-green-400">VIP</span>
                          ) : (
                            <span className="badge bg-gray-500/20 text-gray-400">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Link to={`/profile/${u.id}`} className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100" title="View Profile">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </Link>
                            {!u.is_admin && (
                              <button
                                onClick={() => handleSuspendUser(u.id, u.is_suspended)}
                                disabled={actionLoading === u.id}
                                className={`p-2 rounded-lg ${u.is_suspended ? 'bg-green-500/20 hover:bg-green-500/30' : 'bg-red-500/20 hover:bg-red-500/30'}`}
                                title={u.is_suspended ? 'Unsuspend' : 'Suspend'}
                              >
                                {u.is_suspended ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Ban className="w-4 h-4 text-red-400" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersPagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-dark-300">
                  <p className="text-gray-400 text-sm">
                    Showing {users.length} of {usersPagination.total} users
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchUsers(usersPagination.page - 1)}
                      disabled={usersPagination.page <= 1}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 text-gray-400">
                      Page {usersPagination.page} of {usersPagination.pages}
                    </span>
                    <button
                      onClick={() => fetchUsers(usersPagination.page + 1)}
                      disabled={usersPagination.page >= usersPagination.pages}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {['', 'active', 'sold', 'removed'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setListingStatus(status);
                    setTimeout(() => fetchListings(), 100);
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${listingStatus === status ? 'bg-primary text-black' : 'bg-dark-400 text-gray-400 hover:text-white'}`}
                >
                  {status || 'All'}
                </button>
              ))}
            </div>

            {/* Listings Table */}
            <div className="bg-dark-400 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Listing</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Seller</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Price</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Category</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Status</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Views</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map(listing => (
                      <tr key={listing.id} className="border-t border-dark-300 hover:bg-dark-300/50">
                        <td className="px-6 py-4">
                          <Link to={`/listing/${listing.id}`} className="flex items-center gap-3 hover:text-primary">
                            <img
                              src={listing.media?.[0]?.url || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                              alt=""
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <span className="text-white font-medium truncate max-w-xs">{listing.title}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/profile/${listing.seller_id}`} className="text-gray-400 hover:text-primary">
                            {listing.seller_username}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-primary font-medium">${listing.price?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-400">{listing.category}</td>
                        <td className="px-6 py-4">
                          <span className={`badge ${getStatusBadge(listing.status)}`}>{listing.status}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{listing.view_count || 0}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Link to={`/listing/${listing.id}`} className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100" title="View">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </Link>
                            {listing.status !== 'removed' && (
                              <button
                                onClick={() => handleRemoveListing(listing.id)}
                                disabled={actionLoading === listing.id}
                                className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {listingsPagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-dark-300">
                  <p className="text-gray-400 text-sm">
                    Showing {listings.length} of {listingsPagination.total} listings
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchListings(listingsPagination.page - 1)}
                      disabled={listingsPagination.page <= 1}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 text-gray-400">
                      Page {listingsPagination.page} of {listingsPagination.pages}
                    </span>
                    <button
                      onClick={() => fetchListings(listingsPagination.page + 1)}
                      disabled={listingsPagination.page >= listingsPagination.pages}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {['', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setOrderStatus(status);
                    setTimeout(() => fetchOrders(), 100);
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${orderStatus === status ? 'bg-primary text-black' : 'bg-dark-400 text-gray-400 hover:text-white'}`}
                >
                  {status || 'All'}
                </button>
              ))}
            </div>

            {/* Orders Table */}
            <div className="bg-dark-400 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Order</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Buyer</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Total</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Platform Fee</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Processing Fee</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Status</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Date</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-t border-dark-300 hover:bg-dark-300/50">
                        <td className="px-6 py-4 text-white font-medium">{order.order_number}</td>
                        <td className="px-6 py-4">
                          <Link to={`/profile/${order.buyer_id}`} className="text-gray-400 hover:text-primary">
                            {order.buyer_username}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-white">${order.total?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-primary">${order.platform_fee?.toFixed(2)}</td>
                        <td className="px-6 py-4 text-cyan-400">${(order.payment_processing_fee || 0)?.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/orders/${order.id}`} className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100 inline-block" title="View">
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {ordersPagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-dark-300">
                  <p className="text-gray-400 text-sm">
                    Showing {orders.length} of {ordersPagination.total} orders
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchOrders(ordersPagination.page - 1)}
                      disabled={ordersPagination.page <= 1}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 text-gray-400">
                      Page {ordersPagination.page} of {ordersPagination.pages}
                    </span>
                    <button
                      onClick={() => fetchOrders(ordersPagination.page + 1)}
                      disabled={ordersPagination.page >= ordersPagination.pages}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
