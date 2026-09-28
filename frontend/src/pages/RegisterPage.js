import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, usersAPI } from '../services/api';
import VinylLogo from '../components/VinylLogo';
import { Check, ChevronRight, ChevronLeft, Info, AlertCircle } from 'lucide-react';
import { COUNTRIES, getStatesForCountry, countryHasStates } from '../data/countries';
import analytics from '../services/analytics';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loadUser } = useAuth();
  const [step, setStep] = useState(1);
  // The app backend creates the account on step 1; later steps fill in the profile.
  const [accountCreated, setAccountCreated] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
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
    // Comedian fields
    comedian_specialties: [],
    // Actor fields
    actor_specialties: [],
    // Contact info (Step 6)
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
    { value: 'artist', label: 'Artist', icon: '🎤', description: 'Recording or performing artist' },
    { value: 'audio_engineer', label: 'Audio Engineer', icon: '🎚️', description: 'Mix, master, or produce audio' },
    { value: 'studio', label: 'Recording Studio', icon: '🎙️', description: 'Own or operate a studio' },
    { value: 'venue', label: 'Venue', icon: '🏟️', description: 'Own or manage a music venue' },
    { value: 'promoter', label: 'Promoter', icon: '📣', description: 'Promote shows and events' },
    { value: 'manager', label: 'Manager', icon: '📋', description: 'Manage artists or talent' },
    { value: 'show_pro', label: 'Show Pro', icon: '🎛️', description: 'Stage, lighting, and production crew' },
    { value: 'photographer', label: 'Photographer', icon: '📷', description: 'Shoot artists, shows, and events' },
    { value: 'videographer', label: 'Videographer', icon: '🎥', description: 'Film videos, shows, and content' },
    { value: 'merchant', label: 'Merchant', icon: '🛍️', description: 'Sell merchandise & apparel' },
    { value: 'services', label: 'Services', icon: '🧰', description: 'Offer services to the industry' },
    { value: 'comedian', label: 'Comedian', icon: '🎭', description: 'Perform comedy shows or acts' },
    { value: 'actor', label: 'Actor', icon: '🎬', description: 'Act in film, TV, or theater' },
    { value: 'public_speaker', label: 'Public Speaker', icon: '🗣️', description: 'Speak at events and conferences' },
    { value: 'church', label: 'Church', icon: '⛪', description: 'Worship teams and ministries' },
    { value: 'tattoo_artist', label: 'Tattoo Artist', icon: '🖋️', description: 'Tattoo and body art' },
    { value: 'hair', label: 'Hair', icon: '💇', description: 'Hair styling for artists and shows' },
    { value: 'makeup', label: 'Makeup', icon: '💄', description: 'Makeup for artists, shoots, and shows' },
  ];

  // Signed-in accounts that haven't finished setup resume where they left off.
  useEffect(() => {
    if (isAuthenticated && user && step === 1) {
      setAccountCreated(true);
      setFormData(prev => ({
        ...prev,
        firstName: user.first_name || prev.firstName,
        lastName: user.last_name || prev.lastName,
        username: user.handle || prev.username,
        email: user.email || prev.email,
      }));
      setStep(user.terms_accepted_at ? 3 : 2);
    }
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Helper function to extract error message
  const getErrorMessage = (err, defaultMsg) => {
    const errorData = err.response?.data?.detail;
    if (typeof errorData === 'string') {
      return errorData;
    } else if (Array.isArray(errorData) && errorData.length > 0) {
      return errorData[0]?.msg || defaultMsg;
    } else if (errorData?.msg) {
      return errorData.msg;
    }
    return defaultMsg;
  };

  // Step 1: Create the account, then claim the username
  const handleBasicSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName.trim()) {
      setError('First name is required');
      return;
    }

    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return;
    }

    if (!accountCreated) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (!formData.dateOfBirth) {
        setError('Date of birth is required');
        return;
      }
    }

    setLoading(true);
    try {
      if (!accountCreated) {
        await authAPI.register({
          email: formData.email.trim(),
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          date_of_birth: formData.dateOfBirth,
          password: formData.password,
        });
        setAccountCreated(true);
      }
      await usersAPI.updateProfile({ handle: formData.username.trim().replace(/^@/, '').toLowerCase() });
      await loadUser();
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err, accountCreated
        ? 'That username could not be saved. Please try another.'
        : 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Accept the Terms of Service (required, same as the apps)
  const handleAcceptTerms = async () => {
    setLoading(true);
    setError('');
    try {
      await authAPI.acceptTerms();
      await loadUser();
      setStep(3);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your acceptance. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setStep(4); // Go to sub-categories
  };

  const handleSubCategoriesSubmit = async (e) => {
    e.preventDefault();
    setStep(6); // No category-details step on the app backend; go to contact info
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    // Move to contact info step
    setStep(6); // Go to contact info
  };

  const handleContactInfoSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const profileData = {
        category: formData.category,
        sub_categories: formData.sub_categories,
      };
      if (formData.phone) profileData.phone_number = formData.phone;

      // The app stores one physical address plus an optional separate mailing address.
      const mailing = formData.address_line1 ? {
        street: formData.address_line1, apt: formData.address_line2 || null,
        city: formData.city, state: formData.state, zip: formData.postal_code,
      } : null;
      const physical = formData.same_as_mailing ? mailing : (formData.physical_address_line1 ? {
        street: formData.physical_address_line1, apt: formData.physical_address_line2 || null,
        city: formData.physical_city, state: formData.physical_state, zip: formData.physical_postal_code,
      } : null);
      if (physical) {
        Object.assign(profileData, {
          address_street: physical.street, address_apartment: physical.apt,
          address_city: physical.city, address_state: physical.state, address_zipcode: physical.zip,
        });
      }
      if (mailing) {
        profileData.mailing_same_as_physical = !!formData.same_as_mailing;
        if (!formData.same_as_mailing) {
          Object.assign(profileData, {
            mailing_address_street: mailing.street, mailing_address_apartment: mailing.apt,
            mailing_address_city: mailing.city, mailing_address_state: mailing.state, mailing_address_zipcode: mailing.zip,
          });
        }
      }

      await usersAPI.updateProfile(profileData);
      await loadUser();
      
      // Track user registered event
      analytics.userRegistered(formData.category);
      
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to complete profile'));
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
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 mb-2">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
            autoFocus
            placeholder="John"
            data-testid="register-first-name"
          />
        </div>
        <div>
          <label className="block text-gray-400 mb-2">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            placeholder="Doe"
            data-testid="register-last-name"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-gray-400 mb-2">Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
          minLength={3}
          placeholder="johndoe123"
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
          disabled={accountCreated}
          placeholder="john@example.com"
          data-testid="register-email"
        />
      </div>

      {!accountCreated && (
      <div className="mb-6">
        <label className="block text-gray-400 mb-2">Date of Birth</label>
        <input
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          required
          max={new Date().toISOString().slice(0, 10)}
          data-testid="register-dob"
        />
        <p className="text-gray-500 text-xs mt-1">You must be 13 or older to use MicLocker.</p>
      </div>
      )}

      {!accountCreated && (<>
      <div className="mb-6">
        <label className="block text-gray-400 mb-2">Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={8}
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
      </>)}

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

  // Step 2: Terms of Service
  const renderStep2 = () => (
    <div>
      <div className="flex items-start gap-3 p-4 rounded-lg mb-6 bg-blue-500/10 border border-blue-500/20">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">One last thing before you start</p>
          <p className="text-blue-400">
            Please read and accept the MicLocker{' '}
            <Link to="/legal/terms-of-use" target="_blank" className="text-white underline">Terms of Use</Link>
            {' '}and{' '}
            <Link to="/legal/privacy-policy" target="_blank" className="text-white underline">Privacy Policy</Link>.
            You need to accept them to use MicLocker.
          </p>
        </div>
      </div>

      <button
        onClick={handleAcceptTerms}
        className="btn btn-primary w-full py-3"
        disabled={loading}
        data-testid="accept-terms-button"
      >
        {loading ? 'Saving...' : 'I Agree'}
      </button>
    </div>
  );

  // Step 3: Category Selection
  const renderStep3 = () => (
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

      <button
        type="submit"
        className="btn btn-primary w-full py-3"
        disabled={!formData.category}
      >
        Continue <ChevronRight className="w-4 h-4 inline ml-1" />
      </button>
    </form>
  );

  // Step 4: Sub-categories
  const renderStep4 = () => (
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
          onClick={() => setStep(3)}
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

  // Step 5: Category Details
  const renderStep5 = () => {
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

        {/* Comedian Section */}
        {allCategories.includes('comedian') && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🎭</span> Comedy Specialties
            </h3>
            <p className="text-gray-500 text-sm mb-3">Select your comedy styles (multiple allowed)</p>
            <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2 p-1">
              {categoryOptions?.comedian_options?.specialties?.map(specialty => (
                <div
                  key={specialty}
                  onClick={(e) => toggleSelection('comedian_specialties', specialty, e)}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer ${
                    formData.comedian_specialties.includes(specialty)
                      ? 'bg-primary text-black'
                      : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                    formData.comedian_specialties.includes(specialty)
                      ? 'bg-black border-black'
                      : 'border-gray-500'
                  }`}>
                    {formData.comedian_specialties.includes(specialty) && <Check className="w-3 h-3 text-primary" />}
                  </div>
                  {specialty}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actor Section */}
        {allCategories.includes('actor') && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🎬</span> Acting Specialties
            </h3>
            <p className="text-gray-500 text-sm mb-3">Select your acting specialties (multiple allowed)</p>
            <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2 p-1">
              {categoryOptions?.actor_options?.specialties?.map(specialty => (
                <div
                  key={specialty}
                  onClick={(e) => toggleSelection('actor_specialties', specialty, e)}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer ${
                    formData.actor_specialties.includes(specialty)
                      ? 'bg-primary text-black'
                      : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                    formData.actor_specialties.includes(specialty)
                      ? 'bg-black border-black'
                      : 'border-gray-500'
                  }`}>
                    {formData.actor_specialties.includes(specialty) && <Check className="w-3 h-3 text-primary" />}
                  </div>
                  {specialty}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(4)}
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

  // Step 6: Contact Info
  const renderStep6 = () => {
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

  // Get step labels for progress indicator (6 steps with email verification)
  const getStepLabel = () => {
    switch (step) {
      case 1: return 'Create your account';
      case 2: return 'Accept the Terms of Use';
      case 3: return 'Choose your primary category';
      case 4: return 'Add secondary categories (optional)';
      case 5: return 'Tell us more about yourself';
      case 6: return 'Contact & shipping information';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" data-testid="register-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <VinylLogo size={80} spinning={true} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 mt-2">{getStepLabel()}</p>
        </div>

        {/* Progress - 6 steps with email verification */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 6].map(s => (
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
            <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
          {step === 6 && renderStep6()}
        </div>

        {step === 1 && !accountCreated && (
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
