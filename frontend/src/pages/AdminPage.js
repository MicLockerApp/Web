/**
 * AdminPage Component
 * 
 * Main admin dashboard page that orchestrates all admin functionality:
 * - Overview analytics (owner/manager only)
 * - User management
 * - Listing management
 * - Order management
 * - Employee/team management (owner/manager only)
 * 
 * Refactored to use separate tab and modal components for better maintainability.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDateRange } from '../context/DateRangeContext';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  AlertCircle, RefreshCw, TrendingUp, BarChart3, Users, Package, 
  ShoppingCart, Briefcase
} from 'lucide-react';

// Admin components
import {
  OverviewTab,
  UsersTab,
  ListingsTab,
  OrdersTab,
  EmployeesTab,
  UserActionModal,
  AddEmployeeModal,
  EditEmployeeModal,
  ResetAnalyticsModal,
  RoleChangeModal,
  getRoleBadgeClasses,
  PROTECTED_EMAILS,
  ROLE_OPTIONS
} from '../components/admin';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { 
    startDate, endDate, setStartDate, setEndDate, 
    formatDateRange, setLast7Days, setLast30Days, setLast90Days 
  } = useDateRange();

  // Core state
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(null);

  // Users tab state
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [userSearch, setUserSearch] = useState('');

  // Listings tab state
  const [listings, setListings] = useState([]);
  const [listingsPagination, setListingsPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [listingStatus, setListingStatus] = useState('');

  // Orders tab state
  const [orders, setOrders] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [orderStatus, setOrderStatus] = useState('');

  // Employees tab state
  const [employees, setEmployees] = useState([]);
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

  // Role change modal state (separate from user action modal)
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [roleChangeSelectedRole, setRoleChangeSelectedRole] = useState('');
  const [roleChangeError, setRoleChangeError] = useState('');

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

  // Permission calculations
  const currentUserRole = user?.role || (user?.is_admin ? 'admin' : 'user');
  const userRole = analytics?.user_role || currentUserRole;
  const isOwner = userRole === 'owner' || (user?.is_admin && !user?.employee_role);
  const isAdminOrOwner = currentUserRole === 'owner' || currentUserRole === 'admin' || user?.is_admin;
  const canSeeFinancials = isOwner;
  const canSeeAllStats = isOwner || userRole === 'manager';
  const canManageEmployees = isOwner || userRole === 'manager';
  const canResetAnalytics = isAdminOrOwner;
  const isEmployee = userRole === 'employee';

  // Auth check effect
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || (!user?.is_admin && !user?.is_employee)) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, user, navigate, authLoading]);

  // Tab change effect - fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'listings') fetchListings();
    else if (activeTab === 'orders') fetchOrders();
    else if (activeTab === 'employees' && canManageEmployees) fetchEmployees();
  }, [activeTab]);

  // Data fetching functions
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

  // User action handlers
  const openUserActionModal = (userToManage) => {
    setSelectedUser(userToManage);
    setBanReason('');
    setUserActionError('');
    setSelectedRole(userToManage.role || 'user');
    setShowUserActionModal(true);
  };

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
      setUserActionError(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  // Listing handlers
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

  // Employee handlers
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

  // Reset analytics handler
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
      fetchData();
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

  // Helper function to get role badge classes
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

    if (canSeeAllStats) {
      baseTabs.unshift({ id: 'overview', label: 'Overview', icon: BarChart3 });
    }

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
        {/* Header */}
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
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          
          {/* Quick Links */}
          <div className="flex gap-2 ml-auto">
            <Link
              to="/admin/reports"
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500"
              data-testid="reports-link"
            >
              <AlertCircle className="w-4 h-4" />
              Flagged Listings
            </Link>
            
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

        {/* Tab Content */}
        {activeTab === 'overview' && canSeeAllStats && (
          <OverviewTab
            analytics={analytics}
            canSeeFinancials={canSeeFinancials}
            canResetAnalytics={canResetAnalytics}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            formatDateRange={formatDateRange}
            setLast7Days={setLast7Days}
            setLast30Days={setLast30Days}
            setLast90Days={setLast90Days}
            onShowResetModal={() => setShowResetModal(true)}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            users={users}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            pagination={usersPagination}
            onSearch={fetchUsers}
            onOpenUserActionModal={openUserActionModal}
          />
        )}

        {activeTab === 'listings' && (
          <ListingsTab
            listings={listings}
            listingStatus={listingStatus}
            setListingStatus={setListingStatus}
            pagination={listingsPagination}
            actionLoading={actionLoading}
            onFetchListings={fetchListings}
            onRemoveListing={handleRemoveListing}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            orderStatus={orderStatus}
            setOrderStatus={setOrderStatus}
            pagination={ordersPagination}
            canSeeFinancials={canSeeFinancials}
            onFetchOrders={fetchOrders}
          />
        )}

        {activeTab === 'employees' && canManageEmployees && (
          <EmployeesTab
            employees={employees}
            currentUser={user}
            onShowAddModal={() => setShowAddEmployeeModal(true)}
            onOpenEditModal={openEditModal}
            onResendSetupEmail={handleResendSetupEmail}
            onUpdateRole={handleUpdateEmployeeRole}
            onDelete={handleDeleteEmployee}
          />
        )}

        {/* Modals */}
        {showUserActionModal && selectedUser && (
          <UserActionModal
            selectedUser={selectedUser}
            currentUserRole={currentUserRole}
            actionLoading={actionLoading}
            userActionError={userActionError}
            banReason={banReason}
            setBanReason={setBanReason}
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
            onSuspend={handleSuspendFromModal}
            onBan={handleBanUser}
            onUnban={handleUnbanUser}
            onRoleChange={handleRoleChange}
            onDelete={handleDeleteUser}
            onClose={() => setShowUserActionModal(false)}
          />
        )}

        {showAddEmployeeModal && (
          <AddEmployeeModal
            isOpen={showAddEmployeeModal}
            newEmployee={newEmployee}
            setNewEmployee={setNewEmployee}
            error={employeeError}
            onSubmit={handleAddEmployee}
            onClose={() => setShowAddEmployeeModal(false)}
          />
        )}

        {showEditEmployeeModal && editingEmployee && (
          <EditEmployeeModal
            isOpen={showEditEmployeeModal}
            employee={editingEmployee}
            setEmployee={setEditingEmployee}
            error={employeeError}
            onSubmit={handleEditEmployee}
            onClose={() => setShowEditEmployeeModal(false)}
          />
        )}

        {showResetModal && canResetAnalytics && (
          <ResetAnalyticsModal
            isOpen={showResetModal}
            resetOptions={resetOptions}
            setResetOptions={setResetOptions}
            resetConfirmation={resetConfirmation}
            setResetConfirmation={setResetConfirmation}
            isLoading={resetLoading}
            error={resetError}
            onReset={handleResetAnalytics}
            onClose={() => {
              setShowResetModal(false);
              setResetError('');
              setResetConfirmation('');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPage;
