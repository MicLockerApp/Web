import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, tokenStore } from '../services/api';

const AuthContext = createContext(null);

const rememberUser = (u) => {
  try {
    if (u) localStorage.setItem('user', JSON.stringify({ id: u.id, username: u.username }));
    else localStorage.removeItem('user');
  } catch { /* storage unavailable */ }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Assume signed in while the saved session is being checked, so protected
  // pages don't bounce to /login on a hard refresh.
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!tokenStore.access());

  const loadUser = useCallback(async () => {
    if (!tokenStore.access()) {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return null;
    }
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      rememberUser(response.data);
      setIsAuthenticated(true);
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        tokenStore.clear();
        setUser(null);
        setIsAuthenticated(false);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Sign in with email + password.
  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    await loadUser();
    return response.data;
  };

  // { email, first_name, last_name, date_of_birth (YYYY-MM-DD), password }
  const register = async (userData) => {
    const response = await authAPI.register(userData);
    await loadUser();
    return response.data;
  };

  const logout = () => {
    authAPI.logout();
    tokenStore.clear();
    rememberUser(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const setToken = (token, refresh) => {
    if (token) {
      tokenStore.set(token, refresh);
      setIsAuthenticated(true);
    } else {
      tokenStore.clear();
      setIsAuthenticated(false);
    }
  };

  // Same gate as the apps: signed-in accounts must have accepted the Terms
  // and picked a role/handle before using the site.
  const needsTerms = isAuthenticated && user && !user.terms_accepted_at;
  const needsProfileSetup = isAuthenticated && user && (!user.category || !user.handle);

  const value = {
    user,
    loading,
    isAuthenticated,
    needsTerms,
    needsProfileSetup,
    login,
    register,
    logout,
    updateUser,
    loadUser,
    refreshUser: loadUser,
    setUser,
    setToken,
    setIsAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
