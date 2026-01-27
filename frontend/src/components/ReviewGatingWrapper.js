import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ReviewGatingModal from './ReviewGatingModal';

/**
 * ReviewGatingWrapper - Checks for pending reviews/tickets and shows blocking modal
 * This component wraps the app content and enforces the review gating system.
 */
const ReviewGatingWrapper = ({ children }) => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [pendingReview, setPendingReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);

  const checkPendingReview = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPendingReview(null);
      setCheckComplete(true);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/reviews/pending');
      if (response.data.has_pending && response.data.locked) {
        setPendingReview(response.data);
      } else {
        setPendingReview(null);
      }
    } catch (error) {
      console.error('Error checking pending review:', error);
      setPendingReview(null);
    } finally {
      setLoading(false);
      setCheckComplete(true);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Check on mount and when user changes
    checkPendingReview();
  }, [checkPendingReview]);

  // Periodically check (every 5 minutes) in case status changes
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      checkPendingReview();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, checkPendingReview]);

  const handleReviewComplete = useCallback(async () => {
    // Refresh user data and re-check pending status
    if (refreshUser) {
      await refreshUser();
    }
    setPendingReview(null);
    // Re-check after a short delay
    setTimeout(() => {
      checkPendingReview();
    }, 1000);
  }, [refreshUser, checkPendingReview]);

  // Don't show anything while doing initial check
  if (!checkComplete && loading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {pendingReview && pendingReview.locked && (
        <ReviewGatingModal
          pendingReview={pendingReview}
          onComplete={handleReviewComplete}
        />
      )}
    </>
  );
};

export default ReviewGatingWrapper;
