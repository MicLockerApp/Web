import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Ticket, ChevronLeft, RefreshCw, Filter, Search, Clock, User,
  MessageSquare, CheckCircle, AlertCircle, Send, XCircle,
  ChevronDown, Mail, Calendar, ArrowLeft, Paperclip, Image, FileText, ExternalLink
} from 'lucide-react';

const TICKET_STATUSES = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// Status badge component
const StatusBadge = ({ status }) => {
  const colors = {
    open: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-purple-500/20 text-purple-400',
    waiting_on_customer: 'bg-yellow-500/20 text-yellow-400',
    resolved: 'bg-green-500/20 text-green-400',
    closed: 'bg-gray-500/20 text-gray-400'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.open}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// Priority badge component
const PriorityBadge = ({ priority }) => {
  const colors = {
    low: 'bg-gray-500/20 text-gray-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[priority] || colors.medium}`}>
      {priority}
    </span>
  );
};

// Ticket List View
const TicketListView = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: ''
  });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated || !user?.is_admin) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      params.append('limit', '100');

      const [ticketsRes, statsRes] = await Promise.all([
        api.get(`/tickets/admin/all?${params.toString()}`),
        api.get('/tickets/admin/stats')
      ]);

      setTickets(ticketsRes.data.tickets || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, filters]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!authLoading && user && !user.is_admin) {
      navigate('/');
      return;
    }
    fetchTickets();
  }, [authLoading, isAuthenticated, user, navigate, fetchTickets]);

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_number?.toLowerCase().includes(query) ||
      ticket.subject?.toLowerCase().includes(query) ||
      ticket.customer_name?.toLowerCase().includes(query) ||
      ticket.customer_email?.toLowerCase().includes(query)
    );
  });

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`} data-testid="admin-tickets-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/admin/analytics" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Ticket className="w-8 h-8 text-primary" />
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Support Tickets
              </h1>
            </div>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage customer support requests
            </p>
          </div>
          
          <button
            onClick={fetchTickets}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
              <p className="text-3xl font-bold text-orange-400">{stats.pending_total || 0}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Pending</p>
            </div>
            <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
              <p className="text-3xl font-bold text-blue-400">{stats.open || 0}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Open</p>
            </div>
            <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
              <p className="text-3xl font-bold text-purple-400">{stats.in_progress || 0}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>In Progress</p>
            </div>
            <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
              <p className="text-3xl font-bold text-red-400">{stats.urgent_tickets || 0}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Urgent</p>
            </div>
            <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
              <p className="text-3xl font-bold text-green-400">{stats.resolved || 0}</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Resolved</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-dark-500 text-white border-dark-300 placeholder-gray-500' 
                    : 'bg-gray-50 text-gray-900 border-gray-200 placeholder-gray-400'
                } border focus:ring-2 focus:ring-primary/50 focus:border-primary`}
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className={`appearance-none pl-4 pr-10 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-dark-500 text-white border-dark-300' 
                    : 'bg-gray-50 text-gray-900 border-gray-200'
                } border focus:ring-2 focus:ring-primary/50 focus:border-primary`}
              >
                <option value="">All Statuses</option>
                {TICKET_STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className={`appearance-none pl-4 pr-10 py-2 rounded-lg ${
                  isDark 
                    ? 'bg-dark-500 text-white border-dark-300' 
                    : 'bg-gray-50 text-gray-900 border-gray-200'
                } border focus:ring-2 focus:ring-primary/50 focus:border-primary`}
              >
                <option value="">All Priorities</option>
                {TICKET_PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>

            {(filters.status || filters.priority || searchQuery) && (
              <button
                onClick={() => {
                  setFilters({ status: '', priority: '', category: '' });
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-white text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Tickets List */}
        <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
          {filteredTickets.length > 0 ? (
            <div className="divide-y divide-dark-300">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-primary font-mono text-sm">{ticket.ticket_number}</span>
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      <h3 className={`font-medium mb-1 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {ticket.subject}
                      </h3>
                      <div className={`flex items-center gap-4 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ticket.customer_name}
                        </span>
                        <span>{ticket.category}</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {ticket.replies?.length || 0} replies
                        </span>
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-primary">
                            <Paperclip className="w-3 h-3" />
                            {ticket.attachments.length} {ticket.attachments.length === 1 ? 'file' : 'files'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`text-right text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Ticket className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                No tickets found
              </h3>
              <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {searchQuery || filters.status || filters.priority
                  ? 'Try adjusting your filters'
                  : 'Support tickets will appear here'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Ticket Detail View
const TicketDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!isAuthenticated || !user?.is_admin) return;
    
    try {
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, user]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!authLoading && user && !user.is_admin) {
      navigate('/');
      return;
    }
    fetchTicket();
  }, [authLoading, isAuthenticated, user, navigate, fetchTicket]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSending(true);
    try {
      await api.post(`/tickets/${id}/reply`, { message: replyText });
      setReplyText('');
      fetchTicket();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/tickets/admin/${id}/status`, { status: newStatus });
      setTicket({ ...ticket, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    setUpdating(true);
    try {
      await api.put(`/tickets/admin/${id}/status`, { status: ticket.status, priority: newPriority });
      setTicket({ ...ticket, priority: newPriority });
    } catch (error) {
      console.error('Error updating priority:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;
  if (!ticket) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Ticket Not Found
          </h2>
          <button onClick={() => navigate('/admin/tickets')} className="btn btn-primary mt-4">
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`} data-testid="ticket-detail-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/tickets')}
            className={`flex items-center gap-2 mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Tickets
          </button>
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-primary font-mono">{ticket.ticket_number}</span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {ticket.subject}
              </h1>
            </div>
          </div>
        </div>

        {/* Customer Info & Controls */}
        <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
          <div className="flex flex-wrap gap-6 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {ticket.customer_name}
                </p>
                <a href={`mailto:${ticket.customer_email}`} className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-400 hover:text-primary' : 'text-gray-500 hover:text-primary'}`}>
                  <Mail className="w-3 h-3" />
                  {ticket.customer_email}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Status Dropdown */}
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    isDark 
                      ? 'bg-dark-500 text-white border-dark-300' 
                      : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border`}
                >
                  {TICKET_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Priority Dropdown */}
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Priority</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  disabled={updating}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    isDark 
                      ? 'bg-dark-500 text-white border-dark-300' 
                      : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border`}
                >
                  {TICKET_PRIORITIES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={`flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm ${isDark ? 'border-dark-300 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
            <span>Category: <strong>{ticket.category}</strong></span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created: {new Date(ticket.created_at).toLocaleString()}
            </span>
            {ticket.order_id && (
              <span>Order: <Link to={`/orders/${ticket.order_id}`} className="text-primary">{ticket.order_id}</Link></span>
            )}
          </div>
        </div>

        {/* Original Message */}
        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {ticket.customer_name}
                </span>
                <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
              <p className={`whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {ticket.message}
              </p>
            </div>
          </div>
        </div>

        {/* Attachments Section */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`} data-testid="ticket-attachments">
            <div className="flex items-center gap-2 mb-4">
              <Paperclip className="w-5 h-5 text-primary" />
              <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Attachments ({ticket.attachments.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ticket.attachments.map((attachment, index) => {
                const isImage = attachment.type?.startsWith('image/');
                return (
                  <div
                    key={index}
                    className={`rounded-lg overflow-hidden border ${isDark ? 'border-dark-300 bg-dark-500' : 'border-gray-200 bg-gray-50'}`}
                  >
                    {isImage ? (
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={attachment.url}
                          alt={attachment.filename || `Attachment ${index + 1}`}
                          className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="hidden w-full h-40 items-center justify-center bg-dark-300">
                          <AlertCircle className="w-8 h-8 text-gray-500" />
                        </div>
                      </a>
                    ) : (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center h-40 ${isDark ? 'bg-dark-300' : 'bg-gray-100'} hover:opacity-90 transition-opacity`}
                      >
                        <FileText className="w-12 h-12 text-gray-400" />
                      </a>
                    )}
                    <div className={`p-3 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
                      <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {attachment.filename || 'Unnamed file'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {attachment.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                        </span>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-yellow-400 text-xs flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Replies */}
        {ticket.replies && ticket.replies.length > 0 && (
          <div className="space-y-4 mb-6">
            {ticket.replies.map((reply, index) => (
              <div
                key={index}
                className={`rounded-xl p-6 ${
                  reply.sender_type === 'staff'
                    ? isDark ? 'bg-primary/10 border border-primary/20' : 'bg-yellow-50 border border-yellow-100'
                    : isDark ? 'bg-dark-400' : 'bg-white shadow'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    reply.sender_type === 'staff' 
                      ? 'bg-primary text-black' 
                      : isDark ? 'bg-dark-300' : 'bg-gray-100'
                  }`}>
                    {reply.sender_type === 'staff' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {reply.sender_name}
                      </span>
                      {reply.sender_type === 'staff' && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">Staff</span>
                      )}
                      <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(reply.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className={`whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {reply.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply Form */}
        {ticket.status !== 'closed' && (
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
            <h3 className={`font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Reply to Customer
            </h3>
            <form onSubmit={handleReply}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response..."
                rows={4}
                className={`w-full px-4 py-3 rounded-xl mb-4 ${
                  isDark 
                    ? 'bg-dark-500 text-white border-dark-300 placeholder-gray-500' 
                    : 'bg-gray-50 text-gray-900 border-gray-200 placeholder-gray-400'
                } border focus:ring-2 focus:ring-primary/50 focus:border-primary`}
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('waiting_on_customer')}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      isDark ? 'bg-dark-300 text-gray-300 hover:bg-dark-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={updating}
                  >
                    Mark as Waiting on Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('resolved')}
                    className="px-4 py-2 rounded-lg text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    disabled={updating}
                  >
                    Mark as Resolved
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="btn btn-primary"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Closed Notice */}
        {ticket.status === 'closed' && (
          <div className={`rounded-xl p-6 text-center ${isDark ? 'bg-dark-400' : 'bg-white shadow'}`}>
            <XCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              This ticket has been closed.
            </p>
            <button
              onClick={() => handleStatusChange('open')}
              className="btn btn-secondary mt-4"
              disabled={updating}
            >
              Reopen Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main component that routes to list or detail
const AdminTicketsPage = () => {
  const { id } = useParams();
  
  if (id) {
    return <TicketDetailView />;
  }
  return <TicketListView />;
};

export default AdminTicketsPage;
