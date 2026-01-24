/**
 * Admin Panel - Shared Utility Functions
 * 
 * Helper functions used across admin components for consistent
 * styling and display logic.
 */

/**
 * Returns the appropriate Tailwind CSS classes for a status badge.
 * 
 * @param {string} status - The status value (e.g., 'active', 'sold', 'pending')
 * @returns {string} Tailwind CSS class string for the badge
 */
export function getStatusBadgeClasses(status) {
  const statusStyles = {
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
  
  return statusStyles[status] || 'bg-gray-500/20 text-gray-400';
}

/**
 * Returns the appropriate Tailwind CSS classes for an employee role badge.
 * 
 * @param {string} role - The role value (e.g., 'admin', 'manager', 'employee')
 * @returns {string} Tailwind CSS class string for the badge
 */
export function getRoleBadgeClasses(role) {
  const roleStyles = {
    admin: 'bg-red-500/20 text-red-400',
    manager: 'bg-blue-500/20 text-blue-400',
    employee: 'bg-green-500/20 text-green-400',
  };
  
  return roleStyles[role] || 'bg-gray-500/20 text-gray-400';
}

/**
 * Protected email addresses that cannot have certain admin actions performed on them.
 */
export const PROTECTED_EMAILS = [
  'james.mcdougall@miclockerapp.com',
  'info@miclockerapp.com'
];

/**
 * Available role options for user role management.
 */
export const ROLE_OPTIONS = ['owner', 'admin', 'manager', 'employee', 'user'];
