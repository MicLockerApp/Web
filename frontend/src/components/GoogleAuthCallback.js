import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';

/**
 * Google OAuth Callback Handler (Direct OAuth)
 * 
 * This handles the case where the popup couldn't be used
 * and Google redirected directly to this page.
 */
const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Check if we have stored auth data from popup redirect
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('google_auth_user');
        const isNewUser = localStorage.getItem('google_auth_is_new') === 'true';
        
        if (storedToken && storedUser) {
          // Clean up stored data
          localStorage.removeItem('google_auth_user');
          localStorage.removeItem('google_auth_is_new');
          
          // Set auth state
          setToken(storedToken);
          const user = JSON.parse(storedUser);
          
          // Fetch full user data
          try {
            const userResponse = await api.get(`/users/${user.id}`);
            setUser(userResponse.data);
            
            // Redirect based on new user status
            if (isNewUser) {
              navigate('/onboarding', { state: { user: userResponse.data, fromGoogle: true } });
            } else {
              navigate('/dashboard');
            }
          } catch (err) {
            // If fetching full user fails, use stored data
            setUser(user);
            navigate(isNewUser ? '/onboarding' : '/dashboard');
          }
          return;
        }
        
        // If no stored data, something went wrong
        navigate('/login?error=Authentication failed');
      } catch (err) {
        console.error('Google auth callback error:', err);
        navigate('/login?error=Authentication failed');
      }
    };

    processAuth();
  }, [navigate, setUser, setToken]);

  return (
    <div className="min-h-screen bg-dark-500 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-gray-400 mt-4">Completing sign in...</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
