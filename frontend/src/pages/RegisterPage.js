import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import VinylLogo from '../components/VinylLogo';
import { Check, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { COUNTRIES, getStatesForCountry, countryHasStates } from '../data/countries';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const [step, setStep] = useState(1);
  const [categoryOptions, setCategoryOptions] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    category: '',
    sub_categories: [],
    // Musician fields
    genres: [],
    instruments: [],
    // Audio Engineer fields
    specializations: [],
    // Recording Studio fields
    studio_offerings: [],
    // Venue fields
    venue_name: '',
    venue_city: '',
    venue_capacity: '',
    // Merchant fields
    merchant_products: [],
    business_name: '',
    // Contact info (Step 5)
    phone: '',
    // Mailing address
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    // Physical address
    same_as_mailing: true,
    physical_address_line1: '',
    physical_address_line2: '',
    physical_city: '',
    physical_state: '',
    physical_postal_code: '',
    physical_country: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const CATEGORY_OPTIONS = [
    { value: 'musician', label: 'Musician', icon: '🎸', description: 'Play instruments or sing' },
    { value: 'audio_engineer', label: 'Audio Engineer', icon: '🎚️', description: 'Mix, master, or produce audio' },
    { value: 'recording_studio', label: 'Recording Studio', icon: '🎙️', description: 'Own or operate a studio' },
    { value: 'venue', label: 'Venue', icon: '🏟️', description: 'Own or manage a music venue' },
    { value: 'merchant', label: 'Merchant', icon: '🛍️', description: 'Sell merchandise & apparel' },
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await authAPI.getCategories();
        setCategoryOptions(response.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const handleBasicSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      await login(formData.username, formData.password);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setStep(3);
  };

  const handleSubCategoriesSubmit = async (e) => {
    e.preventDefault();
    setStep(4);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    // Move to contact info step
    setStep(5);
  };

  const handleContactInfoSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const profileData = { 
        category: formData.category,
        sub_categories: formData.sub_categories.length > 0 ? formData.sub_categories : undefined
      };

      if (formData.category === 'musician' || formData.sub_categories.includes('musician')) {
        profileData.genres = formData.genres;
        profileData.instruments = formData.instruments;
      }
      if (formData.category === 'audio_engineer' || formData.sub_categories.includes('audio_engineer')) {
        profileData.specializations = formData.specializations;
      }
      if (formData.category === 'recording_studio' || formData.sub_categories.includes('recording_studio')) {
        profileData.studio_offerings = formData.studio_offerings;
      }
      if (formData.category === 'venue' || formData.sub_categories.includes('venue')) {
        profileData.venue_name = formData.venue_name;
        profileData.venue_city = formData.venue_city;
        profileData.venue_capacity = formData.venue_capacity;
      }
      if (formData.category === 'merchant' || formData.sub_categories.includes('merchant')) {
        profileData.merchant_products = formData.merchant_products;
        profileData.business_name = formData.business_name;
      }

      // Add contact info if provided
      if (formData.phone) profileData.phone = formData.phone;
      
      // Add mailing/shipping address
      if (formData.address_line1) {
        profileData.shipping_address = {
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || '',
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
        };
      }

      // Add physical address
      profileData.same_as_mailing = formData.same_as_mailing;
      if (formData.same_as_mailing && formData.address_line1) {
        // Physical is same as mailing
        profileData.physical_address = {
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || '',
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
        };
      } else if (!formData.same_as_mailing && formData.physical_address_line1) {
        // Physical is different
        profileData.physical_address = {
          address_line1: formData.physical_address_line1,
          address_line2: formData.physical_address_line2 || '',
          city: formData.physical_city,
          state: formData.physical_state,
          postal_code: formData.physical_postal_code,
          country: formData.physical_country,
        };
      }

      await authAPI.completeProfile(profileData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (field, value, e) => {
    // Prevent scroll
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFormData(prev => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const toggleSubCategory = (value, e) => {
    // Prevent scroll
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (value === formData.category) return; // Can't select main category as sub
    setFormData(prev => {
      const current = prev.sub_categories || [];
      if (current.includes(value)) {
        return { ...prev, sub_categories: current.filter(v => v !== value) };
      } else {
        return { ...prev, sub_categories: [...current, value] };
      }
    });
  };

  const renderStep1 = () => (
    <form onSubmit={handleBasicSubmit}>
      <div className="mb-6">
        <label className="block text-gray-400 mb-2">Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
          autoFocus
          minLength={3}
          data-testid="register-username"
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-400 mb-2">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          data-testid="register-email"
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-400 mb-2">Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={6}
          data-testid="register-password"
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-400 mb-2">Confirm Password</label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          data-testid="register-confirm-password"
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary w-full py-3"
        disabled={loading}
        data-testid="register-submit"
      >
        {loading ? 'Creating Account...' : 'Continue'}
        <ChevronRight className="w-4 h-4 inline ml-1" />
      </button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleCategorySubmit}>
      <p className="text-gray-400 mb-6">What best describes you?</p>
      <div className="space-y-3 mb-6">
        {CATEGORY_OPTIONS.map(cat => (
          <div
            key={cat.value}
            onClick={() => setFormData({ ...formData, category: cat.value })}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              formData.category === cat.value
                ? 'border-primary bg-primary/10'
                : 'border-dark-300 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <h3 className="text-white font-medium">{cat.label}</h3>
                <p className="text-gray-500 text-sm">{cat.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="btn btn-secondary py-3 px-4"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="submit"
          className="btn btn-primary flex-1 py-3"
          disabled={!formData.category}
        >
          Continue <ChevronRight className="w-4 h-4 inline ml-1" />
        </button>
      </div>
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={handleSubCategoriesSubmit}>
      <p className="text-gray-400 mb-4">Do you wear multiple hats? Select any additional categories that apply to you.</p>
      <p className="text-gray-500 text-sm mb-6">This is optional but helps you connect with the right community.</p>
      
      <div className="space-y-3 mb-6">
        {CATEGORY_OPTIONS.filter(cat => cat.value !== formData.category).map(cat => (
          <div
            key={cat.value}
            onClick={(e) => toggleSubCategory(cat.value, e)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              formData.sub_categories.includes(cat.value)
                ? 'border-primary bg-primary/10'
                : 'border-dark-300 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
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
              <div>
                <h3 className="text-white font-medium">{cat.label}</h3>
                <p className="text-gray-500 text-sm">{cat.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="btn btn-secondary py-3 px-4"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button type="submit" className="btn btn-primary flex-1 py-3">
          Continue <ChevronRight className="w-4 h-4 inline ml-1" />
        </button>
      </div>
    </form>
  );

  const renderStep4 = () => {
    const allCategories = [formData.category, ...formData.sub_categories].filter(Boolean);

    return (
      <form onSubmit={handleFinalSubmit}>
        {/* Musician Section */}
        {allCategories.includes('musician') && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🎸</span> Musician Details
            </h3>
            <p className="text-gray-500 text-sm mb-3">Select your genres (multiple allowed)</p>
            <div className="mb-4 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 p-1">
              {categoryOptions?.musician_options?.genres?.map(g => (
                <div
                  key={g}
                  onClick={(e) => toggleSelection('genres', g, e)}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer ${
                    formData.genres.includes(g)
                      ? 'bg-primary text-black'
                      : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                    formData.genres.includes(g)
                      ? 'bg-black border-black'
                      : 'border-gray-500'
                  }`}>
                    {formData.genres.includes(g) && <Check className="w-3 h-3 text-primary" />}
                  </div>
                  {g}
                </div>
              ))}
            </div>

            <p className="text-gray-500 text-sm mb-3">Select your instruments</p>
            <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2 p-1">
              {categoryOptions?.musician_options?.instruments?.map(inst => (
                <div
                  key={inst}
                  onClick={(e) => toggleSelection('instruments', inst, e)}
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
        )}

        {/* Audio Engineer Section */}
        {allCategories.includes('audio_engineer') && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🎚️</span> Audio Engineer Specializations
            </h3>
            <p className="text-gray-500 text-sm mb-3">Select all that apply</p>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 gap-2 p-1">
              {categoryOptions?.audio_engineer_options?.specializations?.map(spec => (
                <div
                  key={spec}
                  onClick={(e) => toggleSelection('specializations', spec, e)}
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

        {/* Recording Studio Section */}
        {allCategories.includes('recording_studio') && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🎙️</span> Studio Offerings
            </h3>
            <p className="text-gray-500 text-sm mb-3">Select all services you offer</p>
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 gap-2 p-1">
              {categoryOptions?.recording_studio_options?.offerings?.map(off => (
                <div
                  key={off}
                  onClick={(e) => toggleSelection('studio_offerings', off, e)}
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

        {/* Venue Section */}
        {allCategories.includes('venue') && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🏟️</span> Venue Details
            </h3>
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
              <label className="block text-gray-400 mb-2">Capacity (optional)</label>
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

        {/* Merchant Section */}
        {allCategories.includes('merchant') && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🛍️</span> Merchant Details
            </h3>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Business Name (optional)</label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Enter your business name"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-3">What products do you sell? (Select all that apply)</label>
              <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2 p-1">
                {categoryOptions?.merchant_options?.product_types?.map(product => (
                  <div
                    key={product}
                    onClick={(e) => toggleSelection('merchant_products', product, e)}
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="btn btn-secondary py-3 px-4"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="submit" className="btn btn-primary flex-1 py-3" disabled={loading}>
            Continue <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>
      </form>
    );
  };

  const renderStep5 = () => {
    const states = getStatesForCountry(formData.country);
    const showStates = countryHasStates(formData.country);
    const physicalStates = getStatesForCountry(formData.physical_country);
    const showPhysicalStates = countryHasStates(formData.physical_country);

    return (
      <form onSubmit={handleContactInfoSubmit}>
        {/* Info Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-300 text-sm">
              <strong className="text-white">This information is optional</strong>, but will be needed if you plan on buying, selling, or trading on the platform.
            </p>
          </div>
        </div>

        {/* Phone Number */}
        <div className="mb-6">
          <label className="block text-gray-400 mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
            data-testid="register-phone"
          />
          <p className="text-gray-500 text-xs mt-1">Include country code for international numbers</p>
        </div>

        <div className="border-t border-dark-300 my-6 pt-6">
          <h3 className="text-white font-semibold mb-4">Mailing Address</h3>

          {/* Country */}
          <div className="mb-4">
            <label className="block text-gray-400 mb-2">Country</label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value, state: '' })}
              data-testid="register-country"
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

          {/* Address Line 1 */}
          <div className="mb-4">
            <label className="block text-gray-400 mb-2">Street Address</label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="123 Main St"
              data-testid="register-address1"
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
              data-testid="register-address2"
            />
          </div>

          {/* City */}
          <div className="mb-4">
            <label className="block text-gray-400 mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              data-testid="register-city"
            />
          </div>

          {/* State/Province - only show if country has states */}
          {showStates && (
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">
                {formData.country === 'CA' ? 'Province' : 
                 formData.country === 'AU' ? 'State/Territory' : 
                 formData.country === 'JP' ? 'Prefecture' :
                 'State/Region'}
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                data-testid="register-state"
              >
                <option value="">Select {formData.country === 'CA' ? 'province' : 'state'}</option>
                {states.map(state => (
                  <option key={state.code} value={state.code}>{state.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* State text input for countries without dropdown */}
          {formData.country && !showStates && (
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">State/Province/Region (optional)</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State or region"
                data-testid="register-state-text"
              />
            </div>
          )}

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
              data-testid="register-postal"
            />
          </div>
        </div>

        {/* Physical Address Section */}
        <div className="border-t border-dark-300 my-6 pt-6">
          <h3 className="text-white font-semibold mb-4">Physical Address</h3>
          
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
                <label className="block text-gray-400 mb-2">Country</label>
                <select
                  value={formData.physical_country}
                  onChange={(e) => setFormData({ ...formData, physical_country: e.target.value, physical_state: '' })}
                  data-testid="register-physical-country"
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

              {/* Physical Street Address */}
              <div>
                <label className="block text-gray-400 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.physical_address_line1}
                  onChange={(e) => setFormData({ ...formData, physical_address_line1: e.target.value })}
                  placeholder="123 Main St"
                  data-testid="register-physical-address1"
                />
              </div>

              {/* Physical Address Line 2 */}
              <div>
                <label className="block text-gray-400 mb-2">Apt, Suite, Unit (optional)</label>
                <input
                  type="text"
                  value={formData.physical_address_line2}
                  onChange={(e) => setFormData({ ...formData, physical_address_line2: e.target.value })}
                  placeholder="Apt 4B"
                  data-testid="register-physical-address2"
                />
              </div>

              {/* Physical City */}
              <div>
                <label className="block text-gray-400 mb-2">City</label>
                <input
                  type="text"
                  value={formData.physical_city}
                  onChange={(e) => setFormData({ ...formData, physical_city: e.target.value })}
                  placeholder="City"
                  data-testid="register-physical-city"
                />
              </div>

              {/* Physical State - dropdown or text */}
              {showPhysicalStates && (
                <div>
                  <label className="block text-gray-400 mb-2">
                    {formData.physical_country === 'CA' ? 'Province' : 
                     formData.physical_country === 'AU' ? 'State/Territory' : 
                     formData.physical_country === 'JP' ? 'Prefecture' :
                     'State/Region'}
                  </label>
                  <select
                    value={formData.physical_state}
                    onChange={(e) => setFormData({ ...formData, physical_state: e.target.value })}
                    data-testid="register-physical-state"
                  >
                    <option value="">Select {formData.physical_country === 'CA' ? 'province' : 'state'}</option>
                    {physicalStates.map(state => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.physical_country && !showPhysicalStates && (
                <div>
                  <label className="block text-gray-400 mb-2">State/Province/Region (optional)</label>
                  <input
                    type="text"
                    value={formData.physical_state}
                    onChange={(e) => setFormData({ ...formData, physical_state: e.target.value })}
                    placeholder="State or region"
                    data-testid="register-physical-state-text"
                  />
                </div>
              )}

              {/* Physical Postal Code */}
              <div>
                <label className="block text-gray-400 mb-2">
                  {formData.physical_country === 'US' ? 'ZIP Code' : 'Postal Code'}
                </label>
                <input
                  type="text"
                  value={formData.physical_postal_code}
                  onChange={(e) => setFormData({ ...formData, physical_postal_code: e.target.value })}
                  placeholder={formData.physical_country === 'US' ? '12345' : 'Postal code'}
                  data-testid="register-physical-postal"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(4)}
            className="btn btn-secondary py-3 px-4"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="submit" className="btn btn-primary flex-1 py-3" disabled={loading}>
            {loading ? 'Completing...' : 'Complete Registration'}
          </button>
        </div>

        {/* Skip option */}
        <button
          type="button"
          onClick={() => {
            setFormData(prev => ({
              ...prev,
              phone: '',
              address_line1: '',
              address_line2: '',
              city: '',
              state: '',
              postal_code: '',
              country: '',
              same_as_mailing: true,
              physical_address_line1: '',
              physical_address_line2: '',
              physical_city: '',
              physical_state: '',
              physical_postal_code: '',
              physical_country: '',
            }));
            handleContactInfoSubmit(new Event('submit'));
          }}
          className="w-full mt-4 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Skip for now
        </button>
      </form>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" data-testid="register-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <VinylLogo size={80} spinning={true} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 mt-2">
            {step === 1 && 'Join the MicLocker community'}
            {step === 2 && 'Choose your primary category'}
            {step === 3 && 'Add secondary categories (optional)'}
            {step === 4 && 'Tell us more about yourself'}
            {step === 5 && 'Contact & shipping information'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map(s => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-all ${
                s === step ? 'bg-primary scale-110' : s < step ? 'bg-primary/50' : 'bg-dark-300'
              }`}
            />
          ))}
        </div>

        <div className="bg-dark-400 rounded-xl p-8 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>

        {step === 1 && (
          <p className="text-center text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
