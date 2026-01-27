import React, { useState, useEffect } from 'react';
import { Star, AlertTriangle, Package, Ticket, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const ITEM_CONDITION_OPTIONS = [
  { value: 'as_described', label: 'Exactly as described' },
  { value: 'better_than_expected', label: 'Better than expected' },
  { value: 'minor_wear', label: 'Minor wear not mentioned' },
  { value: 'significant_issues', label: 'Significant issues not disclosed' },
  { value: 'not_as_described', label: 'Not as described' },
];

const ReviewGatingModal = ({ pendingReview, onComplete, onClose }) => {
  const { isDark } = useTheme();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [itemCondition, setItemCondition] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // For support ticket
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');

  const isSupportTicket = pendingReview?.type === 'support_ticket';
  const reviewType = pendingReview?.review_type === 'buyer' ? 'buyer_to_seller' : 'seller_to_buyer';
  const isBuyerReview = reviewType === 'buyer_to_seller';

  useEffect(() => {
    if (isSupportTicket && pendingReview?.order) {
      setTicketSubject(`Item Not Received - Order #${pendingReview.order.order_number}`);
      setTicketDescription(
        `I have not received my item from Order #${pendingReview.order.order_number}.\n\n` +
        `Order Details:\n` +
        `- Item: ${pendingReview.order.items?.[0]?.listing_title || 'Unknown'}\n` +
        `- Seller: ${pendingReview.order.seller_username || 'Unknown'}\n` +
        `- Shipped: ${pendingReview.order.shipped_at ? new Date(pendingReview.order.shipped_at).toLocaleDateString() : 'Unknown'}\n\n` +
        `Please investigate and help resolve this issue.`
      );
    }
  }, [isSupportTicket, pendingReview]);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    if (!comment.trim()) {
      setError('Please write a review');
      return;
    }
    if (isBuyerReview && !itemCondition) {
      setError('Please select the item condition');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/reviews', {
        order_id: pendingReview.order_id,
        rating,
        comment: comment.trim(),
        review_type: reviewType,
        item_condition: isBuyerReview ? itemCondition : undefined,
        condition_notes: isBuyerReview && conditionNotes ? conditionNotes.trim() : undefined,
      });

      onComplete?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/tickets', {
        category: 'non_receipt',
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        order_id: pendingReview.order_id,
        priority: 'high',
      });

      // Clear the must_submit_ticket flag
      await api.post(`/reviews/confirm-receipt/${pendingReview.order_id}`, {
        received: false,
        ticket_submitted: true,
      });

      onComplete?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
      data-testid="review-gating-modal"
    >
      <div className={`w-full max-w-lg rounded-2xl overflow-hidden ${
        isDark ? 'bg-dark-400' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${isDark ? 'border-dark-300 bg-dark-500' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-3">
            {isSupportTicket ? (
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <Ticket className="w-6 h-6 text-red-400" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {isSupportTicket 
                  ? 'Submit Support Ticket' 
                  : isBuyerReview 
                    ? 'Review Your Seller' 
                    : 'Review Your Buyer'
                }
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {isSupportTicket 
                  ? "It's been 14 days. Please let us know about your item."
                  : 'Your review helps our community!'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Warning Banner */}
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            isDark ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
          }`}>
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className={`font-medium ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                Action Required
              </p>
              <p className={`text-sm ${isDark ? 'text-orange-300/80' : 'text-orange-600'}`}>
                {isSupportTicket
                  ? 'You must submit a support ticket to continue using MicLocker.'
                  : 'You must complete this review to continue using MicLocker.'
                }
              </p>
            </div>
          </div>

          {/* Order Info */}
          {pendingReview?.order && (
            <div className={`mb-6 p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-3">
                <Package className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Order #{pendingReview.order.order_number}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {pendingReview.order.items?.[0]?.listing_title || 'Item'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isSupportTicket ? (
            /* Support Ticket Form */
            <div className="space-y-4">
              <div>
                <label className={`block mb-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Subject
                </label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full"
                  data-testid="ticket-subject"
                />
              </div>
              <div>
                <label className={`block mb-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  rows={6}
                  className="w-full resize-none"
                  data-testid="ticket-description"
                />
              </div>
            </div>
          ) : (
            /* Review Form */
            <div className="space-y-6">
              {/* Other User Info */}
              {pendingReview?.other_user && (
                <div className="flex items-center gap-4">
                  {pendingReview.other_user.profile_image ? (
                    <img
                      src={pendingReview.other_user.profile_image}
                      alt={pendingReview.other_user.username}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      isDark ? 'bg-dark-200' : 'bg-gray-200'
                    }`}>
                      <span className="text-primary text-xl font-bold">
                        {pendingReview.other_user.username?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {pendingReview.other_user.username}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {isBuyerReview ? 'Seller' : 'Buyer'}
                    </p>
                  </div>
                </div>
              )}

              {/* Star Rating */}
              <div>
                <label className={`block mb-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rating *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                      data-testid={`star-${star}`}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          (hoverRating || rating) >= star
                            ? 'text-yellow-400 fill-yellow-400'
                            : isDark
                              ? 'text-gray-600'
                              : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Condition (Buyer only) */}
              {isBuyerReview && (
                <div>
                  <label className={`block mb-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Item Condition *
                  </label>
                  <select
                    value={itemCondition}
                    onChange={(e) => setItemCondition(e.target.value)}
                    className="w-full"
                    data-testid="item-condition-select"
                  >
                    <option value="">Select condition...</option>
                    {ITEM_CONDITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Review Comment */}
              <div>
                <label className={`block mb-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Your Review *
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    isBuyerReview
                      ? 'How was your experience with this seller? Did the item arrive as described?'
                      : 'How was your experience with this buyer? Was communication smooth?'
                  }
                  rows={4}
                  className="w-full resize-none"
                  data-testid="review-comment"
                />
              </div>

              {/* Condition Notes (Buyer only, optional) */}
              {isBuyerReview && itemCondition && itemCondition !== 'as_described' && itemCondition !== 'better_than_expected' && (
                <div>
                  <label className={`block mb-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Condition Notes (Optional)
                  </label>
                  <textarea
                    value={conditionNotes}
                    onChange={(e) => setConditionNotes(e.target.value)}
                    placeholder="Describe any issues with the item condition..."
                    rows={2}
                    className="w-full resize-none"
                    data-testid="condition-notes"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <button
            onClick={isSupportTicket ? handleSubmitTicket : handleSubmitReview}
            disabled={submitting}
            className="w-full btn btn-primary py-3 text-lg font-semibold flex items-center justify-center gap-2"
            data-testid="submit-review-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : isSupportTicket ? (
              'Submit Support Ticket'
            ) : (
              'Submit Review'
            )}
          </button>
          <p className={`mt-3 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {isSupportTicket
              ? 'Our support team will investigate your case.'
              : 'Reviews are permanent and cannot be edited after submission.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewGatingModal;
