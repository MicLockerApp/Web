import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Flag, ArrowLeft, ChevronLeft, ChevronRight, Eye, Trash2, AlertTriangle,
  Ban, MessageSquare, CheckCircle, X, ExternalLink, RefreshCw
} from 'lucide-react';

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || (!user?.is_admin && !user?.is_employee)) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, user, navigate, authLoading]);

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchReports(), fetchStats()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (page = 1) => {
    try {
      const res = await api.get('/reports/admin/all', {
        params: { status: statusFilter || undefined, page, limit: 20 }
      });
      setReports(res.data.reports || []);
      setPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/reports/admin/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAction = async (reportId, action) => {
    setActionLoading(reportId);
    try {
      await api.post(`/reports/admin/${reportId}/action`, {
        action,
        admin_response: adminResponse || null,
        notify_reporter: true,
        notify_seller: true
      });
      setSelectedReport(null);
      setAdminResponse('');
      fetchReports(pagination.page);
      fetchStats();
    } catch (error) {
      console.error('Error taking action:', error);
      alert(error.response?.data?.detail || 'Failed to take action');
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      counterfeit: 'Counterfeit/Fake',
      prohibited: 'Prohibited Item',
      misleading: 'Misleading Description',
      wrong_category: 'Wrong Category',
      price_gouging: 'Price Gouging',
      spam: 'Spam/Duplicate',
      stolen: 'Potentially Stolen',
      other: 'Other Issue'
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      under_review: 'bg-blue-500/20 text-blue-400',
      resolved: 'bg-green-500/20 text-green-400',
      dismissed: 'bg-gray-500/20 text-gray-400'
    };
    return styles[status] || 'bg-gray-500/20 text-gray-400';
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-dark-600" data-testid="admin-reports-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 bg-dark-400 rounded-lg hover:bg-dark-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex items-center gap-3">
              <Flag className="w-8 h-8 text-red-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Flagged Listings</h1>
                <p className="text-gray-400 text-sm">Review and manage user reports</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => fetchData()}
            className="btn btn-secondary"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-dark-400 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              <p className="text-gray-500 text-sm">Pending</p>
            </div>
            <div className="bg-dark-400 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">{stats.under_review}</p>
              <p className="text-gray-500 text-sm">Under Review</p>
            </div>
            <div className="bg-dark-400 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{stats.resolved}</p>
              <p className="text-gray-500 text-sm">Resolved</p>
            </div>
            <div className="bg-dark-400 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-400">{stats.dismissed}</p>
              <p className="text-gray-500 text-sm">Dismissed</p>
            </div>
            <div className="bg-dark-400 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-gray-500 text-sm">Total</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['pending', 'under_review', 'resolved', 'dismissed', ''].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-black'
                  : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-dark-300'
              }`}
            >
              {status === '' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {reports.length > 0 ? (
            reports.map(report => (
              <div
                key={report.id}
                className="bg-dark-400 rounded-xl p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Report Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`badge ${getStatusBadge(report.status)}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                      <span className="badge bg-red-500/20 text-red-400">
                        {getCategoryLabel(report.category)}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {report.listing_title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm mb-3">
                      Reported by <span className="text-primary">{report.reporter_username}</span> • 
                      Seller: <Link to={`/profile/${report.seller_id}`} className="text-primary hover:underline">
                        {report.seller_username}
                      </Link>
                    </p>
                    
                    <div className="bg-dark-300 rounded-lg p-3 mb-3">
                      <p className="text-gray-300 text-sm">{report.description}</p>
                    </div>
                    
                    <p className="text-gray-500 text-xs">
                      Submitted: {new Date(report.created_at).toLocaleString()}
                    </p>
                    
                    {report.action_taken && (
                      <div className="mt-3 p-3 bg-dark-300 rounded-lg border-l-4 border-green-500">
                        <p className="text-green-400 text-sm font-medium">
                          Action taken: {report.action_taken.replace('_', ' ')}
                        </p>
                        {report.admin_response && (
                          <p className="text-gray-400 text-sm mt-1">{report.admin_response}</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <a
                      href={report.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary text-sm flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Listing
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    
                    {report.status === 'pending' || report.status === 'under_review' ? (
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="btn btn-primary text-sm"
                      >
                        Take Action
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-dark-400 rounded-xl p-12 text-center">
              <Flag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No reports found</p>
              <p className="text-gray-500 text-sm">
                {statusFilter ? `No ${statusFilter.replace('_', ' ')} reports` : 'No reports have been submitted yet'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-gray-400 text-sm">
              Showing {reports.length} of {pagination.total} reports
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchReports(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 bg-dark-400 rounded-lg disabled:opacity-50 hover:bg-dark-300"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <span className="px-4 py-2 text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchReports(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 bg-dark-400 rounded-lg disabled:opacity-50 hover:bg-dark-300"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* Action Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-400 rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Take Action on Report</h2>
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setAdminResponse('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-400 mb-2">Listing:</p>
                <p className="text-white font-medium">{selectedReport.listing_title}</p>
                <p className="text-gray-500 text-sm">by {selectedReport.seller_username}</p>
              </div>

              <div className="mb-6">
                <p className="text-gray-400 mb-2">Reason reported:</p>
                <p className="text-gray-300">{selectedReport.description}</p>
              </div>

              <div className="mb-6">
                <label className="block text-gray-400 mb-2">Admin Response (optional)</label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Add a note about your decision..."
                  rows={3}
                  className="w-full bg-dark-300 border border-dark-200 rounded-lg px-4 py-3 text-white"
                />
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleAction(selectedReport.id, 'dismiss')}
                  disabled={actionLoading}
                  className="w-full p-4 rounded-xl border-2 border-gray-500/30 bg-gray-500/10 hover:bg-gray-500/20 flex items-center gap-4 transition-all disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-gray-500/20 rounded-full flex items-center justify-center">
                    <X className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-300">Dismiss Report</p>
                    <p className="text-gray-500 text-sm">No violation found, close report</p>
                  </div>
                </button>

                <button
                  onClick={() => handleAction(selectedReport.id, 'warn_seller')}
                  disabled={actionLoading}
                  className="w-full p-4 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 flex items-center gap-4 transition-all disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-yellow-400">Warn Seller</p>
                    <p className="text-gray-500 text-sm">Send a warning to the seller</p>
                  </div>
                </button>

                <button
                  onClick={() => handleAction(selectedReport.id, 'delete_listing')}
                  disabled={actionLoading}
                  className="w-full p-4 rounded-xl border-2 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 flex items-center gap-4 transition-all disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-red-400">Remove Listing</p>
                    <p className="text-gray-500 text-sm">Take down the listing immediately</p>
                  </div>
                </button>

                <button
                  onClick={() => handleAction(selectedReport.id, 'ban_seller')}
                  disabled={actionLoading}
                  className="w-full p-4 rounded-xl border-2 border-red-700/30 bg-red-900/10 hover:bg-red-900/20 flex items-center gap-4 transition-all disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-red-700/20 rounded-full flex items-center justify-center">
                    <Ban className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-red-500">Ban Seller</p>
                    <p className="text-gray-500 text-sm">Permanently ban the seller account</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedReport(null);
                  setAdminResponse('');
                }}
                className="w-full mt-4 py-3 bg-dark-300 hover:bg-dark-200 text-gray-400 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;
