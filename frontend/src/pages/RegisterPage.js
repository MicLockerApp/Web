import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import VinylLogo from '../components/VinylLogo';
import { Check } from 'lucide-react';

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
    // Musician fields
    genre: '',
    instruments: [],
    // Audio Engineer fields
    specializations: [],
    // Recording Studio fields
    studio_offerings: [],
    // Venue fields
    venue_name: '',
    venue_city: '',
    venue_capacity: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const profileData = { category: formData.category };

      if (formData.category === 'musician') {
        profileData.genre = formData.genre;
        profileData.instruments = formData.instruments;
      } else if (formData.category === 'audio_engineer') {
        profileData.specializations = formData.specializations;
      } else if (formData.category === 'recording_studio') {
        profileData.studio_offerings = formData.studio_offerings;
      } else if (formData.category === 'venue') {
        profileData.venue_name = formData.venue_name;
        profileData.venue_city = formData.venue_city;
        profileData.venue_capacity = formData.venue_capacity;
      }

      await authAPI.completeProfile(profileData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete profile');
    } finally {
      setLoading(false);
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
      </button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleCategorySubmit}>
      <p className="text-gray-400 mb-6">What best describes you?</p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { value: 'musician', label: 'Musician', icon: '🎸' },
          { value: 'audio_engineer', label: 'Audio Engineer', icon: '🎚️' },
          { value: 'recording_studio', label: 'Recording Studio', icon: '🎙️' },
          { value: 'venue', label: 'Venue', icon: '🏟️' },
        ].map(cat => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setFormData({ ...formData, category: cat.value })}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              formData.category === cat.value
                ? 'border-primary bg-primary/10'
                : 'border-dark-300 hover:border-gray-600'
            }`}
            data-testid={`category-${cat.value}`}
          >
            <span className="text-3xl block mb-2">{cat.icon}</span>
            <span className="text-white">{cat.label}</span>
          </button>
        ))}
      </div>

      <button
        type="submit"
        className="btn btn-primary w-full py-3"
        disabled={!formData.category}
      >
        Continue
      </button>
    </form>
  );

  const renderStep3 = () => {
    if (formData.category === 'musician') {
      return (
        <form onSubmit={handleFinalSubmit}>
          <div className="mb-6">
            <label className="block text-gray-400 mb-2">What genre of music do you play?</label>
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

          <div className="mb-6">
            <label className="block text-gray-400 mb-3">Select your instruments</label>
            <div className="max-h-64 overflow-y-auto grid grid-cols-2 gap-2">
              {categoryOptions?.musician_options?.instruments?.map(inst => (
                <button
                  key={inst}
                  type="button"
                  onClick={() => toggleSelection('instruments', inst)}
                  className={`px-3 py-2 rounded-lg text-sm text-left flex items-center gap-2 ${
                    formData.instruments.includes(inst)
                      ? 'bg-primary text-black'
                      : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                  }`}
                >
                  {formData.instruments.includes(inst) && <Check className="w-4 h-4" />}
                  {inst}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Completing...' : 'Complete Profile'}
          </button>
        </form>
      );
    }

    if (formData.category === 'audio_engineer') {
      return (
        <form onSubmit={handleFinalSubmit}>
          <div className="mb-6">
            <label className="block text-gray-400 mb-3">Select your specializations</label>
            <div className="max-h-64 overflow-y-auto grid grid-cols-1 gap-2">
              {categoryOptions?.audio_engineer_options?.specializations?.map(spec => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSelection('specializations', spec)}
                  className={`px-3 py-2 rounded-lg text-sm text-left flex items-center gap-2 ${
                    formData.specializations.includes(spec)
                      ? 'bg-primary text-black'
                      : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                  }`}
                >
                  {formData.specializations.includes(spec) && <Check className="w-4 h-4" />}
                  {spec}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Completing...' : 'Complete Profile'}
          </button>
        </form>
      );
    }

    if (formData.category === 'recording_studio') {
      return (
        <form onSubmit={handleFinalSubmit}>
          <div className="mb-6">
            <label className="block text-gray-400 mb-3">Select your offerings</label>
            <div className="max-h-64 overflow-y-auto grid grid-cols-1 gap-2">
              {categoryOptions?.recording_studio_options?.offerings?.map(off => (
                <button
                  key={off}
                  type="button"
                  onClick={() => toggleSelection('studio_offerings', off)}
                  className={`px-3 py-2 rounded-lg text-sm text-left flex items-center gap-2 ${
                    formData.studio_offerings.includes(off)
                      ? 'bg-primary text-black'
                      : 'bg-dark-300 text-gray-300 hover:bg-dark-200'
                  }`}
                >
                  {formData.studio_offerings.includes(off) && <Check className="w-4 h-4" />}
                  {off}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Completing...' : 'Complete Profile'}
          </button>
        </form>
      );
    }

    if (formData.category === 'venue') {
      return (
        <form onSubmit={handleFinalSubmit}>
          <div className="mb-6">
            <label className="block text-gray-400 mb-2">Venue Name</label>
            <input
              type="text"
              value={formData.venue_name}
              onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-400 mb-2">City</label>
            <input
              type="text"
              value={formData.venue_city}
              onChange={(e) => setFormData({ ...formData, venue_city: e.target.value })}
            />
          </div>

          <div className="mb-6">
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

          <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Completing...' : 'Complete Profile'}
          </button>
        </form>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" data-testid="register-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <VinylLogo size={80} spinning={true} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 mt-2">
            {step === 1 && 'Join the MicLocker community'}
            {step === 2 && 'Tell us about yourself'}
            {step === 3 && 'Almost done!'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full ${
                s === step ? 'bg-primary' : s < step ? 'bg-primary/50' : 'bg-dark-300'
              }`}
            />
          ))}
        </div>

        <div className="bg-dark-400 rounded-xl p-8">
          {error && (
            <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
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
