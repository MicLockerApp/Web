/**
 * UsersTab Component
 * 
 * Displays the users management section with:
 * - User search functionality
 * - Users table with profile info, category, rating, status
 * - Pagination
 * - User action button to open management modal
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, UserX, ChevronLeft, ChevronRight } from 'lucide-react';

function UsersTab({
  users,
  userSearch,
  setUserSearch,
  pagination,
  onSearch,
  onOpenUserActionModal
}) {
  return (
    <div>
      {/* Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Search by username or email..."
            className="pl-10"
            data-testid="user-search-input"
          />
        </div>
        <button 
          onClick={onSearch} 
          className="btn btn-primary"
          data-testid="user-search-btn"
        >
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
                <UserRow 
                  key={u.id} 
                  user={u} 
                  onOpenActionModal={onOpenUserActionModal}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Pagination
            current={pagination.page}
            total={pagination.pages}
            count={users.length}
            totalItems={pagination.total}
            onPrev={() => onSearch(pagination.page - 1)}
            onNext={() => onSearch(pagination.page + 1)}
            itemLabel="users"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Single user row in the table
 */
function UserRow({ user, onOpenActionModal }) {
  return (
    <tr className="border-t border-dark-300 hover:bg-dark-300/50">
      <td className="px-6 py-4">
        <Link to={`/profile/${user.id}`} className="flex items-center gap-3 hover:text-primary">
          <div className="w-10 h-10 bg-dark-200 rounded-full flex items-center justify-center">
            {user.profile_image ? (
              <img 
                src={user.profile_image} 
                alt="" 
                className="w-full h-full rounded-full object-cover" 
              />
            ) : (
              <span className="text-primary font-bold">
                {user.username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-white font-medium">{user.username}</p>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </Link>
      </td>
      <td className="px-6 py-4 text-gray-400 capitalize">
        {user.category?.replace('_', ' ') || '-'}
      </td>
      <td className="px-6 py-4 text-gray-400">
        {user.rating?.toFixed(1) || '0.0'} ({user.review_count || 0})
      </td>
      <td className="px-6 py-4 text-gray-400">{user.total_sales || 0}</td>
      <td className="px-6 py-4">
        <UserStatusBadge user={user} />
      </td>
      <td className="px-6 py-4 text-gray-400">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <Link 
            to={`/profile/${user.id}`} 
            className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100" 
            title="View Profile"
          >
            <Eye className="w-4 h-4 text-gray-400" />
          </Link>
          {!user.is_admin && !user.is_employee && (
            <button
              onClick={() => onOpenActionModal(user)}
              className="p-2 bg-dark-200 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400"
              title="Manage User"
              data-testid={`manage-user-${user.id}`}
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * User status badge component
 */
function UserStatusBadge({ user }) {
  if (user.is_admin) {
    return <span className="badge bg-primary/20 text-primary">Admin</span>;
  }
  if (user.is_banned) {
    return <span className="badge bg-red-700/30 text-red-300">Banned</span>;
  }
  if (user.is_suspended) {
    return <span className="badge bg-orange-500/20 text-orange-400">Suspended</span>;
  }
  if (user.has_lifetime_free_fees) {
    return <span className="badge bg-green-500/20 text-green-400">VIP</span>;
  }
  return <span className="badge bg-gray-500/20 text-gray-400">Active</span>;
}

/**
 * Reusable pagination component
 */
function Pagination({ current, total, count, totalItems, onPrev, onNext, itemLabel }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-dark-300">
      <p className="text-gray-400 text-sm">
        Showing {count} of {totalItems} {itemLabel}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={current <= 1}
          className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-4 py-2 text-gray-400">
          Page {current} of {total}
        </span>
        <button
          onClick={onNext}
          disabled={current >= total}
          className="p-2 bg-dark-300 rounded-lg disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default UsersTab;
