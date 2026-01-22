import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDateRange } from '../context/DateRangeContext';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  DollarSign, Package, Users, ShoppingCart, TrendingUp, AlertCircle, CreditCard, Percent,
  Search, ChevronLeft, ChevronRight, Eye, Ban, CheckCircle, Trash2, RefreshCw,
  BarChart3, Calendar, UserCheck, Package2, UserPlus, Shield, Briefcase, X, Edit, Mail,
  AlertTriangle, UserX, Clock
} from 'lucide-react';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { startDate, endDate, setStartDate, setEndDate, formatDateRange, setLast7Days, setLast30Days, setLast90Days } = useDateRange();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [listings, setListings] = useState([]);
  const [listingsPagination, setListingsPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [orders, setOrders] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [listingStatus, setListingStatus] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [newEmployee, setNewEmployee] = useState({ username: '', email: '', role: 'employee' });
  const [employeeError, setEmployeeError] = useState('');
  
  // User action modal state
  const [showUserActionModal, setShowUserActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [userActionError, setUserActionError] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Reset analytics modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    reset_orders: false,
    reset_analytics_events: false,
    reset_analytics_rollups: false,
    reset_support_tickets: false,
    reset_all: false
  });
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // Role hierarchy for UI
  const ROLE_OPTIONS = ['owner', 'admin', 'manager', 'employee', 'user'];
  const PROTECTED_EMAILS = ['james.mcdougall@miclockerapp.com', 'info@miclockerapp.com'];

  // Determine user role permissions
  const currentUserRole = user?.role || (user?.is_admin ? 'admin' : 'user');
  const userRole = analytics?.user_role || currentUserRole;
  const isOwner = userRole === 'owner' || (user?.is_admin && !user?.employee_role);
  const isAdminOrOwner = currentUserRole === 'owner' || currentUserRole === 'admin' || user?.is_admin;
  const isManager = userRole === 'manager';
  const isEmployee = userRole === 'employee';

  // Permission checks
  const canSeeFinancials = isOwner; // Only owner sees GMV, fees, etc.
  const canSeeAllStats = isOwner || isManager; // Owner and manager see activity stats
  const canManageEmployees = isOwner || isManager; // Owner and manager can manage employees
  const canResetAnalytics = isAdminOrOwner; // Only admin or owner can reset analytics

  useEffect(() => {
    if (authLoading) return;
    
    // Allow access for admins and employees
    if (!isAuthenticated || (!user?.is_admin && !user?.is_employee)) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, user, navigate, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const analyticsRes = await adminAPI.getAnalytics();
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      const res = await adminAPI.getUsers({ page, limit: 20, search: userSearch || undefined });
      setUsers(res.data.users || []);
      setUsersPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchListings = async (page = 1) => {
    try {
      const res = await adminAPI.getListings({ page, limit: 20, status: listingStatus || undefined });
      setListings(res.data.listings || []);
      setListingsPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const fetchOrders = async (page = 1) => {
    try {
      const res = await adminAPI.getOrders({ page, limit: 20, status: orderStatus || undefined });
      setOrders(res.data.orders || []);
      setOrdersPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await adminAPI.getEmployees();
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'listings') fetchListings();
    else if (activeTab === 'orders') fetchOrders();
    else if (activeTab === 'employees' && canManageEmployees) fetchEmployees();
  }, [activeTab]);

  const handleSuspendUser = async (userId, isSuspended) => {
    if (!window.confirm(`Are you sure you want to ${isSuspended ? 'unsuspend' : 'suspend'} this user?`)) return;
    setActionLoading(userId);
    try {
      if (isSuspended) {
        await adminAPI.unsuspendUser(userId);
      } else {
        await adminAPI.suspendUser(userId);
      }
      fetchUsers(usersPagination.page);
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Open user action modal
  const openUserActionModal = (userToManage) => {
    setSelectedUser(userToManage);
    setBanReason('');
    setUserActionError('');
    setSelectedRole(userToManage.role || 'user');
    setShowUserActionModal(true);
  };

  // Handle suspend from modal
  const handleSuspendFromModal = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    setUserActionError('');
    try {
      if (selectedUser.is_suspended && !selectedUser.is_banned) {
        await adminAPI.unsuspendUser(selectedUser.id);
      } else {
        await adminAPI.suspendUser(selectedUser.id);
      }
      setShowUserActionModal(false);
      fetchUsers(usersPagination.page);
    } catch (error) {
      setUserActionError(error.response?.data?.detail || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle ban user
  const handleBanUser = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    setUserActionError('');
    try {
      await adminAPI.banUser(selectedUser.id, banReason || null);
      setShowUserActionModal(false);
      fetchUsers(usersPagination.page);
    } catch (error) {
      setUserActionError(error.response?.data?.detail || 'Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle unban user
  const handleUnbanUser = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    setUserActionError('');
    try {
      await adminAPI.unbanUser(selectedUser.id);
      setShowUserActionModal(false);
      fetchUsers(usersPagination.page);
    } catch (error) {
      setUserActionError(error.response?.data?.detail || 'Failed to unban user');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle role change
  const handleRoleChange = async () => {
    if (!selectedUser || !selectedRole) return;
    if (selectedRole === (selectedUser.role || 'user')) {
      setUserActionError('Role is already set to this value');
      return;
    }
    setActionLoading(selectedUser.id);
    setUserActionError('');
    try {
      await adminAPI.changeUserRole(selectedUser.id, selectedRole);
      setShowUserActionModal(false);
      fetchUsers(usersPagination.page);
    } catch (error) {
      setUserActionError(error.response?.data?.detail || 'Failed to change user role');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`PERMANENT ACTION: Are you absolutely sure you want to delete ${selectedUser.username}? This will remove ALL their data including listings, messages, and orders. This cannot be undone!`)) {
      return;
    }
    setActionLoading(selectedUser.id);
    setUserActionError('');
    try {
      await adminAPI.deleteUser(selectedUser.id);
      setShowUserActionModal(false);
      fetchUsers(usersPagination.page);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to delete user';
      if (error.response?.status === 403) {
        setUserActionError(errorMessage);
      } else {
        setUserActionError(errorMessage);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reset analytics
  const handleResetAnalytics = async () => {
    if (resetConfirmation !== 'CONFIRM_RESET') {
      setResetError('Please type CONFIRM_RESET to proceed');
      return;
    }
    
    const hasSelection = resetOptions.reset_all || resetOptions.reset_orders || 
                         resetOptions.reset_analytics_events || resetOptions.reset_analytics_rollups ||
                         resetOptions.reset_support_tickets;
    
    if (!hasSelection) {
      setResetError('Please select at least one option to reset');
      return;
    }
    
    setResetLoading(true);
    setResetError('');
    
    try {
      await adminAPI.resetAnalytics({
        ...resetOptions,
        confirmation: resetConfirmation
      });
      
      // Refresh analytics data
      fetchData();
      
      // Close modal and reset state
      setShowResetModal(false);
      setResetOptions({
        reset_orders: false,
        reset_analytics_events: false,
        reset_analytics_rollups: false,
        reset_support_tickets: false,
        reset_all: false
      });
      setResetConfirmation('');
      
      alert('Analytics data reset successfully!');
    } catch (error) {
      setResetError(error.response?.data?.detail || 'Failed to reset analytics');
    } finally {
      setResetLoading(false);
    }
  };

  const handleRemoveListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    setActionLoading(listingId);
    try {
      await adminAPI.removeListing(listingId);
      fetchListings(listingsPagination.page);
    } catch (error) {
      console.error('Error removing listing:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setEmployeeError('');
    try {
      await adminAPI.createEmployee(newEmployee);
      setShowAddEmployeeModal(false);
      setNewEmployee({ username: '', email: '', role: 'employee' });
      fetchEmployees();
    } catch (error) {
      setEmployeeError(error.response?.data?.detail || 'Failed to create employee');
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    setEmployeeError('');
    try {
      await adminAPI.updateEmployeeDetails(editingEmployee.id, {
        username: editingEmployee.username,
        email: editingEmployee.email
      });
      setShowEditEmployeeModal(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      setEmployeeError(error.response?.data?.detail || 'Failed to update employee');
    }
  };

  const handleResendSetupEmail = async (employeeId) => {
    try {
      await adminAPI.resendSetupEmail(employeeId);
      alert('Password setup email sent successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to send email');
    }
  };

  const openEditModal = (employee) => {
    setEditingEmployee({ ...employee });
    setEmployeeError('');
    setShowEditEmployeeModal(true);
  };

  const handleUpdateEmployeeRole = async (employeeId, newRole) => {
    try {
      await adminAPI.updateEmployeeRole(employeeId, newRole);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee role:', error);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await adminAPI.deleteEmployee(employeeId);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error.response?.data?.detail || 'Failed to delete employee');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400',
      sold: 'bg-purple-500/20 text-purple-400',
      draft: 'bg-gray-500/20 text-gray-400',
      removed: 'bg-red-500/20 text-red-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      paid: 'bg-green-500/20 text-green-400',
      shipped: 'bg-blue-500/20 text-blue-400',
      delivered: 'bg-purple-500/20 text-purple-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
      refunded: 'bg-orange-500/20 text-orange-400',
    };
    return styles[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-red-500/20 text-red-400',
      manager: 'bg-blue-500/20 text-blue-400',
      employee: 'bg-green-500/20 text-green-400',
    };
    return styles[role] || 'bg-gray-500/20 text-gray-400';
  };

  // Define tabs based on role
  const getTabs = () => {
    const baseTabs = [
      { id: 'users', label: 'Users', icon: Users },
      { id: 'listings', label: 'Listings', icon: Package },
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
    ];

    // Overview tab only for owner and manager
    if (canSeeAllStats) {
      baseTabs.unshift({ id: 'overview', label: 'Overview', icon: BarChart3 });
    }

    // Employees tab only for owner
    if (canManageEmployees) {
      baseTabs.push({ id: 'employees', label: 'Team', icon: Briefcase });
    }

    return baseTabs;
  };

  if (authLoading || loading) return <LoadingSpinner />;

  // Set default tab based on role
  if (isEmployee && activeTab === 'overview') {
    setActiveTab('users');
  }

  return (
    <div className="min-h-screen" data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-sm text-gray-400">
                Logged in as: <span className={`badge ${getRoleBadge(userRole)} ml-1`}>{userRole || 'Owner'}</span>
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-dark-300 mb-8 overflow-x-auto pb-2">
          {getTabs().map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-black'
                  : 'text-gray-400 hover:text-white hover:bg-dark-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          
          {/* Quick Links */}
          <div className="flex gap-2 ml-auto">
            {/* Link to Reports - for all admin/employee */}
            <Link
              to="/admin/reports"
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500"
              data-testid="reports-link"
            >
              <AlertCircle className="w-4 h-4" />
              Flagged Listings
            </Link>
            
            {/* Link to Analytics Dashboard - only for owner/manager */}
            {canSeeAllStats && (
              <Link
                to="/admin/analytics"
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
              >
                <TrendingUp className="w-4 h-4" />
                Advanced Analytics
              </Link>
            )}
          </div>
        </div>

        {/* Overview Tab - Only for owner and manager */}
        {activeTab === 'overview' && canSeeAllStats && (
          <>
            {/* Reset Analytics Button - Only for Admin/Owner */}
            {canResetAnalytics && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowResetModal(true)}
                  className="px-4 py-2 bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors flex items-center gap-2 text-sm"
                  data-testid="reset-analytics-btn"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Analytics Data
                </button>
              </div>
            )}
            
            {/* Stats Cards */}
            <div className={`grid gap-4 mb-8 ${canSeeFinancials ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4'}`}>
              {/* Financial stats - only for owner */}
              {canSeeFinancials && (
                <>
                  <div className="bg-dark-400 rounded-xl p-6">
                    <DollarSign className="w-10 h-10 text-green-400 mb-3" />
                    <p className="text-3xl font-bold text-white">
                      ${analytics?.total_gmv?.toLocaleString() || '0'}
                    </p>
                    <p className="text-gray-400 text-sm">Total GMV</p>
                  </div>
                  <div className="bg-dark-400 rounded-xl p-6">
                    <TrendingUp className="w-10 h-10 text-primary mb-3" />
                    <p className="text-3xl font-bold text-white">
                      ${analytics?.total_fees_collected?.toLocaleString() || '0'}
                    </p>
                    <p className="text-gray-400 text-sm">Platform Fees ({analytics?.platform_fee_percent || 3}%)</p>
                  </div>
                  <div className="bg-dark-400 rounded-xl p-6">
                    <CreditCard className="w-10 h-10 text-cyan-400 mb-3" />
                    <p className="text-3xl font-bold text-white">
                      ${analytics?.total_processing_fees_collected?.toLocaleString() || '0'}
                    </p>
                    <p className="text-gray-400 text-sm">Payment Processing</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {analytics?.payment_processing_percent || 3.19}% + ${analytics?.payment_processing_fixed || 0.49}
                    </p>
                  </div>
                  <div className="bg-dark-400 rounded-xl p-6">
                    <Percent className="w-10 h-10 text-emerald-400 mb-3" />
                    <p className="text-3xl font-bold text-white">
                      ${((analytics?.total_fees_collected || 0) + (analytics?.total_processing_fees_collected || 0)).toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">Total Fees Collected</p>
                  </div>
                </>
              )}
              <div className="bg-dark-400 rounded-xl p-6">
                <Package className="w-10 h-10 text-blue-400 mb-3" />
                <p className="text-3xl font-bold text-white">
                  {analytics?.active_listings || 0}
                </p>
                <p className="text-gray-400 text-sm">Active Listings</p>
              </div>
              <div className="bg-dark-400 rounded-xl p-6">
                <Users className="w-10 h-10 text-purple-400 mb-3" />
                <p className="text-3xl font-bold text-white">
                  {analytics?.total_users || 0}
                </p>
                <p className="text-gray-400 text-sm">Total Users</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-dark-400 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Orders by Status
                </h2>
                <div className="space-y-3">
                  {Object.entries(analytics?.orders_by_status || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className={`badge ${getStatusBadge(status)}`}>{status}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  ))}
                  {Object.keys(analytics?.orders_by_status || {}).length === 0 && (
                    <p className="text-gray-500">No orders yet</p>
                  )}
                </div>
              </div>
              <div className="bg-dark-400 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Activity (30 days)
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Package2 className="w-4 h-4" />
                      <span>New Orders</span>
                    </div>
                    <span className="text-white font-medium">{analytics?.recent_orders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                      <UserCheck className="w-4 h-4" />
                      <span>New Signups</span>
                    </div>
                    <span className="text-white font-medium">{analytics?.recent_signups || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Search */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  placeholder="Search by username or email..."
                  className="pl-10"
                />
              </div>
              <button onClick={() => fetchUsers()} className="btn btn-primary">
                Search
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-dark-400 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">User</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Category</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Rating</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Sales</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Status</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Joined</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-t border-dark-300 hover:bg-dark-300/50">
                        <td className="px-6 py-4">
                          <Link to={`/profile/${u.id}`} className="flex items-center gap-3 hover:text-primary">
                            <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
                              {u.profile_image ? (
                                <img src={u.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-primary font-bold">{u.username?.[0]?.toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">{u.username}</p>
                              <p className="text-gray-500 text-sm">{u.email}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-gray-400 capitalize">{u.category?.replace('_', ' ') || '-'}</td>
                        <td className="px-6 py-4 text-gray-400">{u.rating?.toFixed(1) || '0.0'} ({u.review_count || 0})</td>
                        <td className="px-6 py-4 text-gray-400">{u.total_sales || 0}</td>
                        <td className="px-6 py-4">
                          {u.is_admin ? (
                            <span className="badge bg-primary/20 text-primary">Admin</span>
                          ) : u.is_banned ? (
                            <span className="badge bg-red-700/30 text-red-300">Banned</span>
                          ) : u.is_suspended ? (
                            <span className="badge bg-orange-500/20 text-orange-400">Suspended</span>
                          ) : u.has_lifetime_free_fees ? (
                            <span className="badge bg-green-500/20 text-green-400">VIP</span>
                          ) : (
                            <span className="badge bg-gray-500/20 text-gray-400">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Link to={`/profile/${u.id}`} className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100" title="View Profile">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </Link>
                            {!u.is_admin && !u.is_employee && (
                              <button
                                onClick={() => openUserActionModal(u)}
                                className="p-2 bg-dark-200 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                                title="Manage User"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersPagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-dark-300">
                  <p className="text-gray-400 text-sm">
                    Showing {users.length} of {usersPagination.total} users
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchUsers(usersPagination.page - 1)}
                      disabled={usersPagination.page <= 1}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 text-gray-400">
                      Page {usersPagination.page} of {usersPagination.pages}
                    </span>
                    <button
                      onClick={() => fetchUsers(usersPagination.page + 1)}
                      disabled={usersPagination.page >= usersPagination.pages}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {['', 'active', 'sold', 'removed'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setListingStatus(status);
                    setTimeout(() => fetchListings(), 100);
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${listingStatus === status ? 'bg-primary text-black' : 'bg-dark-400 text-gray-400 hover:text-white'}`}
                >
                  {status || 'All'}
                </button>
              ))}
            </div>

            {/* Listings Table */}
            <div className="bg-dark-400 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Listing</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Seller</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Price</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Category</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Status</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Views</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map(listing => (
                      <tr key={listing.id} className="border-t border-dark-300 hover:bg-dark-300/50">
                        <td className="px-6 py-4">
                          <Link to={`/listing/${listing.id}`} className="flex items-center gap-3 hover:text-primary">
                            <img
                              src={listing.media?.[0]?.url || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                              alt=""
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <span className="text-white font-medium truncate max-w-xs">{listing.title}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/profile/${listing.seller_id}`} className="text-gray-400 hover:text-primary">
                            {listing.seller_username}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-primary font-medium">${listing.price?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-400">{listing.category}</td>
                        <td className="px-6 py-4">
                          <span className={`badge ${getStatusBadge(listing.status)}`}>{listing.status}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{listing.view_count || 0}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Link to={`/listing/${listing.id}`} className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100" title="View">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </Link>
                            {listing.status !== 'removed' && (
                              <button
                                onClick={() => handleRemoveListing(listing.id)}
                                disabled={actionLoading === listing.id}
                                className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {listingsPagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-dark-300">
                  <p className="text-gray-400 text-sm">
                    Showing {listings.length} of {listingsPagination.total} listings
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchListings(listingsPagination.page - 1)}
                      disabled={listingsPagination.page <= 1}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 text-gray-400">
                      Page {listingsPagination.page} of {listingsPagination.pages}
                    </span>
                    <button
                      onClick={() => fetchListings(listingsPagination.page + 1)}
                      disabled={listingsPagination.page >= listingsPagination.pages}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {['', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setOrderStatus(status);
                    setTimeout(() => fetchOrders(), 100);
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${orderStatus === status ? 'bg-primary text-black' : 'bg-dark-400 text-gray-400 hover:text-white'}`}
                >
                  {status || 'All'}
                </button>
              ))}
            </div>

            {/* Orders Table */}
            <div className="bg-dark-400 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Order</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Buyer</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Total</th>
                      {canSeeFinancials && (
                        <>
                          <th className="px-6 py-3 text-left text-gray-400 text-sm">Platform Fee</th>
                          <th className="px-6 py-3 text-left text-gray-400 text-sm">Processing Fee</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Status</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Date</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-t border-dark-300 hover:bg-dark-300/50">
                        <td className="px-6 py-4 text-white font-medium">{order.order_number}</td>
                        <td className="px-6 py-4">
                          <Link to={`/profile/${order.buyer_id}`} className="text-gray-400 hover:text-primary">
                            {order.buyer_username}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-white">${order.total?.toLocaleString()}</td>
                        {canSeeFinancials && (
                          <>
                            <td className="px-6 py-4 text-primary">${order.platform_fee?.toFixed(2)}</td>
                            <td className="px-6 py-4 text-cyan-400">${(order.payment_processing_fee || 0)?.toFixed(2)}</td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Link to={`/orders/${order.id}`} className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100 inline-block" title="View">
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {ordersPagination.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-dark-300">
                  <p className="text-gray-400 text-sm">
                    Showing {orders.length} of {ordersPagination.total} orders
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchOrders(ordersPagination.page - 1)}
                      disabled={ordersPagination.page <= 1}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 text-gray-400">
                      Page {ordersPagination.page} of {ordersPagination.pages}
                    </span>
                    <button
                      onClick={() => fetchOrders(ordersPagination.page + 1)}
                      disabled={ordersPagination.page >= ordersPagination.pages}
                      className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Employees Tab - Owner Only */}
        {activeTab === 'employees' && canManageEmployees && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Team Management</h2>
              <button
                onClick={() => setShowAddEmployeeModal(true)}
                className="btn btn-primary"
              >
                <UserPlus className="w-4 h-4" />
                Add Employee
              </button>
            </div>

            {/* Role Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-dark-400 rounded-xl p-4 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  <span className="font-semibold text-red-400">Admin</span>
                </div>
                <p className="text-gray-400 text-sm">Full access to all features including financials, analytics, and team management.</p>
              </div>
              <div className="bg-dark-400 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-blue-400">Manager</span>
                </div>
                <p className="text-gray-400 text-sm">Access to all features except financial data (GMV, fees, revenue).</p>
              </div>
              <div className="bg-dark-400 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-green-400">Employee</span>
                </div>
                <p className="text-gray-400 text-sm">Access to Users, Listings, Orders, and Support Tickets only.</p>
              </div>
            </div>

            {/* Employees Table */}
            <div className="bg-dark-400 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Employee</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Role</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Status</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Added</th>
                      <th className="px-6 py-3 text-left text-gray-400 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id} className="border-t border-dark-300 hover:bg-dark-300/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
                              <span className="text-primary font-bold">{emp.username?.[0]?.toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{emp.username}</p>
                              <p className="text-gray-500 text-sm">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {emp.is_first_user ? (
                            <span className="badge bg-purple-500/20 text-purple-400">Owner</span>
                          ) : (
                            <select
                              value={emp.employee_role || 'admin'}
                              onChange={(e) => handleUpdateEmployeeRole(emp.id, e.target.value)}
                              className="bg-dark-300 text-white rounded-lg px-3 py-1 text-sm border-none"
                              disabled={emp.is_first_user}
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="employee">Employee</option>
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {emp.password_setup_required ? (
                            <span className="badge bg-yellow-500/20 text-yellow-400">Pending Setup</span>
                          ) : (
                            <span className="badge bg-green-500/20 text-green-400">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(emp.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(emp)}
                              className="p-2 bg-blue-500/20 rounded-lg hover:bg-blue-500/30"
                              title="Edit Details"
                            >
                              <Edit className="w-4 h-4 text-blue-400" />
                            </button>
                            {/* Resend Setup Email - only for pending users */}
                            {emp.password_setup_required && !emp.is_first_user && (
                              <button
                                onClick={() => handleResendSetupEmail(emp.id)}
                                className="p-2 bg-primary/20 rounded-lg hover:bg-primary/30"
                                title="Resend Setup Email"
                              >
                                <Mail className="w-4 h-4 text-primary" />
                              </button>
                            )}
                            {/* Delete Button */}
                            {!emp.is_first_user && emp.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteEmployee(emp.id)}
                                className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30"
                                title="Remove Employee"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Add Employee Modal */}
        {showAddEmployeeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-400 rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Add New Employee</h2>
                <button onClick={() => setShowAddEmployeeModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {employeeError && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4">
                  {employeeError}
                </div>
              )}

              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Username</label>
                  <input
                    type="text"
                    value={newEmployee.username}
                    onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
                    required
                    className="w-full"
                    placeholder="employee_username"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    required
                    className="w-full"
                    placeholder="employee@company.com"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    A password setup link will be sent to this email
                  </p>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Role</label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full"
                  >
                    <option value="employee">Employee (Limited Access)</option>
                    <option value="manager">Manager (No Financials)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-400 text-sm">
                    <strong>Note:</strong> The new employee will receive an email with a link to set up their password. They have 7 days to complete the setup.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddEmployeeModal(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    <Mail className="w-4 h-4" />
                    Send Invite
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {showEditEmployeeModal && editingEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-400 rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Edit Employee</h2>
                <button onClick={() => setShowEditEmployeeModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {employeeError && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4">
                  {employeeError}
                </div>
              )}

              <form onSubmit={handleEditEmployee} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Username</label>
                  <input
                    type="text"
                    value={editingEmployee.username}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, username: e.target.value })}
                    required
                    className="w-full"
                    placeholder="employee_username"
                    disabled={editingEmployee.is_first_user}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={editingEmployee.email}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    required
                    className="w-full"
                    placeholder="employee@company.com"
                    disabled={editingEmployee.is_first_user}
                  />
                </div>
                {editingEmployee.is_first_user && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 text-sm">
                      <strong>Note:</strong> The owner account details cannot be modified from here.
                    </p>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowEditEmployeeModal(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary flex-1"
                    disabled={editingEmployee.is_first_user}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Action Modal */}
        {showUserActionModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-400 rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Manage User</h2>
                <button onClick={() => setShowUserActionModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-dark-300 rounded-xl mb-6">
                <div className="w-14 h-14 bg-dark-200 rounded-full flex items-center justify-center">
                  {selectedUser.profile_image ? (
                    <img src={selectedUser.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-primary text-xl font-bold">{selectedUser.username?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-lg">{selectedUser.username}</p>
                  <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {/* Role Badge */}
                    <span className={`badge text-xs capitalize ${
                      selectedUser.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                      selectedUser.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      selectedUser.role === 'manager' ? 'bg-blue-500/20 text-blue-400' :
                      selectedUser.role === 'employee' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {selectedUser.role || 'user'}
                    </span>
                    {/* Status Badge */}
                    {selectedUser.is_banned ? (
                      <span className="badge bg-red-700/30 text-red-300 text-xs">Banned</span>
                    ) : selectedUser.is_suspended ? (
                      <span className="badge bg-orange-500/20 text-orange-400 text-xs">Suspended</span>
                    ) : (
                      <span className="badge bg-green-500/20 text-green-400 text-xs">Active</span>
                    )}
                    {selectedUser.is_gold_member && (
                      <span className="badge bg-primary/20 text-primary text-xs">Gold Member</span>
                    )}
                  </div>
                </div>
              </div>

              {userActionError && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {userActionError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Suspend / Unsuspend Option */}
                {!selectedUser.is_banned && (
                  <button
                    onClick={handleSuspendFromModal}
                    disabled={actionLoading === selectedUser.id}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                      selectedUser.is_suspended 
                        ? 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20' 
                        : 'border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedUser.is_suspended ? 'bg-green-500/20' : 'bg-orange-500/20'
                    }`}>
                      {selectedUser.is_suspended ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <Clock className="w-6 h-6 text-orange-400" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-bold ${selectedUser.is_suspended ? 'text-green-400' : 'text-orange-400'}`}>
                        {selectedUser.is_suspended ? 'Unsuspend User' : 'Suspend User'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {selectedUser.is_suspended 
                          ? 'Restore user access to their account' 
                          : 'Temporarily disable user access (can be reversed)'}
                      </p>
                    </div>
                  </button>
                )}

                {/* Ban Forever Option */}
                {!selectedUser.is_banned ? (
                  <div className="border-2 border-red-600/30 bg-red-900/10 rounded-xl p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center">
                        <Ban className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-red-500">Ban Forever</p>
                        <p className="text-gray-400 text-sm">Permanently ban this user and remove all their listings</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-400 text-sm mb-1">Reason for ban (optional)</label>
                      <input
                        type="text"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="e.g., Violation of terms of service"
                        className="w-full bg-dark-300 border border-dark-200 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <button
                      onClick={handleBanUser}
                      disabled={actionLoading === selectedUser.id}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedUser.id ? 'Processing...' : 'Ban User Forever'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleUnbanUser}
                    disabled={actionLoading === selectedUser.id}
                    className="w-full p-4 rounded-xl border-2 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 flex items-center gap-4 transition-all"
                  >
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-green-400">Remove Ban</p>
                      <p className="text-gray-400 text-sm">Restore this user&apos;s account access</p>
                    </div>
                  </button>
                )}

                {/* Role Management Section */}
                <div className="border-2 border-purple-500/30 bg-purple-500/10 rounded-xl p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Shield className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-purple-400">Change Role</p>
                      <p className="text-gray-400 text-sm">
                        Current: <span className="text-purple-300 font-semibold capitalize">{selectedUser.role || 'user'}</span>
                        {PROTECTED_EMAILS.includes(selectedUser.email) && (
                          <span className="ml-2 text-yellow-400">(Protected Owner)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="flex-1 bg-dark-300 border border-dark-200 rounded-lg px-3 py-2 text-white"
                      disabled={PROTECTED_EMAILS.includes(selectedUser.email) && currentUserRole !== 'owner'}
                    >
                      {ROLE_OPTIONS.map(role => (
                        <option key={role} value={role} className="capitalize">
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleRoleChange}
                      disabled={actionLoading === selectedUser.id || selectedRole === (selectedUser.role || 'user')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedUser.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Owner:</strong> Full access, can manage all roles</p>
                    <p><strong>Admin:</strong> Can manage admin and below</p>
                    <p><strong>Manager:</strong> Can manage employees and users</p>
                    <p><strong>Employee:</strong> Limited admin access</p>
                    <p><strong>User:</strong> Standard user account</p>
                  </div>
                </div>

                {/* Delete User Option */}
                <div className="border-2 border-red-900/50 bg-red-950/20 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-red-400">Delete User</p>
                      <p className="text-gray-500 text-sm">Permanently delete user and ALL their data</p>
                    </div>
                    <button
                      onClick={handleDeleteUser}
                      disabled={actionLoading === selectedUser.id}
                      className="px-4 py-2 bg-red-900 hover:bg-red-800 text-red-300 font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                      data-testid="delete-user-btn"
                    >
                      {actionLoading === selectedUser.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <div className="mt-3 p-2 bg-red-950/50 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400/80 text-xs">
                      This action is <strong>permanent</strong> and cannot be undone. All listings, messages, orders, and reviews will be deleted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => setShowUserActionModal(false)}
                className="w-full mt-4 py-3 bg-dark-300 hover:bg-dark-200 text-gray-400 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reset Analytics Modal */}
        {showResetModal && canResetAnalytics && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-400 rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Reset Analytics Data</h2>
                    <p className="text-gray-500 text-sm">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetError('');
                    setResetConfirmation('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {resetError && (
                <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                  {resetError}
                </div>
              )}

              <div className="space-y-3 mb-6">
                <p className="text-gray-400 text-sm mb-4">Select the data you want to reset:</p>
                
                <label className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-200">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_orders}
                    onChange={(e) => setResetOptions({ ...resetOptions, reset_orders: e.target.checked, reset_all: false })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-white font-medium">Orders</p>
                    <p className="text-gray-500 text-xs">Delete all order records</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-200">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_analytics_events}
                    onChange={(e) => setResetOptions({ ...resetOptions, reset_analytics_events: e.target.checked, reset_all: false })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-white font-medium">Analytics Events</p>
                    <p className="text-gray-500 text-xs">Delete raw analytics event data</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-200">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_analytics_rollups}
                    onChange={(e) => setResetOptions({ ...resetOptions, reset_analytics_rollups: e.target.checked, reset_all: false })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-white font-medium">Analytics Rollups</p>
                    <p className="text-gray-500 text-xs">Delete aggregated analytics (Overview stats)</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-200">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_support_tickets}
                    onChange={(e) => setResetOptions({ ...resetOptions, reset_support_tickets: e.target.checked, reset_all: false })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-white font-medium">Support Tickets</p>
                    <p className="text-gray-500 text-xs">Delete all support ticket records</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg cursor-pointer hover:bg-red-900/30">
                  <input
                    type="checkbox"
                    checked={resetOptions.reset_all}
                    onChange={(e) => setResetOptions({
                      reset_orders: e.target.checked,
                      reset_analytics_events: e.target.checked,
                      reset_analytics_rollups: e.target.checked,
                      reset_support_tickets: e.target.checked,
                      reset_all: e.target.checked
                    })}
                    className="w-4 h-4 rounded border-gray-600"
                  />
                  <div>
                    <p className="text-red-400 font-medium">Reset All</p>
                    <p className="text-gray-500 text-xs">Delete ALL analytics and order data</p>
                  </div>
                </label>
              </div>

              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2">
                  Type <span className="text-red-400 font-mono">CONFIRM_RESET</span> to proceed:
                </label>
                <input
                  type="text"
                  value={resetConfirmation}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  placeholder="CONFIRM_RESET"
                  className="w-full bg-dark-300 border border-dark-200 rounded-lg px-4 py-3 text-white font-mono"
                  data-testid="reset-confirmation-input"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetError('');
                    setResetConfirmation('');
                  }}
                  className="flex-1 py-3 bg-dark-300 hover:bg-dark-200 text-gray-400 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAnalytics}
                  disabled={resetLoading || resetConfirmation !== 'CONFIRM_RESET'}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="confirm-reset-btn"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Data'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
