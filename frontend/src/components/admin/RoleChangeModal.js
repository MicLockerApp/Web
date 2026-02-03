/**
 * RoleChangeModal Component
 * 
 * A dedicated modal for changing user roles.
 * Displays the user info and provides a dropdown to select a new role.
 */

import React from 'react';
import { X, Shield } from 'lucide-react';
import { PROTECTED_EMAILS, ROLE_OPTIONS } from './utils';

function RoleChangeModal({
  selectedUser,
  currentUserRole,
  actionLoading,
  userActionError,
  selectedRole,
  setSelectedRole,
  onRoleChange,
  onClose
}) {
  if (!selectedUser) {
    return null;
  }

  const isProtectedUser = PROTECTED_EMAILS.includes(selectedUser.email);
  const isRoleUnchanged = selectedRole === (selectedUser.role || 'user');
  const isDisabled = isProtectedUser && currentUserRole !== 'owner';

  /**
   * Returns role badge styling based on role value.
   */
  const getRoleBadgeClass = (role) => {
    const styles = {
      owner: 'bg-yellow-500/20 text-yellow-400',
      admin: 'bg-purple-500/20 text-purple-400',
      manager: 'bg-blue-500/20 text-blue-400',
      employee: 'bg-cyan-500/20 text-cyan-400',
    };
    return styles[role] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-400 rounded-xl max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Change User Role</h2>
          </div>
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
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge text-xs capitalize ${getRoleBadgeClass(selectedUser.role)}`}>
                Current: {selectedUser.role || 'user'}
              </span>
              {isProtectedUser && (
                <span className="badge bg-yellow-500/20 text-yellow-400 text-xs">Protected Owner</span>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {userActionError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 flex items-center gap-2">
            <span className="text-sm">{userActionError}</span>
          </div>
        )}

        {/* Role Selection */}
        <div className="border-2 border-purple-500/30 bg-purple-500/10 rounded-xl p-4 mb-4">
          <label className="block text-purple-400 font-medium mb-3">
            Select New Role
          </label>
          
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full bg-dark-300 border border-dark-200 rounded-lg px-4 py-3 text-white mb-4"
            disabled={isDisabled}
            data-testid="role-select"
          >
            {ROLE_OPTIONS.map(role => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
          
          {/* Role Descriptions */}
          <div className="text-xs text-gray-500 space-y-1 bg-dark-300/50 p-3 rounded-lg">
            <p><span className="text-yellow-400 font-semibold">Owner:</span> Full access, can manage all roles including other owners</p>
            <p><span className="text-purple-400 font-semibold">Admin:</span> Can manage admin and below, access to admin panel</p>
            <p><span className="text-blue-400 font-semibold">Manager:</span> Can manage employees and users</p>
            <p><span className="text-cyan-400 font-semibold">Employee:</span> Limited admin access</p>
            <p><span className="text-gray-400 font-semibold">User:</span> Standard user account, no admin access</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-dark-300 hover:bg-dark-200 text-gray-400 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRoleChange}
            disabled={actionLoading || isRoleUnchanged || isDisabled}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-role-btn"
          >
            {actionLoading ? 'Saving...' : 'Save Role'}
          </button>
        </div>

        {isDisabled && (
          <p className="text-yellow-400 text-xs mt-3 text-center">
            Only owners can change the role of protected users.
          </p>
        )}
      </div>
    </div>
  );
}

export default RoleChangeModal;
