import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listingsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import S3MediaUploader from '../components/S3MediaUploader';
import { GEAR_CATEGORIES, GEAR_CONDITIONS } from '../constants/gear';

const CATEGORIES = GEAR_CATEGORIES.map(c => c.label);

const CONDITIONS = GEAR_CONDITIONS.map(c => ({ value: c.key, label: c.label }));

const EditListingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    brand: '',
    location: '',
    accepts_offers: true,
    willing_to_trade: false,
  });
  const [media, setMedia] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) fetchListing();
  }, [id, isAuthenticated, authLoading, user, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchListing = async () => {
    try {
      const res = await listingsAPI.getById(id);
      const listing = res.data;
      
      // Check ownership
      if (listing.seller_id !== user?.id) {
        navigate('/dashboard');
        return;
      }

      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        price: listing.price?.toString() || '',
        category: listing.category || '',
        condition: listing.condition_key || '',
        brand: listing.brand || '',
        location: listing.location || '',
        accepts_offers: listing.accepts_offers !== false,
        willing_to_trade: !!listing.willing_to_trade,
      });
      setMedia(listing.media || []);
    } catch (error) {
      console.error('Error fetching listing:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle S3 media changes
  const handleMediaChange = useCallback((newMedia) => {
    // Convert S3MediaUploader format to listing media format
    const converted = newMedia.map((item, index) => ({
      id: item.media_id || item.key || `media-${index}`,
      media_id: item.media_id || item.key,
      url: item.url,
      media_type: item.type,
      is_primary: index === 0,
      order: index
    }));
    setMedia(converted);
  }, []);

  const handleRemoveMedia = (mediaId) => {
    setMedia(prev => {
      const updated = prev.filter(m => m.id !== mediaId);
      // Reassign primary if needed
      if (updated.length > 0 && !updated.some(m => m.is_primary)) {
        updated[0].is_primary = true;
      }
      return updated;
    });
  };

  const handleSetPrimary = (mediaId) => {
    setMedia(prev => prev.map(m => ({
      ...m,
      is_primary: m.id === mediaId
    })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const ordered = [...media].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        condition: formData.condition,
        brand: formData.brand || null,
        location: formData.location || null,
        accepts_offers: formData.accepts_offers,
        willing_to_trade: formData.willing_to_trade,
        image_media_ids: ordered.map(m => m.media_id).filter(Boolean),
      };

      await listingsAPI.update(id, listingData);
      setMessage({ type: 'success', text: 'Listing updated successfully!' });
      setTimeout(() => navigate(`/listing/${id}`), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update listing' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    
    setDeleting(true);
    try {
      await listingsAPI.delete(id);
      navigate('/dashboard');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to delete listing' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen" data-testid="edit-listing-page">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Edit Listing</h1>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Upload - S3 */}
          <S3MediaUploader
            listingId={id}
            onChange={handleMediaChange}
            initialMedia={media.map(m => ({
              key: m.media_id,
              media_id: m.media_id,
              url: m.url,
              type: m.media_type,
              filename: m.id
            }))}
            maxFiles={10}
          />

          {/* Basic Info */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  data-testid="listing-title-input"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={5}
                  data-testid="listing-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Brand</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., St. Louis, MO"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
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
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select condition</option>
                    {CONDITIONS.map(cond => (
                      <option key={cond.value} value={cond.value}>{cond.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Price *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      min="1"
                      step="0.01"
                      className="pl-8"
                      data-testid="listing-price-input"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="accepts_offers"
                  checked={formData.accepts_offers}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-white">Accept offers from buyers</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="willing_to_trade"
                  checked={formData.willing_to_trade}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-white">Willing to trade</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete Listing'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex-1"
              data-testid="save-listing-button"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditListingPage;
