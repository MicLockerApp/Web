import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, authAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Camera, Check, Save, X, User, Mail, Phone, Globe, Eye, EyeOff, MapPin } from 'lucide-react';
import { COUNTRIES, getStatesForCountry, countryHasStates } from '../data/countries';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, refreshUser, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);
  const [categoryOptions, setCategoryOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    bio: '',
    location: '',
    profile_image: '',
    category: '',
    sub_categories: [],
    genre: '',
    instruments: [],
    specializations: [],
    studio_offerings: [],
    venue_name: '',
    venue_city: '',
    venue_capacity: '',
    merchant_products: [],
    business_name: '',
    // Contact info
    phone: '',
    website: '',
    instagram: '',
    twitter: '',
    facebook: '',
    youtube: '',
    soundcloud: '',
    spotify: '',
    // Address fields
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    // Privacy settings
    show_email: false,
    show_phone: false,
    show_address: false,
    show_social: true,
  });

  const CATEGORY_OPTIONS = [
    { value: 'musician', label: 'Musician', icon: '🎸' },
    { value: 'audio_engineer', label: 'Audio Engineer', icon: '🎚️' },
    { value: 'recording_studio', label: 'Recording Studio', icon: '🎙️' },
    { value: 'venue', label: 'Venue', icon: '🏟️' },
    { value: 'merchant', label: 'Merchant', icon: '🛍️' },
  ];

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    const fetchData = async () => {
      try {
        const [profileRes, categoriesRes] = await Promise.all([
          usersAPI.getProfile(user.id),
          authAPI.getCategories()
        ]);
        
        const profile = profileRes.data;
        setCategoryOptions(categoriesRes.data);
        
        // Extract address from shipping_address if available
        const shippingAddress = profile.shipping_address || {};
        
        setFormData({
          bio: profile.bio || '',
          location: profile.location || '',
          profile_image: profile.profile_image || '',
          category: profile.category || '',
          sub_categories: profile.sub_categories || [],
          genre: profile.genre || '',
          instruments: profile.instruments || [],
          specializations: profile.specializations || [],
          studio_offerings: profile.studio_offerings || [],
          venue_name: profile.venue_name || '',
          venue_city: profile.venue_city || '',
          venue_capacity: profile.venue_capacity || '',
          merchant_products: profile.merchant_products || [],
          business_name: profile.business_name || '',
          // Contact info
          phone: profile.phone || '',
          website: profile.website || '',
          instagram: profile.instagram || '',
          twitter: profile.twitter || '',
          facebook: profile.facebook || '',
          youtube: profile.youtube || '',
          soundcloud: profile.soundcloud || '',
          spotify: profile.spotify || '',
          // Address fields from shipping_address
          address_line1: shippingAddress.address_line1 || '',
          address_line2: shippingAddress.address_line2 || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          postal_code: shippingAddress.postal_code || '',
          country: shippingAddress.country || '',
          // Privacy settings
          show_email: profile.show_email || false,
          show_phone: profile.show_phone || false,
          show_address: profile.show_address || false,
          show_social: profile.show_social !== false, // Default to true
        });
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate, authLoading]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const response = await usersAPI.uploadProfileImage(file);
      setFormData(prev => ({ ...prev, profile_image: response.data.profile_image }));
      setSuccess('Profile image updated!');
      setTimeout(() => setSuccess(''), 3000);
      if (refreshUser) refreshUser();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Build the update payload
      const updateData = {
        ...formData,
        // Build shipping_address object
        shipping_address: formData.country ? {
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
        } : null,
      };
      
      // Remove individual address fields from root (they're in shipping_address now)
      delete updateData.address_line1;
      delete updateData.address_line2;
      delete updateData.city;
      delete updateData.state;
      delete updateData.postal_code;
      delete updateData.country;
      
      await usersAPI.updateProfile(updateData);
      setSuccess('Profile updated successfully!');
      if (refreshUser) refreshUser();
      setTimeout(() => {
        navigate(`/profile/${user.id}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (field, value) => {
    setFormData(prev => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const toggleSubCategory = (value) => {
    if (value === formData.category) return;
    setFormData(prev => {
      const current = prev.sub_categories || [];
      if (current.includes(value)) {
        return { ...prev, sub_categories: current.filter(v => v !== value) };
      } else {
        return { ...prev, sub_categories: [...current, value] };
      }
    });
  };

  if (authLoading || loading) return <LoadingSpinner />;

  const allCategories = [formData.category, ...formData.sub_categories].filter(Boolean);
  const selectedCountry = COUNTRIES.find(c => c.code === formData.country);
  const states = getStatesForCountry(formData.country);
  const showStates = countryHasStates(formData.country);

  // Privacy toggle component
  const PrivacyToggle = ({ label, checked, onChange, description }) => (
    <div className="flex items-center justify-between p-3 bg-dark-300 rounded-lg">
      <div className="flex items-center gap-3">
        {checked ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
        <div>
          <span className="text-white text-sm">{label}</span>
          {description && <p className="text-gray-500 text-xs">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-dark-200'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4" data-testid="edit-profile-page">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Image Section */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Profile Picture</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {formData.profile_image ? (
                  <img
                    src={formData.profile_image}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-dark-300 flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-500" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 bg-primary text-black p-2 rounded-full hover:bg-primary/90 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <p className="text-gray-400 text-sm">
                  {uploadingImage ? 'Uploading...' : 'Click the camera icon to upload a new photo'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  JPEG, PNG, GIF or WebP. Max 10MB.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Display Location (e.g., "Nashville, TN")</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, State/Country"
              />
              <p className="text-gray-500 text-xs mt-1">This is shown on your profile. For shipping address, see below.</p>
            </div>
          </div>

          {/* Mailing Address Section */}
          <div className="bg-dark-400 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Mailing Address
                </h2>
                <p className="text-gray-500 text-sm">Required for buying, selling, or trading</p>
              </div>
            </div>

            {/* Country */}
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Country</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value, state: '' })}
              >
                <option value="">Select a country</option>
                <optgroup label="Military (APO/FPO/DPO)">
                  {COUNTRIES.filter(c => c.isMilitary).map(country => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Countries">
                  {COUNTRIES.filter(c => !c.isMilitary).map(country => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {formData.country && (
              <>
                {/* Address Line 1 */}
                <div className="mb-4">
                  <label className="block text-gray-400 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    placeholder="123 Main St"
                  />
                </div>

                {/* Address Line 2 */}
                <div className="mb-4">
                  <label className="block text-gray-400 mb-2">Apt, Suite, Unit (optional)</label>
                  <input
                    type="text"
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    placeholder="Apt 4B"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* City */}
                  <div>
                    <label className="block text-gray-400 mb-2">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>

                  {/* State/Province */}
                  <div>
                    <label className="block text-gray-400 mb-2">
                      {formData.country === 'CA' ? 'Province' : 
                       formData.country === 'AU' ? 'State/Territory' : 
                       formData.country === 'JP' ? 'Prefecture' :
                       'State/Region'}
                    </label>
                    {showStates ? (
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      >
                        <option value="">Select</option>
                        {states.map(state => (
                          <option key={state.code} value={state.code}>{state.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="State or region"
                      />
                    )}
                  </div>
                </div>

                {/* Postal Code */}
                <div className="mb-4">
                  <label className="block text-gray-400 mb-2">
                    {formData.country === 'US' ? 'ZIP Code' : 'Postal Code'}
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder={formData.country === 'US' ? '12345' : 'Postal code'}
                    className="w-1/2"
                  />
                </div>
              </>
            )}

            {/* Show address on profile toggle */}
            <div className="mt-4 pt-4 border-t border-dark-300">
              <PrivacyToggle
                label="Show address on public profile"
                description="Allow others to see your mailing address"
                checked={formData.show_address}
                onChange={() => setFormData({ ...formData, show_address: !formData.show_address })}
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-400 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            {/* Privacy toggles for contact info */}
            <div className="space-y-3 mb-6">
              <PrivacyToggle
                label="Show email on public profile"
                checked={formData.show_email}
                onChange={() => setFormData({ ...formData, show_email: !formData.show_email })}
              />
              <PrivacyToggle
                label="Show phone number on public profile"
                checked={formData.show_phone}
                onChange={() => setFormData({ ...formData, show_phone: !formData.show_phone })}
              />
            </div>

            <h3 className="text-white font-medium mb-3">Social Media</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 mb-2">Instagram</label>
                <div className="flex">
                  <span className="px-3 py-2 bg-dark-300 rounded-l-lg text-gray-500 border border-r-0 border-dark-200">@</span>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="username"
                    className="flex-1 rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Twitter / X</label>
                <div className="flex">
                  <span className="px-3 py-2 bg-dark-300 rounded-l-lg text-gray-500 border border-r-0 border-dark-200">@</span>
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="username"
                    className="flex-1 rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Facebook</label>
                <div className="flex">
                  <span className="px-3 py-2 bg-dark-300 rounded-l-lg text-gray-500 border border-r-0 border-dark-200 text-xs">facebook.com/</span>
                  <input
                    type="text"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="username"
                    className="flex-1 rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">YouTube</label>
                <div className="flex">
                  <span className="px-3 py-2 bg-dark-300 rounded-l-lg text-gray-500 border border-r-0 border-dark-200 text-xs">youtube.com/</span>
                  <input
                    type="text"
                    value={formData.youtube}
                    onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                    placeholder="channel"
                    className="flex-1 rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">SoundCloud</label>
                <div className="flex">
                  <span className="px-3 py-2 bg-dark-300 rounded-l-lg text-gray-500 border border-r-0 border-dark-200 text-xs">soundcloud.com/</span>
                  <input
                    type="text"
                    value={formData.soundcloud}
                    onChange={(e) => setFormData({ ...formData, soundcloud: e.target.value })}
                    placeholder="username"
                    className="flex-1 rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Spotify Artist ID</label>
                <input
                  type="text"
                  value={formData.spotify}
                  onChange={(e) => setFormData({ ...formData, spotify: e.target.value })}
                  placeholder="artist ID"
                />
              </div>
            </div>

            {/* Social media privacy toggle */}
            <div className="mt-4 pt-4 border-t border-dark-300">
              <PrivacyToggle
                label="Show social media links on public profile"
                checked={formData.show_social}
                onChange={() => setFormData({ ...formData, show_social: !formData.show_social })}
              />
            </div>
          </div>

          {/* Primary Category Section */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Primary Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORY_OPTIONS.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ 
                    ...formData, 
                    category: cat.value,
                    sub_categories: formData.sub_categories.filter(sc => sc !== cat.value)
                  })}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    formData.category === cat.value
                      ? 'border-primary bg-primary/10'
                      : 'border-dark-300 hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl block mb-1">{cat.icon}</span>
                  <span className="text-white text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Categories Section */}
          <div className="bg-dark-400 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Secondary Categories</h2>
            <p className="text-gray-500 text-sm mb-4">Select additional roles that apply to you</p>
            <div className="space-y-2">
              {CATEGORY_OPTIONS.filter(cat => cat.value !== formData.category).map(cat => (
                <div
                  key={cat.value}
                  onClick={() => toggleSubCategory(cat.value)}
                  className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    formData.sub_categories.includes(cat.value)
                      ? 'border-primary bg-primary/10'
                      : 'border-dark-300 hover:border-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    formData.sub_categories.includes(cat.value)
                      ? 'bg-primary border-primary'
                      : 'border-gray-500'
                  }`}>
                    {formData.sub_categories.includes(cat.value) && (
                      <Check className="w-3 h-3 text-black" />
                    )}
                  </div>
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-white">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category-Specific Fields */}
          {allCategories.includes('musician') && (
            <div className="bg-dark-400 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🎸</span> Musician Details
              </h2>
              
              <div className="mb-4">
                <label className="block text-gray-400 mb-2">Genre</label>
                <select
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select a genre</option>
                  {categoryOptions?.musician_options?.genres?.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-3">Instruments</label>
                <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                  {categoryOptions?.musician_options?.instruments?.map(inst => (
                    <div
                      key={inst}
                      onClick={() => toggleSelection('instruments', inst)}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer ${
                        formData.instruments.includes(inst)
                          ? 'bg-primary text-black'
                          : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        formData.instruments.includes(inst)
                          ? 'bg-black border-black'
                          : 'border-gray-500'
                      }`}>
                        {formData.instruments.includes(inst) && <Check className="w-3 h-3 text-primary" />}
                      </div>
                      {inst}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {allCategories.includes('audio_engineer') && (
            <div className="bg-dark-400 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🎚️</span> Audio Engineer Specializations
              </h2>
              <div className="max-h-64 overflow-y-auto grid grid-cols-1 gap-2">
                {categoryOptions?.audio_engineer_options?.specializations?.map(spec => (
                  <div
                    key={spec}
                    onClick={() => toggleSelection('specializations', spec)}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer ${
                      formData.specializations.includes(spec)
                        ? 'bg-primary text-black'
                        : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      formData.specializations.includes(spec)
                        ? 'bg-black border-black'
                        : 'border-gray-500'
                    }`}>
                      {formData.specializations.includes(spec) && <Check className="w-3 h-3 text-primary" />}
                    </div>
                    {spec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {allCategories.includes('recording_studio') && (
            <div className="bg-dark-400 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🎙️</span> Studio Offerings
              </h2>
              <div className="max-h-64 overflow-y-auto grid grid-cols-1 gap-2">
                {categoryOptions?.recording_studio_options?.offerings?.map(off => (
                  <div
                    key={off}
                    onClick={() => toggleSelection('studio_offerings', off)}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer ${
                      formData.studio_offerings.includes(off)
                        ? 'bg-primary text-black'
                        : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      formData.studio_offerings.includes(off)
                        ? 'bg-black border-black'
                        : 'border-gray-500'
                    }`}>
                      {formData.studio_offerings.includes(off) && <Check className="w-3 h-3 text-primary" />}
                    </div>
                    {off}
                  </div>
                ))}
              </div>
            </div>
          )}

          {allCategories.includes('venue') && (
            <div className="bg-dark-400 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🏟️</span> Venue Details
              </h2>
              
              <div className="mb-4">
                <label className="block text-gray-400 mb-2">Venue Name</label>
                <input
                  type="text"
                  value={formData.venue_name}
                  onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                  placeholder="Enter venue name"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 mb-2">City</label>
                <input
                  type="text"
                  value={formData.venue_city}
                  onChange={(e) => setFormData({ ...formData, venue_city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Capacity</label>
                <select
                  value={formData.venue_capacity}
                  onChange={(e) => setFormData({ ...formData, venue_capacity: e.target.value })}
                >
                  <option value="">Select capacity</option>
                  <option value="small">Small (under 100)</option>
                  <option value="medium">Medium (100-500)</option>
                  <option value="large">Large (500-2000)</option>
                  <option value="arena">Arena (2000+)</option>
                </select>
              </div>
            </div>
          )}

          {allCategories.includes('merchant') && (
            <div className="bg-dark-400 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🛍️</span> Merchant Details
              </h2>
              
              <div className="mb-4">
                <label className="block text-gray-400 mb-2">Business Name</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-3">Products You Sell</label>
                <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                  {categoryOptions?.merchant_options?.product_types?.map(product => (
                    <div
                      key={product}
                      onClick={() => toggleSelection('merchant_products', product)}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer ${
                        formData.merchant_products.includes(product)
                          ? 'bg-primary text-black'
                          : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        formData.merchant_products.includes(product)
                          ? 'bg-black border-black'
                          : 'border-gray-500'
                      }`}>
                        {formData.merchant_products.includes(product) && <Check className="w-3 h-3 text-primary" />}
                      </div>
                      {product}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex-1 py-3 flex items-center justify-center gap-2"
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

export default EditProfilePage;
