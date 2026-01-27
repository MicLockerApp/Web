/**
 * EditEmployeeModal Component
 * 
 * Modal for editing existing employee details (username, email).
 * Note: Role changes are handled separately via dropdown in the table.
 */

import React from 'react';
import { X } from 'lucide-react';

function EditEmployeeModal({
  isOpen,
  onClose,
  employee,
  setEmployee,
  onSubmit,
  error
}) {
  if (!isOpen || !employee) {
    return null;
  }

  const handleInputChange = (field, value) => {
    setEmployee({ ...employee, [field]: value });
  };

  const isOwnerAccount = employee.is_first_user;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-400 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Employee</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Username
            </label>
            <input
              type="text"
              value={employee.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              required
              className="w-full"
              placeholder="employee_username"
              disabled={isOwnerAccount}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Email
            </label>
            <input
              type="email"
              value={employee.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              className="w-full"
              placeholder="employee@company.com"
              disabled={isOwnerAccount}
            />
          </div>

          {/* Owner Warning */}
          {isOwnerAccount && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                <strong>Note:</strong> The owner account details cannot be 
                modified from here.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary flex-1"
              disabled={isOwnerAccount}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditEmployeeModal;
