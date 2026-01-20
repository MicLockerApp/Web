import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import VinylLogo from '../components/VinylLogo';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Briefcase, Shield, Users } from 'lucide-react';

const EmployeeSetupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [userData, setUserData] = useState({ username: '', email: '', role: '' });
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !email) {
        setTokenValid(false);
        setTokenError('Invalid setup link. Please check the link in your email or contact your administrator.');
        setValidating(false);
        return;
      }
      
      try {
        const response = await authAPI.verifySetupToken(email, token);
        if (response.data.valid) {
          setTokenValid(true);
          setUserData({
            username: response.data.username,
            email: response.data.email,
            role: response.data.role
          });
        } else {
          setTokenValid(false);
          setTokenError(response.data.message || 'Invalid or expired setup link.');
        }
      } catch (err) {
        setTokenValid(false);
        setTokenError('Failed to verify setup link. Please try again or contact your administrator.');
      } finally {
        setValidating(false);
      }
    };
    
    validateToken();
  }, [token, email]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-5 h-5 text-red-400" />;
      case 'manager':
        return <Briefcase className="w-5 h-5 text-blue-400" />;
      default:
        return <Users className="w-5 h-5 text-green-400" />;
    }
  };

  const getRoleDisplay = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Manager';
      default:
        return 'Team Member';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await authAPI.setupEmployeePassword(email, token, newPassword);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to set password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <VinylLogo size={80} spinning={true} className="mx-auto mb-4" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Validating your setup link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Invalid Setup Link
          </h1>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {tokenError}
          </p>
          <Link to="/login" className="btn btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Account Setup Complete!
          </h1>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Your password has been set successfully. You will be redirected to login shortly.
          </p>
          <Link to="/login" className="btn btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Main setup form
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" data-testid="employee-setup-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <VinylLogo size={80} spinning={true} className="mx-auto mb-4" />
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Welcome to MicLocker!
          </h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Set up your password to access your team account
          </p>
        </div>

        <div className={`rounded-xl p-8 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
          {/* User Info Card */}
          <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-200' : 'bg-gray-200'}`}>
                <span className="text-primary text-xl font-bold">
                  {userData.username?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {userData.username}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {userData.email}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2 pt-3 border-t ${isDark ? 'border-dark-200' : 'border-gray-200'}`}>
              {getRoleIcon(userData.role)}
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Role: <strong>{getRoleDisplay(userData.role)}</strong>
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className={`block mb-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  className="pl-10 pr-10"
                  data-testid="setup-password"
                />
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className={`block mb-2 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Re-enter your password"
                  className="pl-10"
                  data-testid="setup-confirm-password"
                />
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-400 text-sm mt-1">Passwords do not match</p>
              )}
              {newPassword && newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-yellow-400 text-sm mt-1">Password must be at least 8 characters</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full py-3"
              disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
              data-testid="setup-submit-button"
            >
              {loading ? 'Setting up your account...' : 'Complete Setup'}
            </button>
          </form>

          <p className={`text-center text-sm mt-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSetupPage;
