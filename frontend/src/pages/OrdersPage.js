import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, DollarSign, Clock, Truck, Check, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const OrdersPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('purchases');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [isAuthenticated, navigate, activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = activeTab === 'purchases'
        ? await ordersAPI.getAll({ limit: 50 })
        : await ordersAPI.getSales({ limit: 50 });
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      paid: 'bg-green-500/20 text-green-400',
      shipped: 'bg-blue-500/20 text-blue-400',
      delivered: 'bg-purple-500/20 text-purple-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
      refunded: 'bg-gray-500/20 text-gray-400',
    };
    return styles[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'paid': return <DollarSign className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered':
      case 'completed': return <Check className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const filteredOrders = filter
    ? orders.filter(o => o.status === filter)
    : orders;

  return (
    <div className="min-h-screen" data-testid="orders-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Orders</h1>
            <p className="text-gray-400">Track your purchases and sales</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-dark-300 mb-6">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'purchases' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Purchases
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'sales' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Sales
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1 rounded-full text-sm ${!filter ? 'bg-primary text-black' : 'bg-dark-400 text-gray-400 hover:text-white'}`}
          >
            All
          </button>
          {['paid', 'shipped', 'delivered', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm capitalize ${filter === status ? 'bg-primary text-black' : 'bg-dark-400 text-gray-400 hover:text-white'}`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <LoadingSpinner />
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-dark-400 rounded-xl p-4 hover:bg-dark-300 transition-colors"
                data-testid={`order-${order.id}`}
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* First item image */}
                  <img
                    src={order.items?.[0]?.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                    alt="Order item"
                    className="w-20 h-20 object-cover rounded-lg"
                  />

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-white font-medium">{order.order_number}</span>
                      <span className={`badge flex items-center gap-1 ${getStatusBadge(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </span>
                    </div>

                    <p className="text-gray-400 text-sm mb-1">
                      {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                      {activeTab === 'sales' && ` · Buyer: ${order.buyer_username}`}
                    </p>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-primary font-bold">${order.total?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No {activeTab === 'purchases' ? 'purchases' : 'sales'} yet</p>
            {activeTab === 'purchases' && (
              <Link to="/search" className="text-primary hover:underline">
                Start shopping
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
