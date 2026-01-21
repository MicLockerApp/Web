import React, { useState } from 'react';
import { X, Flag, AlertTriangle, Send } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const REPORT_CATEGORIES = [
  { id: 'inaccurate', label: 'Inaccurate Information', description: 'Misleading title, description, or photos' },
  { id: 'counterfeit', label: 'Counterfeit or Fake', description: 'Item appears to be counterfeit or not genuine' },
  { id: 'prohibited', label: 'Prohibited Item', description: 'Item is not allowed on MicLocker' },
  { id: 'offensive', label: 'Offensive Content', description: 'Inappropriate or offensive material' },
  { id: 'scam', label: 'Suspected Scam', description: 'Listing appears to be fraudulent' },
  { id: 'stolen', label: 'Stolen Property', description: 'Item may be stolen merchandise' },
  { id: 'price_manipulation', label: 'Price Manipulation', description: 'Artificially inflated or deceptive pricing' },
  { id: 'other', label: 'Other', description: 'Other issue not listed above' },
];

const ReportListingModal = ({ isOpen, onClose, listing, onSuccess }) => {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      setError('Please select a report category');
      return;
    }
    
    if (!description.trim()) {
      setError('Please provide a brief description of the issue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/reports/listing', {
        listing_id: listing.id,
        category: selectedCategory,
        description: description.trim(),
        listing_url: `${window.location.origin}/listing/${listing.id}`,
        listing_title: listing.title,
        seller_id: listing.seller_id,
        seller_username: listing.seller_username
      });
      
      setSuccess(true);
      if (onSuccess) onSuccess();
      
      // Auto close after showing success
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedCategory('');
        setDescription('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory('');
    setDescription('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="report-listing-modal">
      <div className={`w-full max-w-lg rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-dark-300 bg-dark-500' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
              <Flag className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Report Listing</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Help keep MicLocker safe
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-300 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Report Submitted
            </h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Thank you for helping keep MicLocker safe. Our team will review this report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4">
            {/* Listing Preview */}
            <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${isDark ? 'bg-dark-500' : 'bg-gray-100'}`}>
              <img
                src={listing.media?.[0]?.url || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100'}
                alt=""
                className="w-12 h-12 object-cover rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {listing.title}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  by @{listing.seller_username}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Category Selection */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Why are you reporting this listing?
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {REPORT_CATEGORIES.map((category) => (
                  <label
                    key={category.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedCategory === category.id
                        ? isDark ? 'bg-primary/20 border-2 border-primary' : 'bg-yellow-50 border-2 border-yellow-400'
                        : isDark ? 'bg-dark-500 hover:bg-dark-300 border-2 border-transparent' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={category.id}
                      checked={selectedCategory === category.id}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {category.label}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {category.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Please describe the issue
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about why you're reporting this listing..."
                rows={3}
                className={`w-full rounded-lg p-3 resize-none ${
                  isDark 
                    ? 'bg-dark-500 border-dark-300 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } border focus:ring-2 focus:ring-primary/50 focus:border-primary`}
                data-testid="report-description"
              />
            </div>

            {/* Notice */}
            <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
              <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                Reports are reviewed by our team within 24-48 hours. You may be contacted for additional information.
                False reports may result in account restrictions.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  isDark ? 'bg-dark-300 text-gray-300 hover:bg-dark-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedCategory || !description.trim()}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="submit-report-btn"
              >
                {loading ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportListingModal;
