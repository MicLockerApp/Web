import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import VinylLogo from '../components/VinylLogo';
import { Check, ChevronRight, ChevronLeft, Info, Mail, AlertCircle } from 'lucide-react';
import { COUNTRIES, getStatesForCountry, countryHasStates } from '../data/countries';
import analytics from '../services/analytics';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();
  const [step, setStep] = useState(1);
  const [categoryOptions, setCategoryOptions] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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
  
  // Email verification state
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

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

  // Focus first code input when entering verification step
  useEffect(() => {
    if (step === 2 && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [step]);

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

  // Step 1: Validate credentials and send verification email
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
      // Send verification email
      await authAPI.sendVerification({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim()
      });
      
      // Move to email verification step
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code input
  const handleCodeChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError('');
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6);
        const newCode = [...verificationCode];
        digits.split('').forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setVerificationCode(newCode);
        if (digits.length > 0) {
          inputRefs.current[Math.min(digits.length, 5)]?.focus();
        }
      });
    }
  };

  // Step 2: Verify email and create account
  const handleVerifyEmail = async () => {
    const fullCode = verificationCode.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyEmail({
        email: formData.email,
        code: fullCode
      });
      
      // Account created successfully - store token and user
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(access_token);
      setUser(user);
      
      // Move to category selection (step 3)
      setStep(3);
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid verification code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setResending(true);
    setError('');
    
    try {
      await authAPI.resendVerification({ email: formData.email });
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setStep(4); // Go to sub-categories
  };

  const handleSubCategoriesSubmit = async (e) => {
    e.preventDefault();
    setStep(5); // Go to category details
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
      
      // Track user registered event
      analytics.userRegistered(formData.category);
      
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
          placeholder="john@example.com"
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

  // Step 2: Email Verification
  const renderStep2 = () => (
    <div>
      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 rounded-lg mb-6 bg-blue-500/10 border border-blue-500/20">
        <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">Check your inbox!</p>
          <p className="text-blue-400">
            We&apos;ve sent a 6-digit verification code to <strong className="text-white">{formData.email}</strong>. 
            Don&apos;t forget to check your <strong>spam folder</strong>. The code expires in 15 minutes.
          </p>
        </div>
      </div>

      {/* Code Input Boxes */}
      <div className="flex justify-center gap-2 mb-6">
        {verificationCode.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 transition-all
              bg-dark-300 border-dark-200 text-white focus:border-primary
              focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid={`verification-code-${index}`}
          />
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="btn btn-secondary py-3 px-4"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleVerifyEmail}
          className="btn btn-primary flex-1 py-3"
          disabled={loading || verificationCode.some(d => !d)}
          data-testid="verify-email-button"
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={handleResendCode}
          disabled={resending}
          className="text-sm text-gray-400 hover:text-primary transition-colors"
        >
          {resending ? 'Sending...' : "Didn't receive a code? Resend"}
        </button>
      </div>
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
            onClick={() => setStep(5)}
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
      case 2: return 'Verify your email';
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
          {[1, 2, 3, 4, 5, 6].map(s => (
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
