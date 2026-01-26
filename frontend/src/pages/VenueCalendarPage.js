import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Music, Users, ChevronLeft, ChevronRight, FileText, Check, X, MessageSquare, ArrowLeft, Plus, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const TIME_SLOTS = [
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM',
  '3:00 AM', '3:30 AM', '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM',
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

const VenueCalendarPage = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDateDetail, setShowDateDetail] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    event_name: '',
    event_time: '8:00 PM',
    duration_hours: 2,
    event_description: '',
    expected_attendance: '',
    genre: '',
    special_requests: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Response modal state for venue owner actions
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [responseType, setResponseType] = useState(null); // 'accept' or 'decline'
  const [responseMessage, setResponseMessage] = useState('');

  const isVenueOwner = user && user.id === venueId;

  const fetchVenue = useCallback(async () => {
    try {
      const response = await api.get(`/users/${venueId}`);
      setVenue(response.data);
    } catch (error) {
      console.error('Error fetching venue:', error);
    }
  }, [venueId]);

  const fetchCalendar = useCallback(async () => {
    try {
      const response = await api.get(`/bookings/venue/${venueId}/calendar`, {
        params: { month: currentMonth + 1, year: currentYear }
      });
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching calendar:', error);
    } finally {
      setLoading(false);
    }
  }, [venueId, currentMonth, currentYear]);

  useEffect(() => {
    fetchVenue();
    fetchCalendar();
  }, [fetchVenue, fetchCalendar]);

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const getEventsForDate = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => {
      const eventDate = new Date(event.event_date).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getSelectedDateEvents = () => {
    if (!selectedDate) return [];
    return getEventsForDate(selectedDate);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
    setShowDateDetail(false);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
    setShowDateDetail(false);
  };

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setShowDateDetail(true);
    setShowRequestForm(false);
  };

  const handleBackToCalendar = () => {
    setShowDateDetail(false);
    setSelectedDate(null);
    setShowRequestForm(false);
  };

  const getFormattedDate = () => {
    if (!selectedDate) return '';
    return `${MONTHS[currentMonth]} ${selectedDate}, ${currentYear}`;
  };

  const getDateString = () => {
    if (!selectedDate) return '';
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
  };

  const isDateInPast = () => {
    if (!selectedDate) return true;
    const selected = new Date(currentYear, currentMonth, selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today;
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please sign in to send a booking request');
      return;
    }
    
    setSubmitting(true);
    try {
      const dateString = getDateString();
      await api.post('/bookings', {
        venue_id: venueId,
        event_date: new Date(dateString).toISOString(),
        event_time: requestForm.event_time,
        duration_hours: parseFloat(requestForm.duration_hours),
        event_name: requestForm.event_name,
        event_description: requestForm.event_description || null,
        expected_attendance: requestForm.expected_attendance ? parseInt(requestForm.expected_attendance) : null,
        genre: requestForm.genre || null,
        special_requests: requestForm.special_requests || null
      });
      
      setShowRequestForm(false);
      setRequestForm({
        event_name: '',
        event_time: '8:00 PM',
        duration_hours: 2,
        event_description: '',
        expected_attendance: '',
        genre: '',
        special_requests: ''
      });
      fetchCalendar();
      alert('Booking request sent successfully! The venue will review your request.');
    } catch (error) {
      console.error('Error sending booking request:', error);
      alert(error.response?.data?.detail || 'Failed to send booking request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = (event, type) => {
    setSelectedEvent(event);
    setResponseType(type);
    setResponseMessage('');
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!selectedEvent) return;
    
    setSubmitting(true);
    try {
      await api.patch(`/bookings/${selectedEvent.id}`, {
        status: responseType === 'accept' ? 'accepted' : 'declined',
        venue_response: responseMessage || null
      });
      
      setShowResponseModal(false);
      setSelectedEvent(null);
      fetchCalendar();
      
      alert(`Booking request ${responseType === 'accept' ? 'accepted' : 'declined'} successfully! The artist has been notified.`);
    } catch (error) {
      console.error('Error responding to booking:', error);
      alert(error.response?.data?.detail || 'Failed to respond to booking');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    const today = new Date();
    
    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 sm:h-24" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const hasEvents = dayEvents.length > 0;
      const isToday = today.getDate() === day && 
                      today.getMonth() === currentMonth && 
                      today.getFullYear() === currentYear;
      const isPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`
            h-20 sm:h-24 border rounded-lg p-1 sm:p-2 cursor-pointer transition-all
            ${isDark ? 'border-dark-300' : 'border-gray-200'}
            ${isToday ? 'ring-2 ring-primary' : ''}
            ${isPast ? 'opacity-50' : ''}
            ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-50'}
          `}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-primary' : isDark ? 'text-white' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="mt-1 space-y-0.5 overflow-hidden">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className={`text-xs px-1 py-0.5 rounded truncate ${
                  event.status === 'accepted' 
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {event.event_time} - {event.artist_username}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+{dayEvents.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Date Detail View
  if (showDateDetail && selectedDate) {
    const dateEvents = getSelectedDateEvents();
    const isPast = isDateInPast();
    
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={handleBackToCalendar}
              className={`flex items-center gap-2 text-sm mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Calendar
            </button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {getFormattedDate()}
                </h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {venue?.venue_name || venue?.username} • {dateEvents.length} booking{dateEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {!isVenueOwner && user && !isPast && (
                <button
                  onClick={() => setShowRequestForm(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Request Time
                </button>
              )}
            </div>
          </div>

          {/* Bookings for this date */}
          <div className={`rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Scheduled Performances
              </h2>
            </div>
            
            {dateEvents.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  No performances scheduled for this date.
                </p>
                {!isVenueOwner && user && !isPast && (
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="btn btn-primary mt-4"
                  >
                    Be the first to request this date!
                  </button>
                )}
                {isPast && (
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    This date has already passed.
                  </p>
                )}
                {!user && !isPast && (
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Link to="/login" className="text-primary hover:underline">Sign in</Link> to request a booking.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-dark-300">
                {dateEvents.map(event => (
                  <div key={event.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
                          <Music className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {event.event_name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              event.status === 'accepted' 
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {event.status === 'accepted' ? 'Confirmed' : 'Pending'}
                            </span>
                          </div>
                          <div className={`flex flex-wrap items-center gap-3 mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {event.event_time} ({event.duration_hours}h)
                            </span>
                            <Link 
                              to={`/profile/${event.artist_id}`}
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <User className="w-4 h-4" />
                              {event.artist_username}
                            </Link>
                            {event.genre && (
                              <span className="flex items-center gap-1">
                                <Music className="w-4 h-4" />
                                {event.genre}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons for Venue Owner */}
                      {isVenueOwner && event.status === 'pending' && (
                        <div className="flex gap-2 sm:flex-col">
                          <button
                            onClick={() => handleRespond(event, 'accept')}
                            data-testid={`accept-booking-${event.id}`}
                            className="flex-1 sm:flex-none px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2 text-sm"
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespond(event, 'decline')}
                            data-testid={`decline-booking-${event.id}`}
                            className="flex-1 sm:flex-none px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-2 text-sm"
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </button>
                          <Link
                            to={`/messages?to=${event.artist_id}`}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm ${
                              isDark ? 'bg-dark-300 text-white hover:bg-dark-200' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4" />
                            Message
                          </Link>
                        </div>
                      )}
                      
                      {/* Message button for confirmed bookings */}
                      {isVenueOwner && event.status === 'accepted' && (
                        <Link
                          to={`/messages?to=${event.artist_id}`}
                          className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm ${
                            isDark ? 'bg-dark-300 text-white hover:bg-dark-200' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Message Artist
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Request Form */}
          {showRequestForm && !isPast && (
            <div className={`mt-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Request a Booking for {getFormattedDate()}
                </h2>
                <button 
                  onClick={() => setShowRequestForm(false)}
                  className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Event/Performance Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={requestForm.event_name}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, event_name: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="e.g., Friday Night Jazz, Album Release Party"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Preferred Start Time *
                    </label>
                    <select
                      value={requestForm.event_time}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, event_time: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      {TIME_SLOTS.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Duration
                    </label>
                    <select
                      value={requestForm.duration_hours}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, duration_hours: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="1">1 hour</option>
                      <option value="1.5">1.5 hours</option>
                      <option value="2">2 hours</option>
                      <option value="2.5">2.5 hours</option>
                      <option value="3">3 hours</option>
                      <option value="4">4 hours</option>
                      <option value="5">5 hours</option>
                      <option value="6">6 hours</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Genre/Style
                    </label>
                    <input
                      type="text"
                      value={requestForm.genre}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, genre: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="e.g., Jazz, Rock, Hip Hop"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Expected Attendance
                    </label>
                    <input
                      type="number"
                      value={requestForm.expected_attendance}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, expected_attendance: e.target.value }))}
                      className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Event Description
                  </label>
                  <textarea
                    value={requestForm.event_description}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, event_description: e.target.value }))}
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="Tell the venue about your performance..."
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Special Requests or Requirements
                  </label>
                  <textarea
                    value={requestForm.special_requests}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, special_requests: e.target.value }))}
                    rows={2}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="Any equipment needs, sound check time, etc."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className={`flex-1 py-3 rounded-lg font-medium ${isDark ? 'bg-dark-300 text-white hover:bg-dark-200' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !requestForm.event_name}
                    className="flex-1 py-3 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? 'Sending Request...' : 'Send Booking Request'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Calendar View
  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              to={`/profile/${venueId}`}
              className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} flex items-center gap-1`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </Link>
            <h1 className={`text-2xl sm:text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {venue?.venue_name || venue?.username}'s Calendar
            </h1>
            {venue?.location && (
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                📍 {venue.location}
              </p>
            )}
          </div>
          
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Click on a date to see bookings or request a time
          </div>
        </div>

        {/* Calendar */}
        <div className={`rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg p-4 sm:p-6`}>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevMonth}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-100'}`}
            >
              <ChevronLeft className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`} />
            </button>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={handleNextMonth}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-100'}`}
            >
              <ChevronRight className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={`text-center text-xs sm:text-sm font-medium py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {renderCalendar()}
          </div>

          {/* Legend */}
          <div className={`flex flex-wrap items-center gap-4 sm:gap-6 mt-6 pt-4 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/50" />
              <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Confirmed</span>
            </div>
            {isVenueOwner && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500/50" />
                <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending Request</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ring-2 ring-primary ${isDark ? 'bg-dark-400' : 'bg-white'}`} />
              <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueCalendarPage;
