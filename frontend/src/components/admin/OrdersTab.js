/**
 * OrdersTab Component
 * 
 * Displays the orders management section with:
 * - Status filter buttons
 * - Orders table with order number, buyer, total, fees (owner only), status
 * - Pagination
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStatusBadgeClasses } from './utils';

const STATUS_FILTERS = ['', 'paid', 'shipped', 'delivered', 'completed', 'cancelled'];

function OrdersTab({
  orders,
  orderStatus,
  setOrderStatus,
  pagination,
  canSeeFinancials,
  onFetchOrders
}) {
  const handleStatusChange = (status) => {
    setOrderStatus(status);
    setTimeout(() => onFetchOrders(), 100);
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
              orderStatus === status 
                ? 'bg-primary text-black' 
                : 'bg-dark-400 text-gray-400 hover:text-white'
            }`}
            data-testid={`order-filter-${status || 'all'}`}
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
                <OrderRow
                  key={order.id}
                  order={order}
                  canSeeFinancials={canSeeFinancials}
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
            count={orders.length}
            totalItems={pagination.total}
            onPrev={() => onFetchOrders(pagination.page - 1)}
            onNext={() => onFetchOrders(pagination.page + 1)}
            itemLabel="orders"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Single order row in the table
 */
function OrderRow({ order, canSeeFinancials }) {
  return (
    <tr className="border-t border-dark-300 hover:bg-dark-300/50">
      <td className="px-6 py-4 text-white font-medium">{order.order_number}</td>
      <td className="px-6 py-4">
        <Link 
          to={`/profile/${order.buyer_id}`} 
          className="text-gray-400 hover:text-primary"
        >
          {order.buyer_username}
        </Link>
      </td>
      <td className="px-6 py-4 text-white">${order.total?.toLocaleString()}</td>
      {canSeeFinancials && (
        <>
          <td className="px-6 py-4 text-primary">${order.platform_fee?.toFixed(2)}</td>
          <td className="px-6 py-4 text-cyan-400">
            ${(order.payment_processing_fee || 0)?.toFixed(2)}
          </td>
        </>
      )}
      <td className="px-6 py-4">
        <span className={`badge ${getStatusBadgeClasses(order.status)}`}>
          {order.status}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-400">
        {new Date(order.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4">
        <Link 
          to={`/orders/${order.id}`} 
          className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100 inline-block" 
          title="View"
        >
          <Eye className="w-4 h-4 text-gray-400" />
        </Link>
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

export default OrdersTab;
