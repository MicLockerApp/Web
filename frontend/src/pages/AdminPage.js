import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { DollarSign, Package, Users, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, usersRes, ordersRes] = await Promise.all([
        adminAPI.getAnalytics(),
        adminAPI.getUsers({ limit: 20 }),
        adminAPI.getOrders({ limit: 20 }),
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data.users || []);
      setOrders(ordersRes.data.orders || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;
    try {
      await adminAPI.suspendUser(userId);
      fetchData();
    } catch (error) {
      console.error('Error suspending user:', error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen" data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <AlertCircle className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
            <p className="text-gray-400 text-sm">Platform Fees (3%)</p>
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
            <h2 className="text-lg font-semibold text-white mb-4">Orders by Status</h2>
            <div className="space-y-3">
              {Object.entries(analytics?.orders_by_status || {}).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-gray-400 capitalize">{status}</span>
                  <span className="text-white font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">New Orders (30 days)</span>
                <span className="text-white font-medium">{analytics?.recent_orders || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">New Signups (30 days)</span>
                <span className="text-white font-medium">{analytics?.recent_signups || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-dark-300 mb-6">
          {['users', 'orders'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Users List */}
        {activeTab === 'users' && (
          <div className="bg-dark-400 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-dark-300">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">User</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Category</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Rating</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Sales</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Joined</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-dark-300">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{u.username}</p>
                        <p className="text-gray-500 text-sm">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{u.category || '-'}</td>
                    <td className="px-6 py-4 text-gray-400">{u.rating?.toFixed(1) || '0.0'}</td>
                    <td className="px-6 py-4 text-gray-400">{u.total_sales || 0}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {!u.is_admin && (
                        <button
                          onClick={() => handleSuspendUser(u.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders List */}
        {activeTab === 'orders' && (
          <div className="bg-dark-400 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-dark-300">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Order</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Buyer</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Total</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Fee</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Status</th>
                  <th className="px-6 py-3 text-left text-gray-400 text-sm">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-t border-dark-300">
                    <td className="px-6 py-4 text-white font-medium">{order.order_number}</td>
                    <td className="px-6 py-4 text-gray-400">{order.buyer_username}</td>
                    <td className="px-6 py-4 text-white">${order.total?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-primary">${order.platform_fee?.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className="badge badge-primary">{order.status}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
