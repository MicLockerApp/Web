/**
 * UserActionModal Component
 * 
 * Modal for managing user accounts including:
 * - Suspending/unsuspending users
 * - Banning/unbanning users
 * - Changing user roles
 * - Deleting users
 * 
 * This modal handles all user moderation actions from the admin panel.
 */

import React from 'react';
import {
  X, AlertCircle, CheckCircle, Clock, Ban, Trash2, AlertTriangle
} from 'lucide-react';
import { PROTECTED_EMAILS } from './utils';

function UserActionModal({
  selectedUser,
  actionLoading,
  userActionError,
  banReason,
  setBanReason,
  onSuspend,
  onBan,
  onUnban,
  onDelete,
  onClose
}) {
  if (!selectedUser) {
    return null;
  }

  const isProtectedUser = PROTECTED_EMAILS.includes(selectedUser.email);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-400 rounded-xl max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Manage User</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Info Card */}
        <div className="flex items-center gap-4 p-4 bg-dark-300 rounded-xl mb-6">
          <div className="w-14 h-14 bg-dark-200 rounded-full flex items-center justify-center">
            {selectedUser.profile_image ? (
              <img 
                src={selectedUser.profile_image} 
                alt={`${selectedUser.username}'s avatar`} 
                className="w-full h-full rounded-full object-cover" 
              />
            ) : (
              <span className="text-primary text-xl font-bold">
                {selectedUser.username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">{selectedUser.username}</p>
            <p className="text-gray-400 text-sm">{selectedUser.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Role Badge */}
              <span className={`badge text-xs capitalize ${getRoleBadgeClass(selectedUser.role)}`}>
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

        {/* Error Display */}
        {userActionError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {userActionError}
          </div>
        )}

        {/* Action Sections */}
        <div className="space-y-3">
          {/* Suspend / Unsuspend */}
          {!selectedUser.is_banned && (
            <SuspendAction
              user={selectedUser}
              isLoading={actionLoading === selectedUser.id}
              onAction={onSuspend}
            />
          )}

          {/* Ban / Unban */}
          {!selectedUser.is_banned ? (
            <BanAction
              user={selectedUser}
              isLoading={actionLoading === selectedUser.id}
              banReason={banReason}
              setBanReason={setBanReason}
              onBan={onBan}
            />
          ) : (
            <UnbanAction
              user={selectedUser}
              isLoading={actionLoading === selectedUser.id}
              onUnban={onUnban}
            />
          )}

          {/* Delete User */}
          <DeleteUserAction
            user={selectedUser}
            isLoading={actionLoading === selectedUser.id}
            onDelete={onDelete}
          />
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-dark-300 hover:bg-dark-200 text-gray-400 font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Returns role badge styling based on role value.
 */
function getRoleBadgeClass(role) {
  const styles = {
    owner: 'bg-yellow-500/20 text-yellow-400',
    admin: 'bg-purple-500/20 text-purple-400',
    manager: 'bg-blue-500/20 text-blue-400',
    employee: 'bg-cyan-500/20 text-cyan-400',
  };
  return styles[role] || 'bg-gray-500/20 text-gray-400';
}

/**
 * Suspend/Unsuspend action section
 */
function SuspendAction({ user, isLoading, onAction }) {
  const isSuspended = user.is_suspended && !user.is_banned;
  
  return (
    <button
      onClick={onAction}
      disabled={isLoading}
      className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
        isSuspended 
          ? 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20' 
          : 'border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20'
      }`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        isSuspended ? 'bg-green-500/20' : 'bg-orange-500/20'
      }`}>
        {isSuspended ? (
          <CheckCircle className="w-6 h-6 text-green-400" />
        ) : (
          <Clock className="w-6 h-6 text-orange-400" />
        )}
      </div>
      <div className="text-left flex-1">
        <p className={`font-bold ${isSuspended ? 'text-green-400' : 'text-orange-400'}`}>
          {isSuspended ? 'Unsuspend User' : 'Suspend User'}
        </p>
        <p className="text-gray-400 text-sm">
          {isSuspended 
            ? 'Restore user access to their account' 
            : 'Temporarily disable user access (can be reversed)'}
        </p>
      </div>
    </button>
  );
}

/**
 * Ban action section with reason input
 */
function BanAction({ user, isLoading, banReason, setBanReason, onBan }) {
  return (
    <div className="border-2 border-red-600/30 bg-red-900/10 rounded-xl p-4">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center">
          <Ban className="w-6 h-6 text-red-500" />
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-red-500">Ban Forever</p>
          <p className="text-gray-400 text-sm">
            Permanently ban this user and remove all their listings
          </p>
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-gray-400 text-sm mb-1">
          Reason for ban (optional)
        </label>
        <input
          type="text"
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          placeholder="e.g., Violation of terms of service"
          className="w-full bg-dark-300 border border-dark-200 rounded-lg px-3 py-2 text-white text-sm"
        />
      </div>
      <button
        onClick={onBan}
        disabled={isLoading}
        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : 'Ban User Forever'}
      </button>
    </div>
  );
}

/**
 * Unban action button
 */
function UnbanAction({ user, isLoading, onUnban }) {
  return (
    <button
      onClick={onUnban}
      disabled={isLoading}
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
  );
}

/**
 * Role change section with dropdown
 */
function RoleChangeAction({ 
  user, 
  currentUserRole, 
  isProtected, 
  isLoading, 
  selectedRole, 
  setSelectedRole, 
  onRoleChange 
}) {
  const isRoleUnchanged = selectedRole === (user.role || 'user');
  const isDisabled = isProtected && currentUserRole !== 'owner';

  return (
    <div className="border-2 border-purple-500/30 bg-purple-500/10 rounded-xl p-4">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-purple-400" />
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-purple-400">Change Role</p>
          <p className="text-gray-400 text-sm">
            Current: <span className="text-purple-300 font-semibold capitalize">
              {user.role || 'user'}
            </span>
            {isProtected && (
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
          disabled={isDisabled}
        >
          {ROLE_OPTIONS.map(role => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
        <button
          onClick={onRoleChange}
          disabled={isLoading || isRoleUnchanged}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save'}
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
  );
}

/**
 * Delete user section with warning
 */
function DeleteUserAction({ user, isLoading, onDelete }) {
  return (
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
          onClick={onDelete}
          disabled={isLoading}
          className="px-4 py-2 bg-red-900 hover:bg-red-800 text-red-300 font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
          data-testid="delete-user-btn"
        >
          {isLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
      <div className="mt-3 p-2 bg-red-950/50 rounded-lg flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-red-400/80 text-xs">
          This action is <strong>permanent</strong> and cannot be undone. 
          All listings, messages, orders, and reviews will be deleted.
        </p>
      </div>
    </div>
  );
}

export default UserActionModal;
