/**
 * AddEmployeeModal Component
 * 
 * Modal for inviting new employees to the admin panel.
 * Creates an employee account and sends a setup email.
 */

import React from 'react';
import { X, Mail } from 'lucide-react';

function AddEmployeeModal({
  isOpen,
  onClose,
  newEmployee,
  setNewEmployee,
  onSubmit,
  error
}) {
  if (!isOpen) {
    return null;
  }

  const handleInputChange = (field, value) => {
    setNewEmployee({ ...newEmployee, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-400 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Add New Employee</h2>
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
              value={newEmployee.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              required
              className="w-full"
              placeholder="employee_username"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Email
            </label>
            <input
              type="email"
              value={newEmployee.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              className="w-full"
              placeholder="employee@company.com"
            />
            <p className="text-gray-500 text-xs mt-1">
              A password setup link will be sent to this email
            </p>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Role
            </label>
            <select
              value={newEmployee.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full"
            >
              <option value="employee">Employee (Limited Access)</option>
              <option value="manager">Manager (No Financials)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>

          {/* Info Note */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              <strong>Note:</strong> The new employee will receive an email with a 
              link to set up their password. They have 7 days to complete the setup.
            </p>
          </div>

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
            >
              <Mail className="w-4 h-4" />
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEmployeeModal;
