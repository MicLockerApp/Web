import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';

const CartPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const { cart, loading, updateItem, removeItem } = useCart();
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleUpdateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return;
    setUpdating(prev => ({ ...prev, [itemId]: true }));
    try {
      await updateItem(itemId, quantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRemoveItem = async (itemId) => {
    setUpdating(prev => ({ ...prev, [itemId]: true }));
    try {
      await removeItem(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setUpdating(prev => ({ ...prev, [itemId]: false }));
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen" data-testid="cart-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className={`text-2xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>Shopping Cart</h1>

        {cart.items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Your cart is empty</h2>
            <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Start shopping to add items to your cart</p>
            <Link to="/search" className="btn btn-primary">
              Browse Gear
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl p-4 flex gap-4 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}
                  data-testid={`cart-item-${item.id}`}
                >
                  <Link to={`/listing/${item.listing_id}`} className="w-24 h-24 flex-shrink-0">
                    <img
                      src={item.listing_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200'}
                      alt={item.listing_title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/listing/${item.listing_id}`}
                      className={`font-medium hover:text-primary line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {item.listing_title}
                    </Link>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Seller: {item.seller_username}</p>
                    <p className="text-primary font-bold mt-2">${item.listing_price.toLocaleString()}</p>
                    {item.shipping_cost > 0 && (
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>+ ${item.shipping_cost} shipping</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className={`p-1 ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                      disabled={updating[item.id]}
                      data-testid={`remove-item-${item.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className={`p-1 rounded ${isDark ? 'bg-dark-300 hover:bg-dark-200' : 'bg-gray-100 hover:bg-gray-200'}`}
                        disabled={item.quantity <= 1 || updating[item.id]}
                      >
                        <Minus className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>
                      <span className={`w-8 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className={`p-1 rounded ${isDark ? 'bg-dark-300 hover:bg-dark-200' : 'bg-gray-100 hover:bg-gray-200'}`}
                        disabled={updating[item.id]}
                      >
                        <Plus className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className={`rounded-xl p-6 sticky top-24 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className={`flex justify-between ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span>Subtotal ({cart.item_count} items)</span>
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>${cart.subtotal.toLocaleString()}</span>
                  </div>
                  <div className={`flex justify-between ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span>Shipping</span>
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>${cart.shipping_total.toLocaleString()}</span>
                  </div>
                  <div className={`border-t pt-3 flex justify-between ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Total</span>
                    <span className="text-primary text-xl font-bold">${cart.total.toLocaleString()}</span>
                  </div>
                </div>
                <Link
                  to="/checkout"
                  className="btn btn-primary w-full py-3"
                  data-testid="checkout-button"
                >
                  Proceed to Checkout <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/search"
                  className={`block text-center mt-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
