/**
 * OverviewTab Component
 * 
 * Displays the admin dashboard overview with:
 * - Date range picker (synced with Analytics Dashboard)
 * - Financial stats (GMV, fees) - owner only
 * - Activity stats (listings, users)
 * - Orders by status
 * - Recent activity summary
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, TrendingUp, CreditCard, Percent, Package, Users,
  ShoppingCart, Calendar, Package2, UserCheck, RefreshCw
} from 'lucide-react';
import { getStatusBadgeClasses } from './utils';

function OverviewTab({
  analytics,
  canSeeFinancials,
  canResetAnalytics,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  formatDateRange,
  setLast7Days,
  setLast30Days,
  setLast90Days,
  onShowResetModal
}) {
  return (
    <>
      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-dark-400 rounded-lg p-1">
          <button
            onClick={setLast7Days}
            className="px-3 py-1.5 text-xs rounded-lg bg-dark-300 text-gray-400 hover:text-white hover:bg-dark-200 transition-colors"
          >
            7D
          </button>
          <button
            onClick={setLast30Days}
            className="px-3 py-1.5 text-xs rounded-lg bg-dark-300 text-gray-400 hover:text-white hover:bg-dark-200 transition-colors"
          >
            30D
          </button>
          <button
            onClick={setLast90Days}
            className="px-3 py-1.5 text-xs rounded-lg bg-dark-300 text-gray-400 hover:text-white hover:bg-dark-200 transition-colors"
          >
            90D
          </button>
        </div>
        
        <div className="flex items-center gap-2 bg-dark-400 rounded-lg p-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 w-32"
            data-testid="admin-start-date"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 w-32"
            data-testid="admin-end-date"
          />
        </div>
        
        <p className="text-gray-400 text-sm ml-auto">
          Date range: <span className="text-primary font-medium">{formatDateRange()}</span>
          <span className="text-gray-600 ml-2">(synced with Analytics)</span>
        </p>
      </div>
      
      {/* Reset Analytics Button */}
      {canResetAnalytics && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onShowResetModal}
            className="px-4 py-2 bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors flex items-center gap-2 text-sm"
            data-testid="reset-analytics-btn"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Analytics Data
          </button>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className={`grid gap-4 mb-8 ${canSeeFinancials ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4'}`}>
        {/* Financial stats - only for owner */}
        {canSeeFinancials && (
          <>
            <StatCard
              icon={DollarSign}
              iconColor="text-green-400"
              value={`$${analytics?.total_gmv?.toLocaleString() || '0'}`}
              label="Total GMV"
            />
            <StatCard
              icon={TrendingUp}
              iconColor="text-primary"
              value={`$${analytics?.total_fees_collected?.toLocaleString() || '0'}`}
              label={`Platform Fees (${analytics?.platform_fee_percent || 3}%)`}
            />
            <StatCard
              icon={CreditCard}
              iconColor="text-cyan-400"
              value={`$${analytics?.total_processing_fees_collected?.toLocaleString() || '0'}`}
              label="Payment Processing"
              sublabel={`${analytics?.payment_processing_percent || 3.19}% + $${analytics?.payment_processing_fixed || 0.49}`}
            />
            <StatCard
              icon={Percent}
              iconColor="text-emerald-400"
              value={`$${((analytics?.total_fees_collected || 0) + (analytics?.total_processing_fees_collected || 0)).toLocaleString()}`}
              label="Total Fees Collected"
            />
          </>
        )}
        <StatCard
          icon={Package}
          iconColor="text-blue-400"
          value={analytics?.active_listings || 0}
          label="Active Listings"
        />
        <StatCard
          icon={Users}
          iconColor="text-purple-400"
          value={analytics?.total_users || 0}
          label="Total Users"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Orders by Status */}
        <div className="bg-dark-400 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Orders by Status
          </h2>
          <div className="space-y-3">
            {Object.entries(analytics?.orders_by_status || {}).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className={`badge ${getStatusBadgeClasses(status)}`}>{status}</span>
                <span className="text-white font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(analytics?.orders_by_status || {}).length === 0 && (
              <p className="text-gray-500">No orders yet</p>
            )}
          </div>
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-dark-400 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Activity (30 days)
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-400">
                <Package2 className="w-4 h-4" />
                <span>New Orders</span>
              </div>
              <span className="text-white font-medium">{analytics?.recent_orders || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-400">
                <UserCheck className="w-4 h-4" />
                <span>New Signups</span>
              </div>
              <span className="text-white font-medium">{analytics?.recent_signups || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Stat Card sub-component for displaying metrics
 */
function StatCard({ icon: Icon, iconColor, value, label, sublabel }) {
  return (
    <div className="bg-dark-400 rounded-xl p-6">
      <Icon className={`w-10 h-10 ${iconColor} mb-3`} />
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-gray-400 text-sm">{label}</p>
      {sublabel && <p className="text-gray-500 text-xs mt-1">{sublabel}</p>}
    </div>
  );
}

export default OverviewTab;
