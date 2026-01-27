/**
 * useProfileVisitTracker Hook
 * 
 * Tracks user visits to profiles for the Top 8 Fans feature.
 * - Records initial visit
 * - Periodically updates time spent (every 30 seconds)
 * - Only tracks logged-in users visiting other profiles
 */

import { useEffect, useRef, useCallback } from 'react';
import { profileVisitsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TIME_UPDATE_INTERVAL = 30; // seconds

const useProfileVisitTracker = (profileId) => {
  const { user, isAuthenticated } = useAuth();
  const timeSpentRef = useRef(0);
  const intervalRef = useRef(null);
  const hasTrackedVisitRef = useRef(false);

  // Track initial visit
  const trackVisit = useCallback(async () => {
    if (!profileId || !isAuthenticated || !user) return;
    
    // Don't track self-visits
    if (user.id === profileId) return;
    
    // Only track once per page load
    if (hasTrackedVisitRef.current) return;
    hasTrackedVisitRef.current = true;

    try {
      await profileVisitsAPI.trackVisit(profileId);
    } catch (error) {
      console.error('Error tracking profile visit:', error);
    }
  }, [profileId, isAuthenticated, user]);

  // Update time spent
  const updateTimeSpent = useCallback(async () => {
    if (!profileId || !isAuthenticated || !user) return;
    
    // Don't track self-visits
    if (user.id === profileId) return;

    // Only update if time has accumulated
    if (timeSpentRef.current === 0) return;

    try {
      // Send accumulated time (max 300 seconds per API call)
      const secondsToSend = Math.min(timeSpentRef.current, 300);
      await profileVisitsAPI.updateTimeSpent(profileId, secondsToSend);
      timeSpentRef.current = 0; // Reset after sending
    } catch (error) {
      console.error('Error updating time spent:', error);
    }
  }, [profileId, isAuthenticated, user]);

  // Track interaction (to be called from parent component)
  const trackInteraction = useCallback(async (interactionType) => {
    if (!profileId || !isAuthenticated || !user) return;
    
    // Don't track self-interactions
    if (user.id === profileId) return;

    try {
      await profileVisitsAPI.trackInteraction(profileId, interactionType);
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }, [profileId, isAuthenticated, user]);

  useEffect(() => {
    // Skip if no profile ID, not authenticated, or viewing own profile
    if (!profileId || !isAuthenticated || !user || user.id === profileId) {
      return;
    }

    // Track the initial visit
    trackVisit();

    // Start time tracking interval
    intervalRef.current = setInterval(() => {
      timeSpentRef.current += TIME_UPDATE_INTERVAL;
      
      // Send update to server
      updateTimeSpent();
    }, TIME_UPDATE_INTERVAL * 1000);

    // Cleanup on unmount or profile change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Send final time update before leaving
      if (timeSpentRef.current > 0) {
        updateTimeSpent();
      }
      
      // Reset for next profile
      hasTrackedVisitRef.current = false;
      timeSpentRef.current = 0;
    };
  }, [profileId, isAuthenticated, user, trackVisit, updateTimeSpent]);

  // Handle visibility change (user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && timeSpentRef.current > 0) {
        updateTimeSpent();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateTimeSpent]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timeSpentRef.current > 0 && profileId && isAuthenticated && user && user.id !== profileId) {
        // Use sendBeacon for reliable delivery on page close
        const data = JSON.stringify({
          profile_id: profileId,
          seconds_spent: Math.min(timeSpentRef.current, 300)
        });
        
        const token = localStorage.getItem('token');
        const headers = {
          type: 'application/json',
        };
        
        // Note: sendBeacon doesn't support custom headers easily
        // This is a best-effort attempt on page close
        navigator.sendBeacon?.(
          `${process.env.REACT_APP_BACKEND_URL}/api/profile-visits/time`,
          new Blob([data], headers)
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [profileId, isAuthenticated, user]);

  return { trackInteraction };
};

export default useProfileVisitTracker;
