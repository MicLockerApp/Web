import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Plus, Image, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listingsAPI } from '../services/api';
import S3MediaUploader from '../components/S3MediaUploader';

const CATEGORIES = [
  'Guitars', 'Bass', 'Keyboards & Synths', 'Drums & Percussion',
  'Pro Audio', 'Recording Equipment', 'Microphones', 'DJ Equipment',
  'Studio Monitors', 'Headphones', 'Cables & Connectors', 'Effects Pedals',
  'Amplifiers', 'Wind Instruments', 'String Instruments', 'Accessories',
  'Cases & Bags', 'Stands & Mounts', 'Software & Plugins', 'Other'
];

const CONDITIONS = ['Brand New', 'Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];

const CreateListingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand: '',
    model: '',
    category: '',
    condition: '',
    price: '',
    quantity: 1,
    accepts_offers: true,
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
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingMedia(true);
    
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setError('Only images and videos are allowed');
        continue;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      setMediaPreview(prev => [...prev, { file, preview, type: isImage ? 'image' : 'video' }]);
      setMediaFiles(prev => [...prev, file]);
    }
    
    setUploadingMedia(false);
  };

  const removeMedia = (index) => {
    setMediaPreview(prev => prev.filter((_, i) => i !== index));
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create listing first
      const listingData = {
        title: formData.title,
        description: formData.description,
        brand: formData.brand || null,
        model: formData.model || null,
        category: formData.category,
        condition: formData.condition,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        accepts_offers: formData.accepts_offers,
        shipping: {
          method: formData.shipping_method,
          price: parseFloat(formData.shipping_price) || 0,
          estimated_days: '3-5 business days',
        },
        payment_plan: {
          enabled: formData.payment_plan_enabled,
          num_payments: formData.payment_plan_payments,
          down_payment_percent: 25,
        },
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      };

      const response = await listingsAPI.create(listingData);
      const listingId = response.data.id;

      // Upload media
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const formDataMedia = new FormData();
        formDataMedia.append('file', file);
        
        await listingsAPI.addMedia(listingId, formDataMedia, i === 0);
      }

      navigate(`/listing/${listingId}`);
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
          {/* Media Upload */}
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Photos & Videos</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-4">
              {mediaPreview.map((media, index) => (
                <div key={index} className="relative aspect-square bg-dark-300 rounded-lg overflow-hidden">
                  {media.type === 'image' ? (
                    <img src={media.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={media.preview} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1 hover:bg-red-500"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 bg-primary text-black text-xs px-2 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}
              <label className="aspect-square bg-dark-300 rounded-lg border-2 border-dashed border-dark-200 hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaUpload}
                  className="hidden"
                  disabled={uploadingMedia}
                />
                <Plus className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-gray-400 text-sm">Add Media</span>
              </label>
            </div>
            <p className="text-gray-500 text-sm">Upload up to 10 images and 1 video. First image will be the cover.</p>
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
                  <label className="block text-gray-400 mb-2">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., American Professional II"
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
              <div>
                <label className="block text-gray-400 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., guitar, electric, vintage"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Pricing</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Price *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="pl-8"
                      required
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      data-testid="listing-price"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    min="1"
                    data-testid="listing-quantity"
                  />
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
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Shipping</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-2">Shipping Method</label>
                <select
                  value={formData.shipping_method}
                  onChange={(e) => setFormData({ ...formData, shipping_method: e.target.value })}
                >
                  <option value="Standard">Standard Shipping</option>
                  <option value="Express">Express Shipping</option>
                  <option value="Local Pickup">Local Pickup Only</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Shipping Cost</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={formData.shipping_price}
                    onChange={(e) => setFormData({ ...formData, shipping_price: e.target.value })}
                    className="pl-8"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Plan */}
          <div className="bg-dark-400 rounded-xl p-6 mb-6">
            <label className="flex items-center justify-between cursor-pointer mb-4">
              <span className="text-lg font-semibold text-white">Payment Plan</span>
              <input
                type="checkbox"
                checked={formData.payment_plan_enabled}
                onChange={(e) => setFormData({ ...formData, payment_plan_enabled: e.target.checked })}
                className="w-5 h-5 rounded bg-dark-300 border-dark-200 text-primary focus:ring-primary"
              />
            </label>
            {formData.payment_plan_enabled && (
              <div>
                <label className="block text-gray-400 mb-2">Number of Payments</label>
                <select
                  value={formData.payment_plan_payments}
                  onChange={(e) => setFormData({ ...formData, payment_plan_payments: parseInt(e.target.value) })}
                >
                  <option value="2">2 payments</option>
                  <option value="3">3 payments</option>
                  <option value="4">4 payments</option>
                  <option value="6">6 payments</option>
                </select>
                {formData.price && (
                  <p className="text-gray-400 text-sm mt-2">
                    Buyers can pay ${(parseFloat(formData.price) / formData.payment_plan_payments).toFixed(2)} per payment
                  </p>
                )}
              </div>
            )}
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
