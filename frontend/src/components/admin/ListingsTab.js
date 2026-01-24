/**
 * ListingsTab Component
 * 
 * Displays the listings management section with:
 * - Status filter buttons
 * - Listings table with thumbnail, seller, price, category, status
 * - Remove listing functionality
 * - Pagination
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStatusBadgeClasses } from './utils';

const STATUS_FILTERS = ['', 'active', 'sold', 'removed'];
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100';

function ListingsTab({
  listings,
  listingStatus,
  setListingStatus,
  pagination,
  actionLoading,
  onFetchListings,
  onRemoveListing
}) {
  const handleStatusChange = (status) => {
    setListingStatus(status);
    setTimeout(() => onFetchListings(), 100);
  };

  return (
    <div>
      {/* Status Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            className={`px-3 py-1 rounded-full text-sm ${
              listingStatus === status 
                ? 'bg-primary text-black' 
                : 'bg-dark-400 text-gray-400 hover:text-white'
            }`}
            data-testid={`filter-${status || 'all'}`}
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
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  actionLoading={actionLoading}
                  onRemove={onRemoveListing}
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
            count={listings.length}
            totalItems={pagination.total}
            onPrev={() => onFetchListings(pagination.page - 1)}
            onNext={() => onFetchListings(pagination.page + 1)}
            itemLabel="listings"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Single listing row in the table
 */
function ListingRow({ listing, actionLoading, onRemove }) {
  const imageUrl = listing.media?.[0]?.url || DEFAULT_IMAGE;

  return (
    <tr className="border-t border-dark-300 hover:bg-dark-300/50">
      <td className="px-6 py-4">
        <Link 
          to={`/listing/${listing.id}`} 
          className="flex items-center gap-3 hover:text-primary"
        >
          <img
            src={imageUrl}
            alt=""
            className="w-12 h-12 object-cover rounded-lg"
          />
          <span className="text-white font-medium truncate max-w-xs">
            {listing.title}
          </span>
        </Link>
      </td>
      <td className="px-6 py-4">
        <Link 
          to={`/profile/${listing.seller_id}`} 
          className="text-gray-400 hover:text-primary"
        >
          {listing.seller_username}
        </Link>
      </td>
      <td className="px-6 py-4 text-primary font-medium">
        ${listing.price?.toLocaleString()}
      </td>
      <td className="px-6 py-4 text-gray-400">{listing.category}</td>
      <td className="px-6 py-4">
        <span className={`badge ${getStatusBadgeClasses(listing.status)}`}>
          {listing.status}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-400">{listing.view_count || 0}</td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <Link 
            to={`/listing/${listing.id}`} 
            className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100" 
            title="View"
          >
            <Eye className="w-4 h-4 text-gray-400" />
          </Link>
          {listing.status !== 'removed' && (
            <button
              onClick={() => onRemove(listing.id)}
              disabled={actionLoading === listing.id}
              className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30"
              title="Remove"
              data-testid={`remove-listing-${listing.id}`}
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
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

export default ListingsTab;
