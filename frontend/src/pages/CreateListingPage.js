import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Plus, Image, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listingsAPI } from '../services/api';
import S3MediaUploader from '../components/S3MediaUploader';
import { GEAR_CATEGORIES, GEAR_CONDITIONS } from '../constants/gear';

const CATEGORIES = GEAR_CATEGORIES.map(c => c.label);

const CONDITIONS = GEAR_CONDITIONS.map(c => c.label);

const CreateListingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand: '',
    location: '',
    category: '',
    condition: '',
    price: '',
    quantity: 1,
    accepts_offers: true,
    willing_to_trade: false,
    shipping_method: 'Standard',
    shipping_price: '',
    payment_plan_enabled: false,
    payment_plan_payments: 4,
    tags: '',
  });

  // S3 uploaded media
  const [uploadedMedia, setUploadedMedia] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Handle S3 media uploads
  const handleMediaChange = useCallback((media) => {
    setUploadedMedia(media);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate minimum price
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 5) {
      setError('Minimum listing price is $5.00');
      setLoading(false);
      return;
    }

    if (uploadedMedia.length === 0) {
      setError('Add at least one photo');
      setLoading(false);
      return;
    }

    try {
      const listingData = {
        title: formData.title,
        description: formData.description,
        brand: formData.brand || null,
        location: formData.location || null,
        category: formData.category,
        condition: formData.condition,
        price: formData.price,
        accepts_offers: formData.accepts_offers,
        willing_to_trade: formData.willing_to_trade,
        image_media_ids: uploadedMedia.map(item => item.media_id || item.key).filter(Boolean),
      };

      const response = await listingsAPI.create(listingData);
      navigate(`/listing/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" data-testid="create-listing-page">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Create Listing</h1>

        {error && (
          <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Media Upload - S3 */}
          <div className="mb-6">
            <S3MediaUploader 
              onChange={handleMediaChange}
              maxFiles={10}
            />
          </div>

          {/* Basic Info */}
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Fender American Stratocaster 2023"
                  required
                  maxLength={200}
                  data-testid="listing-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., Fender"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., St. Louis, MO"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    data-testid="listing-category"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Condition *</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    required
                    data-testid="listing-condition"
                  >
                    <option value="">Select condition</option>
                    {CONDITIONS.map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  required
                  minLength={10}
                  placeholder="Describe your item in detail..."
                  data-testid="listing-description"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Pricing</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Price * <span className="text-xs text-gray-500">(min $5.00)</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="pl-8"
                      required
                      min="5"
                      step="0.01"
                      placeholder="5.00"
                      data-testid="listing-price"
                    />
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.accepts_offers}
                  onChange={(e) => setFormData({ ...formData, accepts_offers: e.target.checked })}
                  className="w-5 h-5 rounded bg-dark-300 border-dark-200 text-primary focus:ring-primary"
                />
                <span className="text-white">Accept Offers</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.willing_to_trade}
                  onChange={(e) => setFormData({ ...formData, willing_to_trade: e.target.checked })}
                  className="w-5 h-5 rounded bg-dark-300 border-dark-200 text-primary focus:ring-primary"
                />
                <span className="text-white">Willing to Trade</span>
              </label>
              <p className="text-gray-500 text-sm">Shipping and handling are added when you ship the item.</p>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full py-4 text-lg"
            disabled={loading}
            data-testid="submit-listing"
          >
            {loading ? 'Creating Listing...' : 'Create Listing'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateListingPage;
