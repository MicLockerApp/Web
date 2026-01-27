/**
 * ResetAnalyticsModal Component
 * 
 * Modal for resetting analytics and order data.
 * Requires explicit confirmation to prevent accidental data loss.
 * 
 * This is an admin-only feature with dangerous permanent consequences.
 */

import React from 'react';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

function ResetAnalyticsModal({
  isOpen,
  onClose,
  resetOptions,
  setResetOptions,
  resetConfirmation,
  setResetConfirmation,
  onReset,
  isLoading,
  error
}) {
  if (!isOpen) {
    return null;
  }

  const handleOptionChange = (option, checked) => {
    if (option === 'reset_all') {
      // When "Reset All" is toggled, set all options to match
      setResetOptions({
        reset_orders: checked,
        reset_analytics_events: checked,
        reset_analytics_rollups: checked,
        reset_support_tickets: checked,
        reset_all: checked
      });
    } else {
      // When individual option changes, uncheck "Reset All"
      setResetOptions({ 
        ...resetOptions, 
        [option]: checked, 
        reset_all: false 
      });
    }
  };

  const handleClose = () => {
    setResetConfirmation('');
    onClose();
  };

  const isConfirmationValid = resetConfirmation === 'CONFIRM_RESET';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-400 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Reset Analytics Data</h2>
              <p className="text-gray-500 text-sm">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Reset Options */}
        <div className="space-y-3 mb-6">
          <p className="text-gray-400 text-sm mb-4">
            Select the data you want to reset:
          </p>
          
          <ResetOption
            label="Orders"
            description="Delete all order records"
            checked={resetOptions.reset_orders}
            onChange={(checked) => handleOptionChange('reset_orders', checked)}
          />

          <ResetOption
            label="Analytics Events"
            description="Delete raw analytics event data"
            checked={resetOptions.reset_analytics_events}
            onChange={(checked) => handleOptionChange('reset_analytics_events', checked)}
          />

          <ResetOption
            label="Analytics Rollups"
            description="Delete aggregated analytics (Overview stats)"
            checked={resetOptions.reset_analytics_rollups}
            onChange={(checked) => handleOptionChange('reset_analytics_rollups', checked)}
          />

          <ResetOption
            label="Support Tickets"
            description="Delete all support ticket records"
            checked={resetOptions.reset_support_tickets}
            onChange={(checked) => handleOptionChange('reset_support_tickets', checked)}
          />

          {/* Reset All - Highlighted danger option */}
          <label className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg cursor-pointer hover:bg-red-900/30">
            <input
              type="checkbox"
              checked={resetOptions.reset_all}
              onChange={(e) => handleOptionChange('reset_all', e.target.checked)}
              className="w-4 h-4 rounded border-gray-600"
            />
            <div>
              <p className="text-red-400 font-medium">Reset All</p>
              <p className="text-gray-500 text-xs">Delete ALL analytics and order data</p>
            </div>
          </label>
        </div>

        {/* Confirmation Input */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">
            Type <span className="text-red-400 font-mono">CONFIRM_RESET</span> to proceed:
          </label>
          <input
            type="text"
            value={resetConfirmation}
            onChange={(e) => setResetConfirmation(e.target.value)}
            placeholder="CONFIRM_RESET"
            className="w-full bg-dark-300 border border-dark-200 rounded-lg px-4 py-3 text-white font-mono"
            data-testid="reset-confirmation-input"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-dark-300 hover:bg-dark-200 text-gray-400 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onReset}
            disabled={isLoading || !isConfirmationValid}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="confirm-reset-btn"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Data'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual reset option checkbox
 */
function ResetOption({ label, description, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg cursor-pointer hover:bg-dark-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-600"
      />
      <div>
        <p className="text-white font-medium">{label}</p>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>
    </label>
  );
}

export default ResetAnalyticsModal;
