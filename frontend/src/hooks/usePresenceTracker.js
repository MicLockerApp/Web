import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * usePresenceTracker Hook
 * 
 * Tracks user presence/activity and sends heartbeats to the server.
 * - Sends heartbeat every 5 minutes when active
 * - Sets status to "standby" when page is hidden (tab switch, minimize)
 * - Sets status to "away" after 30 minutes of inactivity
 * - Detects user interactions (mouse, keyboard, touch, scroll)
 */

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STANDBY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const AWAY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const usePresenceTracker = () => {
  const { user, token } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const heartbeatIntervalRef = useRef(null);
  const standbyTimeoutRef = useRef(null);
  const awayTimeoutRef = useRef(null);
  const currentStatusRef = useRef('online');

  const sendHeartbeat = useCallback(async () => {
    if (!user || !token) return;
    
    try {
      await api.post('/presence/heartbeat');
      currentStatusRef.current = 'online';
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }, [user, token]);

  const setStandby = useCallback(async () => {
    if (!user || !token || currentStatusRef.current === 'standby') return;
    
    try {
      await api.post('/presence/standby');
      currentStatusRef.current = 'standby';
    } catch (error) {
      console.error('Failed to set standby:', error);
    }
  }, [user, token]);

  const setAway = useCallback(async () => {
    if (!user || !token || currentStatusRef.current === 'away') return;
    
    try {
      await api.post('/presence/away');
      currentStatusRef.current = 'away';
    } catch (error) {
      console.error('Failed to set away:', error);
    }
  }, [user, token]);

  const resetActivityTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timers
    if (standbyTimeoutRef.current) {
      clearTimeout(standbyTimeoutRef.current);
    }
    if (awayTimeoutRef.current) {
      clearTimeout(awayTimeoutRef.current);
    }
    
    // If we were away or standby, send heartbeat to become active again
    if (currentStatusRef.current !== 'online') {
      sendHeartbeat();
    }
    
    // Set new timers
    standbyTimeoutRef.current = setTimeout(() => {
      setStandby();
    }, STANDBY_TIMEOUT);
    
    awayTimeoutRef.current = setTimeout(() => {
      setAway();
    }, AWAY_TIMEOUT);
  }, [sendHeartbeat, setStandby, setAway]);

  const handleActivity = useCallback(() => {
    resetActivityTimers();
  }, [resetActivityTimers]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Page is hidden - set to standby
      setStandby();
    } else {
      // Page is visible again - reset activity
      resetActivityTimers();
    }
  }, [setStandby, resetActivityTimers]);

  useEffect(() => {
    if (!user || !token) return;

    // Send initial heartbeat
    sendHeartbeat();

    // Start heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Set up activity timers
    resetActivityTimers();

    // Listen for user activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (standbyTimeoutRef.current) {
        clearTimeout(standbyTimeoutRef.current);
      }
      if (awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current);
      }
      
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Set away on unmount (logout)
      setAway();
    };
  }, [user, token, sendHeartbeat, resetActivityTimers, handleActivity, handleVisibilityChange, setAway]);

  return null;
};

export default usePresenceTracker;
