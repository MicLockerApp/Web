import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, Music, Users, ChevronLeft, ChevronRight, FileText, Check, X, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const VenueCalendarPage = () => {
  const { venueId } = useParams();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    event_name: '',
    event_date: '',
    event_time: '8:00 PM',
    duration_hours: 2,
    event_description: '',
    expected_attendance: '',
    genre: '',
    special_requests: ''
  });
  const [submitting, setSubmitting] = useState(false);

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

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(day);
    setRequestForm(prev => ({ ...prev, event_date: dateStr }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please sign in to send a booking request');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/bookings', {
        venue_id: venueId,
        event_date: new Date(requestForm.event_date).toISOString(),
        event_time: requestForm.event_time,
        duration_hours: parseFloat(requestForm.duration_hours),
        event_name: requestForm.event_name,
        event_description: requestForm.event_description || null,
        expected_attendance: requestForm.expected_attendance ? parseInt(requestForm.expected_attendance) : null,
        genre: requestForm.genre || null,
        special_requests: requestForm.special_requests || null
      });
      
      setShowRequestModal(false);
      setRequestForm({
        event_name: '',
        event_date: '',
        event_time: '8:00 PM',
        duration_hours: 2,
        event_description: '',
        expected_attendance: '',
        genre: '',
        special_requests: ''
      });
      fetchCalendar();
      alert('Booking request sent successfully!');
    } catch (error) {
      console.error('Error sending booking request:', error);
      alert(error.response?.data?.detail || 'Failed to send booking request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    
    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const isSelected = selectedDate === day;
      const isToday = new Date().getDate() === day && 
                      new Date().getMonth() === currentMonth && 
                      new Date().getFullYear() === currentYear;
      
      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`
            h-24 border rounded-lg p-1 cursor-pointer transition-colors
            ${isDark ? 'border-dark-300' : 'border-gray-200'}
            ${isSelected ? 'ring-2 ring-primary' : ''}
            ${isToday ? (isDark ? 'bg-dark-300' : 'bg-gray-100') : ''}
            hover:${isDark ? 'bg-dark-300' : 'bg-gray-50'}
          `}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-primary' : isDark ? 'text-white' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="mt-1 space-y-1 overflow-hidden">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className={`text-xs px-1 py-0.5 rounded truncate ${
                  event.status === 'accepted' 
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {event.event_name}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
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

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              to={`/profile/${venueId}`}
              className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} flex items-center gap-1`}
            >
              ← Back to Profile
            </Link>
            <h1 className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {venue?.venue_name || venue?.username}'s Calendar
            </h1>
            {venue?.location && (
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                📍 {venue.location}
              </p>
            )}
          </div>
          
          {!isVenueOwner && user && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-6 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Request Booking
            </button>
          )}
        </div>

        {/* Calendar Navigation */}
        <div className={`rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg p-6`}>
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
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={`text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {renderCalendar()}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-dark-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/50" />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Confirmed</span>
            </div>
            {isVenueOwner && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500/50" />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Selected Date Events */}
        {selectedDate && (
          <div className={`mt-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'} shadow-lg p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Events on {MONTHS[currentMonth]} {selectedDate}, {currentYear}
            </h3>
            
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                No events scheduled for this date.
                {!isVenueOwner && user && ' Click "Request Booking" to schedule a performance!'}
              </p>
            ) : (
              <div className="space-y-4">
                {getEventsForDate(selectedDate).map(event => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {event.event_name}
                        </h4>
                        <div className={`flex items-center gap-4 mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {event.event_time} ({event.duration_hours}h)
                          </span>
                          <Link to={`/profile/${event.artist_id}`} className="hover:text-primary">
                            <span className="flex items-center gap-1">
                              <Music className="w-4 h-4" />
                              {event.artist_username}
                            </span>
                          </Link>
                          {event.genre && (
                            <span>{event.genre}</span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        event.status === 'accepted' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {event.status === 'accepted' ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Booking Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-2xl ${isDark ? 'bg-dark-400' : 'bg-white'} p-6 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Request Booking
              </h2>
              <button onClick={() => setShowRequestModal(false)} className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={requestForm.event_name}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, event_name: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="e.g., Friday Night Jazz"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={requestForm.event_date}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, event_date: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Time *
                  </label>
                  <select
                    value={requestForm.event_time}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, event_time: e.target.value }))}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i % 12 || 12;
                      const ampm = i < 12 ? 'AM' : 'PM';
                      return [`${hour}:00 ${ampm}`, `${hour}:30 ${ampm}`];
                    }).flat().map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Duration (hours)
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
                  </select>
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
                  Genre
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
                  Event Description
                </label>
                <textarea
                  value={requestForm.event_description}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, event_description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Describe your performance..."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Special Requests
                </label>
                <textarea
                  value={requestForm.special_requests}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, special_requests: e.target.value }))}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Any special requirements or requests..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className={`flex-1 py-2 rounded-lg font-medium ${isDark ? 'bg-dark-300 text-white hover:bg-dark-200' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueCalendarPage;
