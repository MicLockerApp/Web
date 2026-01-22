import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Tag, Box, Truck, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listingsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import S3MediaUploader from '../components/S3MediaUploader';

const CATEGORIES = [
  'Guitars', 'Bass', 'Drums & Percussion', 'Keyboards & Synths', 'Pro Audio',
  'Recording', 'DJ & Electronic', 'Microphones', 'Amplifiers', 'Effects & Pedals',
  'Accessories', 'Studio Equipment', 'Live Sound', 'Vintage', 'Other'
];

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'mint', label: 'Mint' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'very_good', label: 'Very Good' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const EditListingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
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
    model: '',
    quantity: 1,
    accepts_offers: true,
    shipping_price: '',
    shipping_days: '',
    payment_plan_enabled: false,
    payment_plan_payments: 3,
  });
  const [media, setMedia] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchListing();
  }, [id, isAuthenticated, navigate]);

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
        condition: listing.condition || '',
        brand: listing.brand || '',
        model: listing.model || '',
        quantity: listing.quantity || 1,
        accepts_offers: listing.accepts_offers !== false,
        shipping_price: listing.shipping?.price?.toString() || '',
        shipping_days: listing.shipping?.estimated_days || '',
        payment_plan_enabled: listing.payment_plan?.enabled || false,
        payment_plan_payments: listing.payment_plan?.num_payments || 3,
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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        const fileType = isVideo ? 'video' : 'image';
        
        const res = await filesAPI.upload(file, fileType);
        setMedia(prev => [...prev, {
          id: Date.now().toString(),
          url: res.data.url,
          media_type: fileType,
          is_primary: prev.length === 0,
        }]);
      }
      setMessage({ type: 'success', text: 'Files uploaded successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to upload files' });
    } finally {
      setUploading(false);
    }
  };

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
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        brand: formData.brand || null,
        model: formData.model || null,
        quantity: parseInt(formData.quantity),
        accepts_offers: formData.accepts_offers,
        shipping: formData.shipping_price ? {
          price: parseFloat(formData.shipping_price),
          estimated_days: formData.shipping_days || '3-5 business days',
        } : null,
        payment_plan: formData.payment_plan_enabled ? {
          enabled: true,
          num_payments: parseInt(formData.payment_plan_payments),
        } : null,
        media: media,
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
          {/* Media Upload */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Photos & Videos
            </h2>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-4">
              {media.map((item) => (
                <div key={item.id} className="relative aspect-square bg-dark-300 rounded-lg overflow-hidden group">
                  {item.media_type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(item.id)}
                      className={`p-2 rounded-lg ${item.is_primary ? 'bg-primary text-black' : 'bg-white/20 text-white'}`}
                      title="Set as primary"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {item.is_primary && (
                    <span className="absolute top-2 left-2 bg-primary text-black text-xs px-2 py-1 rounded">Primary</span>
                  )}
                  {item.media_type === 'video' && (
                    <Video className="absolute bottom-2 right-2 w-4 h-4 text-white" />
                  )}
                </div>
              ))}

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square bg-dark-300 rounded-lg border-2 border-dashed border-dark-200 flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
              >
                {uploading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-gray-400 text-sm">Add</span>
                  </>
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <p className="text-gray-500 text-sm">Upload up to 10 photos and 1 video. First image is the cover.</p>
          </div>

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
                  <label className="block text-gray-400 mb-2">Model</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
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
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-gray-400 mb-2">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="1"
                  />
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
                  name="payment_plan_enabled"
                  checked={formData.payment_plan_enabled}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-white">Offer payment plan</span>
              </label>

              {formData.payment_plan_enabled && (
                <div>
                  <label className="block text-gray-400 mb-2">Number of Payments</label>
                  <select
                    name="payment_plan_payments"
                    value={formData.payment_plan_payments}
                    onChange={handleChange}
                  >
                    {[2, 3, 4, 6, 12].map(n => (
                      <option key={n} value={n}>{n} payments of ${(parseFloat(formData.price || 0) / n).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Shipping
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-2">Shipping Cost</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    name="shipping_price"
                    value={formData.shipping_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="pl-8"
                    placeholder="0 for free shipping"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Estimated Delivery</label>
                <input
                  type="text"
                  name="shipping_days"
                  value={formData.shipping_days}
                  onChange={handleChange}
                  placeholder="e.g., 3-5 business days"
                />
              </div>
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
