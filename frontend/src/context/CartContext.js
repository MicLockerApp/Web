import React, { createContext, useContext } from 'react';

// The cart isn't on the app backend (purchases are one listing at a time,
// same as the apps). This keeps the provider so existing imports work.
const EMPTY = { items: [], subtotal: 0, shipping_total: 0, total: 0, item_count: 0 };
const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const value = {
    cart: EMPTY,
    loading: false,
    loadCart: async () => {},
    addItem: async () => { throw new Error('Cart is not available'); },
    updateItem: async () => {},
    removeItem: async () => {},
    clearCart: async () => {},
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
