import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Music, User, Check, X, MessageSquare, FileText, ChevronDown, Filter, ArrowLeft, Upload } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const VenueBookingsPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending, accepted, declined, all
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseType, setResponseType] = useState(null); // 'accept' or 'decline'
  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    
    try {
      const params = filter !== 'all' ? { status_filter: filter } : {};
      const response = await api.get(`/bookings/venue/${user.id}/requests`, { params });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.category !== 'venue') {
      navigate('/dashboard');
      return;
    }
    fetchBookings();
  }, [user, navigate, fetchBookings]);

  const handleRespond = (booking, type) => {
    setSelectedBooking(booking);
    setResponseType(type);
    setResponseMessage('');
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!selectedBooking) return;
    
    setSubmitting(true);
    try {
      await api.patch(`/bookings/${selectedBooking.id}`, {
        status: responseType === 'accept' ? 'accepted' : 'declined',
        venue_response: responseMessage || null
      });
      
      setShowResponseModal(false);
      setSelectedBooking(null);
      fetchBookings();
      
      // Show success message
      alert(`Booking request ${responseType === 'accept' ? 'accepted' : 'declined'} successfully! The artist has been notified.`);
    } catch (error) {
      console.error('Error responding to booking:', error);
      alert(error.response?.data?.detail || 'Failed to respond to booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDocument = async (e) => {
    if (!selectedBooking) return;
    
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'booking_document');
      
      const uploadRes = await api.post('/uploads/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const fileUrl = uploadRes.data.url;
      
      await api.patch(`/bookings/${selectedBooking.id}`, {
        venue_documents: [fileUrl]
      });
      
      setShowDocumentModal(false);
      setSelectedBooking(null);
      fetchBookings();
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert(error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      accepted: 'bg-green-500/20 text-green-400',
      declined: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-gray-500/20 text-gray-400'
    };
    return styles[status] || styles.pending;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} flex items-center gap-1 mb-4`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Booking Requests
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage booking requests for your venue
              </p>
            </div>
            {pendingCount > 0 && (
              <div className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg font-medium">
                {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={`flex gap-2 mb-6 overflow-x-auto pb-2`}>
          {[
            { value: 'pending', label: 'Pending', count: bookings.filter(b => b.status === 'pending').length },
            { value: 'accepted', label: 'Accepted', count: bookings.filter(b => b.status === 'accepted').length },
            { value: 'declined', label: 'Declined', count: bookings.filter(b => b.status === 'declined').length },
            { value: 'all', label: 'All', count: bookings.length }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-primary text-black'
                  : isDark ? 'bg-dark-400 text-gray-300 hover:bg-dark-300' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f.label} {f.count > 0 && `(${f.count})`}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className={`rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg p-8 text-center`}>
              <Calendar className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                No {filter !== 'all' ? filter : ''} booking requests yet.
              </p>
              <Link
                to={`/venue/${user?.id}/calendar`}
                className="text-primary hover:underline mt-2 inline-block"
              >
                View your calendar →
              </Link>
            </div>
          ) : (
            bookings.map(booking => (
              <div
                key={booking.id}
                className={`rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg overflow-hidden`}
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {booking.event_name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      
                      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{formatDate(booking.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>{booking.event_time} ({booking.duration_hours}h)</span>
                        </div>
                        <Link 
                          to={`/profile/${booking.artist_id}`}
                          className="flex items-center gap-2 hover:text-primary"
                        >
                          <User className="w-4 h-4 text-primary" />
                          <span>{booking.artist_username}</span>
                        </Link>
                        {booking.genre && (
                          <div className="flex items-center gap-2">
                            <Music className="w-4 h-4 text-primary" />
                            <span>{booking.genre}</span>
                          </div>
                        )}
                      </div>

                      {booking.event_description && (
                        <p className={`mt-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {booking.event_description}
                        </p>
                      )}

                      {booking.special_requests && (
                        <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                          <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Special Requests:
                          </p>
                          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {booking.special_requests}
                          </p>
                        </div>
                      )}

                      {booking.venue_response && (
                        <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                          <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Your Response:
                          </p>
                          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {booking.venue_response}
                          </p>
                        </div>
                      )}

                      {/* Document Attachments Section - Only for accepted bookings */}
                      {booking.status === 'accepted' && (
                        <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
                          <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Documents & Contracts
                          </h4>
                          
                          {/* Venue Documents */}
                          {booking.venue_documents && booking.venue_documents.length > 0 && (
                            <div className="mb-3">
                              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Your Documents:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {booking.venue_documents.map((doc, idx) => (
                                  <a
                                    key={idx}
                                    href={doc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20"
                                  >
                                    <FileText className="w-4 h-4" />
                                    Document {idx + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Artist Documents */}
                          {booking.artist_documents && booking.artist_documents.length > 0 && (
                            <div className="mb-3">
                              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                From Artist:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {booking.artist_documents.map((doc, idx) => (
                                  <a
                                    key={idx}
                                    href={doc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20"
                                  >
                                    <FileText className="w-4 h-4" />
                                    Document {idx + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Upload Button */}
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDocumentModal(true);
                            }}
                            data-testid={`upload-document-btn-${booking.id}`}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                              isDark 
                                ? 'bg-dark-200 text-white hover:bg-dark-100' 
                                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                            }`}
                          >
                            <Upload className="w-4 h-4" />
                            Upload Contract
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {booking.status === 'pending' && (
                      <div className="flex sm:flex-col gap-2">
                        <button
                          onClick={() => handleRespond(booking, 'accept')}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(booking, 'decline')}
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Decline
                        </button>
                        <Link
                          to={`/messages?to=${booking.artist_id}`}
                          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                            isDark ? 'bg-dark-300 text-white hover:bg-dark-200' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Message
                        </Link>
                      </div>
                    )}

                    {booking.status !== 'pending' && (
                      <Link
                        to={`/messages?to=${booking.artist_id}`}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                          isDark ? 'bg-dark-300 text-white hover:bg-dark-200' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Message Artist
                      </Link>
                    )}
                  </div>
                </div>

                {/* Request Info Footer */}
                <div className={`px-6 py-3 border-t ${isDark ? 'border-dark-300 bg-dark-300/50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className={`flex flex-wrap items-center gap-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span>Requested {new Date(booking.created_at).toLocaleDateString()}</span>
                    {booking.expected_attendance && (
                      <span>Expected attendance: {booking.expected_attendance}</span>
                    )}
                    {booking.responded_at && (
                      <span>Responded {new Date(booking.responded_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl ${isDark ? 'bg-dark-400' : 'bg-white'} p-6`}>
            <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {responseType === 'accept' ? 'Accept' : 'Decline'} Booking Request
            </h2>
            
            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedBooking.event_name}
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatDate(selectedBooking.event_date)} at {selectedBooking.event_time}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Requested by: {selectedBooking.artist_username}
              </p>
            </div>

            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Message to Artist (optional)
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
                placeholder={responseType === 'accept' 
                  ? "e.g., Looking forward to your performance! Please arrive by 7 PM for sound check."
                  : "e.g., Unfortunately we have another event scheduled. Please try another date."
                }
                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>

            <div className={`p-3 rounded-lg mb-4 ${
              responseType === 'accept' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              <p className="text-sm">
                {responseType === 'accept' 
                  ? '✓ The artist will be notified that their booking has been confirmed.'
                  : '✗ The artist will be notified that their booking request was declined.'
                }
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResponseModal(false)}
                className={`flex-1 py-3 rounded-lg font-medium ${isDark ? 'bg-dark-300 text-white hover:bg-dark-200' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={submitResponse}
                disabled={submitting}
                className={`flex-1 py-3 rounded-lg font-medium text-white disabled:opacity-50 ${
                  responseType === 'accept' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {submitting ? 'Processing...' : responseType === 'accept' ? 'Confirm Acceptance' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl ${isDark ? 'bg-dark-400' : 'bg-white'} p-6`}>
            <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Upload Document
            </h2>
            
            <p className={`mb-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload contracts, venue requirements, or other booking documents.
            </p>

            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedBooking.event_name}
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                by {selectedBooking.artist_username}
              </p>
            </div>

            <div className="mb-4">
              <label className={`block w-full p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                isDark 
                  ? 'border-dark-200 hover:border-primary' 
                  : 'border-gray-300 hover:border-primary'
              }`}>
                <Upload className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {uploading ? 'Uploading...' : 'Click to select a file'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUploadDocument}
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDocumentModal(false);
                  setSelectedBooking(null);
                }}
                disabled={uploading}
                className={`flex-1 py-3 rounded-lg font-medium ${isDark ? 'bg-dark-300 text-white hover:bg-dark-200' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueBookingsPage;
