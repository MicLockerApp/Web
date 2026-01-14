import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0, shipping_total: 0, total: 0, item_count: 0 });
  const [loading, setLoading] = useState(false);

  const loadCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [], subtotal: 0, shipping_total: 0, total: 0, item_count: 0 });
      return;
    }

    setLoading(true);
    try {
      const response = await cartAPI.get();
      setCart(response.data);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addItem = async (listingId, quantity = 1) => {
    try {
      await cartAPI.addItem(listingId, quantity);
      await loadCart();
      return true;
    } catch (error) {
      throw error;
    }
  };

  const updateItem = async (itemId, quantity) => {
    try {
      await cartAPI.updateItem(itemId, quantity);
      await loadCart();
    } catch (error) {
      throw error;
    }
  };

  const removeItem = async (itemId) => {
    try {
      await cartAPI.removeItem(itemId);
      await loadCart();
    } catch (error) {
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clear();
      setCart({ items: [], subtotal: 0, shipping_total: 0, total: 0, item_count: 0 });
    } catch (error) {
      throw error;
    }
  };

  const value = {
    cart,
    loading,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    loadCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
