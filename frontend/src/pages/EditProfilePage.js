import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usersAPI, authAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Camera, Check, Save, X, User, Mail, Phone, Globe, Eye, EyeOff, MapPin, AlertTriangle, AtSign, Settings } from 'lucide-react';
import { COUNTRIES, getStatesForCountry, countryHasStates } from '../data/countries';

// Privacy toggle component
const PrivacyToggle = ({ label, checked, onChange, description, disabled }) => (
  <div className={`flex items-center justify-between p-3 bg-dark-300 rounded-lg ${disabled ? 'opacity-50' : ''}`}>
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
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-dark-200'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

// Physical Address Warning Modal
const PhysicalAddressWarningModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onCancel} />
      
      {/* Modal */}
      <div className="relative bg-dark-400 rounded-xl p-6 max-w-md w-full shadow-2xl border border-red-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Security Warning</h3>
        </div>
        
        <p className="text-gray-300 mb-4">
          Are you sure that you want to share your physical address on your profile?
        </p>
        
        <p className="text-gray-400 text-sm mb-4">
          If you select yes, you understand that the general public will be able to see your physical address.
        </p>
        
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm font-semibold mb-2">
            ⚠️ MicLocker STRONGLY urges people not to share this address if this is your home address.
          </p>
          <p className="text-gray-400 text-xs">
            By selecting this option, you understand that MicLocker and its affiliates are not responsible for any actions that are out of the control of MicLocker.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn bg-red-600 hover:bg-red-700 text-white flex-1"
          >
            I Understand, Show Address
          </button>
        </div>
      </div>
    </div>
  );
};

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, refreshUser, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const fileInputRef = useRef(null);
  const [categoryOptions, setCategoryOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPhysicalAddressWarning, setShowPhysicalAddressWarning] = useState(false);
  
  // Account settings state (email & password)
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
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
    comedian_specialties: [],
    actor_specialties: [],
    // Contact info
    phone: '',
    website: '',
    instagram: '',
    twitter: '',
    facebook: '',
    youtube: '',
    soundcloud: '',
    spotify: '',
    // Mailing address fields
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    // Physical address fields
    same_as_mailing: true,
    physical_address_line1: '',
    physical_address_line2: '',
    physical_city: '',
    physical_state: '',
    physical_postal_code: '',
    physical_country: '',
    // Privacy settings
    show_email: false,
    show_phone: false,
    show_address: false,
    show_social: true,
    show_physical_address: false,
  });

  const CATEGORY_OPTIONS = [
    { value: 'musician', label: 'Musician', icon: '🎸' },
    { value: 'audio_engineer', label: 'Audio Engineer', icon: '🎚️' },
    { value: 'recording_studio', label: 'Recording Studio', icon: '🎙️' },
    { value: 'venue', label: 'Venue', icon: '🏟️' },
    { value: 'merchant', label: 'Merchant', icon: '🛍️' },
    { value: 'comedian', label: 'Comedian', icon: '🎭' },
    { value: 'actor', label: 'Actor', icon: '🎬' },
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
        const physicalAddress = profile.physical_address || {};
        
        setFormData({
          username: profile.username || '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
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
          comedian_specialties: profile.comedian_specialties || [],
          actor_specialties: profile.actor_specialties || [],
          // Contact info
          phone: profile.phone || '',
          website: profile.website || '',
          instagram: profile.instagram || '',
          twitter: profile.twitter || '',
          facebook: profile.facebook || '',
          youtube: profile.youtube || '',
          soundcloud: profile.soundcloud || '',
          spotify: profile.spotify || '',
          // Mailing address fields from shipping_address
          address_line1: shippingAddress.address_line1 || '',
          address_line2: shippingAddress.address_line2 || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          postal_code: shippingAddress.postal_code || '',
          country: shippingAddress.country || '',
          // Physical address fields
          same_as_mailing: profile.same_as_mailing !== false,
          physical_address_line1: physicalAddress.address_line1 || '',
          physical_address_line2: physicalAddress.address_line2 || '',
          physical_city: physicalAddress.city || '',
          physical_state: physicalAddress.state || '',
          physical_postal_code: physicalAddress.postal_code || '',
          physical_country: physicalAddress.country || '',
          // Privacy settings
          show_email: profile.show_email || false,
          show_phone: profile.show_phone || false,
          show_address: profile.show_address || false,
          show_social: profile.show_social !== false,
          show_physical_address: profile.show_physical_address || false,
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

  // Handle show_address toggle with location conflict check
  const handleShowAddressToggle = () => {
    if (!formData.show_address && formData.location.trim()) {
      setError('You cannot show your mailing address while you have a Display Location set. This is for your protection and to keep other users from being confused. Please clear the Display Location field first.');
      setTimeout(() => setError(''), 8000);
      return;
    }
    setFormData({ ...formData, show_address: !formData.show_address });
  };

  // Handle show_physical_address toggle with warning modal
  const handleShowPhysicalAddressToggle = () => {
    if (!formData.show_physical_address) {
      // Show warning modal when enabling
      setShowPhysicalAddressWarning(true);
    } else {
      // No warning needed when disabling
      setFormData({ ...formData, show_physical_address: false });
    }
  };

  const confirmShowPhysicalAddress = () => {
    setFormData({ ...formData, show_physical_address: true });
    setShowPhysicalAddressWarning(false);
  };

  const cancelShowPhysicalAddress = () => {
    setShowPhysicalAddressWarning(false);
  };

  // Handle email change
  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    
    if (!emailForm.newEmail || !emailForm.password) {
      setEmailError('Please fill in all fields');
      return;
    }
    
    setSavingEmail(true);
    try {
      const response = await usersAPI.changeEmail({
        new_email: emailForm.newEmail,
        password: emailForm.password
      });
      setEmailSuccess('Email changed successfully!');
      setEmailForm({ newEmail: '', password: '' });
      if (refreshUser) refreshUser();
      setTimeout(() => setEmailSuccess(''), 5000);
    } catch (err) {
      setEmailError(err.response?.data?.detail || 'Failed to change email');
    } finally {
      setSavingEmail(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    setSavingPassword(true);
    try {
      await usersAPI.changePassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSavingPassword(false);
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
        // Map frontend names to backend names
        first_name: formData.firstName,
        last_name: formData.lastName,
        // Build shipping_address object
        shipping_address: formData.country ? {
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
        } : null,
        // Build physical_address object
        physical_address: formData.same_as_mailing 
          ? (formData.country ? {
              address_line1: formData.address_line1,
              address_line2: formData.address_line2,
              city: formData.city,
              state: formData.state,
              postal_code: formData.postal_code,
              country: formData.country,
            } : null)
          : (formData.physical_country ? {
              address_line1: formData.physical_address_line1,
              address_line2: formData.physical_address_line2,
              city: formData.physical_city,
              state: formData.physical_state,
              postal_code: formData.physical_postal_code,
              country: formData.physical_country,
            } : null),
      };
      
      // Remove individual address fields from root (they're in shipping_address/physical_address now)
      delete updateData.firstName;
      delete updateData.lastName;
      delete updateData.address_line1;
      delete updateData.address_line2;
      delete updateData.city;
      delete updateData.state;
      delete updateData.postal_code;
      delete updateData.country;
      delete updateData.physical_address_line1;
      delete updateData.physical_address_line2;
      delete updateData.physical_city;
      delete updateData.physical_state;
      delete updateData.physical_postal_code;
      delete updateData.physical_country;
      
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
  const states = getStatesForCountry(formData.country);
  const showStates = countryHasStates(formData.country);
  const physicalStates = getStatesForCountry(formData.physical_country);
  const showPhysicalStates = countryHasStates(formData.physical_country);

  // Check if display location conflicts with show_address
  const hasLocationConflict = formData.location.trim().length > 0;

  return (
    <div className="min-h-screen py-8 px-4" data-testid="edit-profile-page">
      {/* Physical Address Warning Modal */}
      <PhysicalAddressWarningModal
        isOpen={showPhysicalAddressWarning}
        onConfirm={confirmShowPhysicalAddress}
        onCancel={cancelShowPhysicalAddress}
      />

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Profile</h1>
          <button
            onClick={() => navigate(-1)}
            className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}
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
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Profile Picture</h2>
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
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Basic Information</h2>
            
            {/* Username */}
            <div className="mb-4">
              <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <AtSign className="w-4 h-4 inline mr-2" />
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') })}
                placeholder="username"
                data-testid="edit-username"
                className="w-full"
              />
              <p className="text-gray-500 text-xs mt-1">Only lowercase letters, numbers, underscores, dots, and hyphens allowed.</p>
            </div>

            {/* First Name and Last Name */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  data-testid="edit-first-name"
                />
              </div>
              <div>
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  data-testid="edit-last-name"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full"
              />
            </div>

            <div>
              <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Display Location (e.g., &quot;Nashville, TN&quot;)</label>
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
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <MapPin className="w-5 h-5" />
                  Mailing Address
                </h2>
                <p className="text-gray-500 text-sm">Required for buying, selling, or trading</p>
              </div>
            </div>

            {/* Country */}
            <div className="mb-4">
              <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Country</label>
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
                  <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Street Address</label>
                  <input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    placeholder="123 Main St"
                  />
                </div>

                {/* Address Line 2 */}
                <div className="mb-4">
                  <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Apt, Suite, Unit (optional)</label>
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
                    <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>

                  {/* State/Province */}
                  <div>
                    <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
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
                  <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
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

            {/* Show mailing address on profile toggle */}
            <div className="mt-4 pt-4 border-t border-dark-300">
              {hasLocationConflict && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                  <p className="text-yellow-400 text-xs">
                    ⚠️ You have a Display Location set. You cannot show your mailing address while Display Location is filled. This is for your protection.
                  </p>
                </div>
              )}
              <PrivacyToggle
                label="Show mailing address on public profile"
                description="Allow others to see your mailing address"
                checked={formData.show_address}
                onChange={handleShowAddressToggle}
                disabled={hasLocationConflict}
              />
            </div>
          </div>

          {/* Physical Address Section */}
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <MapPin className="w-5 h-5" />
                  Physical Address
                </h2>
                <p className="text-gray-500 text-sm">Your business or physical location</p>
              </div>
            </div>

            {/* Same as mailing checkbox */}
            <div 
              className="flex items-center gap-3 p-4 bg-dark-300 rounded-lg cursor-pointer mb-4 hover:bg-dark-200 transition-colors"
              onClick={() => setFormData({ ...formData, same_as_mailing: !formData.same_as_mailing })}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                formData.same_as_mailing ? 'bg-primary border-primary' : 'border-gray-500'
              }`}>
                {formData.same_as_mailing && <Check className="w-3 h-3 text-black" />}
              </div>
              <span className="text-white">Same as mailing address</span>
            </div>

            {/* Animated Physical Address Fields */}
            <div 
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                formData.same_as_mailing 
                  ? 'max-h-0 opacity-0' 
                  : 'max-h-[600px] opacity-100'
              }`}
            >
              <div className="pt-4 space-y-4">
                {/* Physical Country */}
                <div>
                  <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Country</label>
                  <select
                    value={formData.physical_country}
                    onChange={(e) => setFormData({ ...formData, physical_country: e.target.value, physical_state: '' })}
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

                {formData.physical_country && (
                  <>
                    {/* Physical Street Address */}
                    <div>
                      <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Street Address</label>
                      <input
                        type="text"
                        value={formData.physical_address_line1}
                        onChange={(e) => setFormData({ ...formData, physical_address_line1: e.target.value })}
                        placeholder="123 Main St"
                      />
                    </div>

                    {/* Physical Address Line 2 */}
                    <div>
                      <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Apt, Suite, Unit (optional)</label>
                      <input
                        type="text"
                        value={formData.physical_address_line2}
                        onChange={(e) => setFormData({ ...formData, physical_address_line2: e.target.value })}
                        placeholder="Apt 4B"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Physical City */}
                      <div>
                        <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>City</label>
                        <input
                          type="text"
                          value={formData.physical_city}
                          onChange={(e) => setFormData({ ...formData, physical_city: e.target.value })}
                          placeholder="City"
                        />
                      </div>

                      {/* Physical State */}
                      <div>
                        <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formData.physical_country === 'CA' ? 'Province' : 
                           formData.physical_country === 'AU' ? 'State/Territory' : 
                           formData.physical_country === 'JP' ? 'Prefecture' :
                           'State/Region'}
                        </label>
                        {showPhysicalStates ? (
                          <select
                            value={formData.physical_state}
                            onChange={(e) => setFormData({ ...formData, physical_state: e.target.value })}
                          >
                            <option value="">Select</option>
                            {physicalStates.map(state => (
                              <option key={state.code} value={state.code}>{state.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formData.physical_state}
                            onChange={(e) => setFormData({ ...formData, physical_state: e.target.value })}
                            placeholder="State or region"
                          />
                        )}
                      </div>
                    </div>

                    {/* Physical Postal Code */}
                    <div>
                      <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formData.physical_country === 'US' ? 'ZIP Code' : 'Postal Code'}
                      </label>
                      <input
                        type="text"
                        value={formData.physical_postal_code}
                        onChange={(e) => setFormData({ ...formData, physical_postal_code: e.target.value })}
                        placeholder={formData.physical_country === 'US' ? '12345' : 'Postal code'}
                        className="w-1/2"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Show physical address on profile toggle */}
            <div className="mt-4 pt-4 border-t border-dark-300">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                <p className="text-red-400 text-xs">
                  ⚠️ Enabling this will show your physical address publicly. Use caution if this is your home address.
                </p>
              </div>
              <PrivacyToggle
                label="Show physical address on public profile"
                description="Allow others to see your physical address with a map"
                checked={formData.show_physical_address}
                onChange={handleShowPhysicalAddressToggle}
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Contact Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
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
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
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
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Instagram</label>
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
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Twitter / X</label>
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
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Facebook</label>
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
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>YouTube</label>
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
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SoundCloud</label>
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
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Spotify Artist ID</label>
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
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Primary Category</h2>
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
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Secondary Categories</h2>
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
            <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span>🎸</span> Musician Details
              </h2>
              
              <div className="mb-4">
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Genre</label>
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
            <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
            <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
            <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span>🏟️</span> Venue Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Venue Name</label>
                  <input
                    type="text"
                    value={formData.venue_name}
                    onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                    placeholder="Enter venue name"
                  />
                </div>
                <div>
                  <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>City</label>
                  <input
                    type="text"
                    value={formData.venue_city}
                    onChange={(e) => setFormData({ ...formData, venue_city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
                <div>
                  <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Capacity</label>
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
            </div>
          )}

          {allCategories.includes('merchant') && (
            <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span>🛍️</span> Merchant Details
              </h2>
              <div className="mb-4">
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Business Name</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Enter business name"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-3">Product Types</label>
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

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Account Settings Section - Email & Password */}
        <div className={`mt-8 rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h2 className={`text-xl font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Settings className="w-5 h-5" />
            Account Settings
          </h2>
          
          {/* Change Email */}
          <div className="mb-8">
            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Change Email Address
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Current email: <span className="font-medium">{user?.email}</span>
            </p>
            
            {emailError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {emailError}
              </div>
            )}
            {emailSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                {emailSuccess}
              </div>
            )}
            
            <form onSubmit={handleEmailChange} className="space-y-4">
              <div>
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Mail className="w-4 h-4 inline mr-2" />
                  New Email Address
                </label>
                <input
                  type="email"
                  value={emailForm.newEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                  placeholder="new@email.com"
                  className="w-full"
                  data-testid="new-email-input"
                />
              </div>
              <div>
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Eye className="w-4 h-4 inline mr-2" />
                  Current Password
                </label>
                <input
                  type="password"
                  value={emailForm.password}
                  onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                  placeholder="Enter your password to confirm"
                  className="w-full"
                  data-testid="email-password-input"
                />
              </div>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={savingEmail}
              >
                {savingEmail ? 'Changing...' : 'Change Email'}
              </button>
            </form>
          </div>
          
          {/* Change Password */}
          <div className="pt-6 border-t border-dark-300">
            <h3 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Change Password
            </h3>
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                {passwordSuccess}
              </div>
            )}
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full"
                  data-testid="current-password-input"
                />
              </div>
              <div>
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter new password (min 8 characters)"
                  className="w-full"
                  data-testid="new-password-input"
                />
              </div>
              <div>
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full"
                  data-testid="confirm-password-input"
                />
              </div>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={savingPassword}
              >
                {savingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
