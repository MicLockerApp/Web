/**
 * LearnBannersTab - Admin component to manage Learn page banners
 * 
 * Features:
 * - View all banners (up to 5)
 * - Add new banners
 * - Replace/update existing banners
 * - Reorder banners
 * - Delete banners
 * - Only admin/owner can access
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Image, Link as LinkIcon, 
  ChevronUp, ChevronDown, Save, X, Loader2, Eye
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const LearnBannersTab = () => {
  const { isDark } = useTheme();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_type: 'none',
    link_id: '',
    link_url: ''
  });

  // Fetch banners
  const fetchBanners = async () => {
    try {
      const res = await api.get('/learn/banners?include_inactive=true');
      setBanners(res.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      image_url: '',
      link_type: 'none',
      link_id: '',
      link_url: ''
    });
    setEditingBanner(null);
  };

  // Open modal for new banner
  const openNewBannerModal = () => {
    if (banners.length >= 5) {
      alert('Maximum 5 banners allowed. Please delete or replace an existing banner.');
      return;
    }
    resetForm();
    setShowModal(true);
  };

  // Open modal to edit existing banner
  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      link_type: banner.link_type || 'none',
      link_id: banner.link_id || '',
      link_url: banner.link_url || ''
    });
    setShowModal(true);
  };

  // Save banner (create or update)
  const handleSave = async () => {
    if (!formData.title || !formData.image_url) {
      alert('Title and Image URL are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        order: editingBanner ? editingBanner.order : banners.length
      };

      if (editingBanner) {
        await api.put(`/learn/banners/${editingBanner.id}`, payload);
      } else {
        await api.post('/learn/banners', payload);
      }
      
      await fetchBanners();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  // Delete banner
  const handleDelete = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      await api.delete(`/learn/banners/${bannerId}`);
      await fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner');
    }
  };

  // Toggle banner active status
  const toggleActive = async (banner) => {
    try {
      await api.put(`/learn/banners/${banner.id}`, { is_active: !banner.is_active });
      await fetchBanners();
    } catch (error) {
      console.error('Error toggling banner:', error);
    }
  };

  // Move banner order
  const moveBanner = async (bannerId, direction) => {
    const index = banners.findIndex(b => b.id === bannerId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === banners.length - 1)) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newBanners = [...banners];
    [newBanners[index], newBanners[newIndex]] = [newBanners[newIndex], newBanners[index]];

    // Update order in backend
    try {
      for (let i = 0; i < newBanners.length; i++) {
        await api.put(`/learn/banners/${newBanners[i].id}`, { order: i });
      }
      await fetchBanners();
    } catch (error) {
      console.error('Error reordering banners:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Learn Page Banners
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage the sliding banners on the Learn page (max 5 banners)
          </p>
        </div>
        <button
          onClick={openNewBannerModal}
          disabled={banners.length >= 5}
          className={`btn btn-primary flex items-center gap-2 ${banners.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className="w-4 h-4" />
          Add Banner ({banners.length}/5)
        </button>
      </div>

      {/* Banners List */}
      {banners.length === 0 ? (
        <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-dark-500' : 'bg-gray-100'}`}>
          <Image className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No banners configured</p>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Add banners to showcase on the Learn page
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner, index) => (
            <div 
              key={banner.id}
              className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-dark-500' : 'bg-gray-100'} ${
                !banner.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Order Controls */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveBanner(banner.id, 'up')}
                  disabled={index === 0}
                  className={`p-1 rounded ${index === 0 ? 'opacity-30' : 'hover:bg-dark-400'}`}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <span className={`text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {index + 1}
                </span>
                <button
                  onClick={() => moveBanner(banner.id, 'down')}
                  disabled={index === banners.length - 1}
                  className={`p-1 rounded ${index === banners.length - 1 ? 'opacity-30' : 'hover:bg-dark-400'}`}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Banner Preview */}
              <div className="w-48 h-24 rounded-lg overflow-hidden bg-dark-600 flex-shrink-0">
                {banner.image_url ? (
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Banner Info */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {banner.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {banner.link_type !== 'none' && (
                    <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-dark-400' : 'bg-gray-200'}`}>
                      Links to: {banner.link_type}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    banner.is_active 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(banner)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-200'
                  }`}
                  title={banner.is_active ? 'Deactivate' : 'Activate'}
                >
                  <Eye className={`w-5 h-5 ${banner.is_active ? 'text-green-500' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => openEditModal(banner)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-200'
                  }`}
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5 text-blue-500" />
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-200'
                  }`}
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Banner Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className={`w-full max-w-lg mx-4 rounded-2xl p-6 ${isDark ? 'bg-dark-500' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingBanner ? 'Edit Banner' : 'Add New Banner'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-dark-400 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Banner headline"
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Optional description"
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                />
              </div>

              {/* Image URL */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Image URL *
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/banner.jpg"
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                />
                {formData.image_url && (
                  <div className="mt-2 w-full h-32 rounded-lg overflow-hidden bg-dark-600">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>

              {/* Link Type */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Link To
                </label>
                <select
                  value={formData.link_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_type: e.target.value, link_id: '', link_url: '' }))}
                  className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                >
                  <option value="none">No Link</option>
                  <option value="channel">Channel</option>
                  <option value="playlist">Playlist</option>
                  <option value="external">External URL</option>
                </select>
              </div>

              {/* Link ID (for channel/playlist) */}
              {(formData.link_type === 'channel' || formData.link_type === 'playlist') && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formData.link_type === 'channel' ? 'Channel ID' : 'Playlist ID'}
                  </label>
                  <input
                    type="text"
                    value={formData.link_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_id: e.target.value }))}
                    placeholder={`Enter ${formData.link_type} ID`}
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                  />
                </div>
              )}

              {/* External URL */}
              {formData.link_type === 'external' && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    External URL
                  </label>
                  <input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                    placeholder="https://example.com"
                    className={`w-full px-4 py-2 rounded-lg ${isDark ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'} border ${isDark ? 'border-dark-300' : 'border-gray-200'}`}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.title || !formData.image_url}
                className="flex-1 btn btn-primary flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingBanner ? 'Save Changes' : 'Add Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnBannersTab;
