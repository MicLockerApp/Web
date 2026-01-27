/**
 * EmployeesTab Component
 * 
 * Displays the team management section with:
 * - Add employee button
 * - Role descriptions (Admin, Manager, Employee)
 * - Employees table with role dropdown, status, actions
 */

import React from 'react';
import { UserPlus, Shield, Briefcase, Users, Edit, Mail, Trash2 } from 'lucide-react';
import { getRoleBadgeClasses } from './utils';

function EmployeesTab({
  employees,
  currentUser,
  onShowAddModal,
  onOpenEditModal,
  onResendSetupEmail,
  onUpdateRole,
  onDelete
}) {
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Team Management</h2>
        <button
          onClick={onShowAddModal}
          className="btn btn-primary"
          data-testid="add-employee-btn"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Role Descriptions */}
      <RoleDescriptions />

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
                <EmployeeRow
                  key={emp.id}
                  employee={emp}
                  currentUser={currentUser}
                  onOpenEditModal={onOpenEditModal}
                  onResendSetupEmail={onResendSetupEmail}
                  onUpdateRole={onUpdateRole}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Role descriptions cards
 */
function RoleDescriptions() {
  const roles = [
    {
      icon: Shield,
      name: 'Admin',
      color: 'red',
      description: 'Full access to all features including financials, analytics, and team management.'
    },
    {
      icon: Briefcase,
      name: 'Manager',
      color: 'blue',
      description: 'Access to all features except financial data (GMV, fees, revenue).'
    },
    {
      icon: Users,
      name: 'Employee',
      color: 'green',
      description: 'Access to Users, Listings, Orders, and Support Tickets only.'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {roles.map(({ icon: Icon, name, color, description }) => (
        <div 
          key={name}
          className={`bg-dark-400 rounded-xl p-4 border border-${color}-500/30`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-5 h-5 text-${color}-400`} />
            <span className={`font-semibold text-${color}-400`}>{name}</span>
          </div>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Single employee row in the table
 */
function EmployeeRow({ 
  employee, 
  currentUser, 
  onOpenEditModal, 
  onResendSetupEmail, 
  onUpdateRole, 
  onDelete 
}) {
  return (
    <tr className="border-t border-dark-300 hover:bg-dark-300/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
            <span className="text-primary font-bold">
              {employee.username?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white font-medium">{employee.username}</p>
            <p className="text-gray-500 text-sm">{employee.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {employee.is_first_user ? (
          <span className="badge bg-purple-500/20 text-purple-400">Owner</span>
        ) : (
          <select
            value={employee.employee_role || 'admin'}
            onChange={(e) => onUpdateRole(employee.id, e.target.value)}
            className="bg-dark-300 text-white rounded-lg px-3 py-1 text-sm border-none"
            disabled={employee.is_first_user}
            data-testid={`role-select-${employee.id}`}
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        )}
      </td>
      <td className="px-6 py-4">
        {employee.password_setup_required ? (
          <span className="badge bg-yellow-500/20 text-yellow-400">Pending Setup</span>
        ) : (
          <span className="badge bg-green-500/20 text-green-400">Active</span>
        )}
      </td>
      <td className="px-6 py-4 text-gray-400">
        {new Date(employee.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          {/* Edit Button */}
          <button
            onClick={() => onOpenEditModal(employee)}
            className="p-2 bg-blue-500/20 rounded-lg hover:bg-blue-500/30"
            title="Edit Details"
            data-testid={`edit-employee-${employee.id}`}
          >
            <Edit className="w-4 h-4 text-blue-400" />
          </button>
          
          {/* Resend Setup Email - only for pending users */}
          {employee.password_setup_required && !employee.is_first_user && (
            <button
              onClick={() => onResendSetupEmail(employee.id)}
              className="p-2 bg-primary/20 rounded-lg hover:bg-primary/30"
              title="Resend Setup Email"
              data-testid={`resend-email-${employee.id}`}
            >
              <Mail className="w-4 h-4 text-primary" />
            </button>
          )}
          
          {/* Delete Button */}
          {!employee.is_first_user && employee.id !== currentUser?.id && (
            <button
              onClick={() => onDelete(employee.id)}
              className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30"
              title="Remove Employee"
              data-testid={`delete-employee-${employee.id}`}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default EmployeesTab;
