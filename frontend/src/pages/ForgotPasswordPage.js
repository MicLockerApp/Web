import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import VinylLogo from '../components/VinylLogo';
import { Mail, ArrowLeft } from 'lucide-react';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.requestPasswordReset(email);
      // Navigate to verification page with email
      navigate('/forgot-password/verify', { state: { email } });
    } catch (err) {
      // Handle validation errors which come as array of objects
      const errorData = err.response?.data?.detail;
      let errorMessage = 'Failed to send reset code. Please try again.';
      
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (Array.isArray(errorData) && errorData.length > 0) {
        // Pydantic validation error - extract the message
        errorMessage = errorData[0]?.msg || errorMessage;
      } else if (errorData?.msg) {
        errorMessage = errorData.msg;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" data-testid="forgot-password-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <VinylLogo size={80} spinning={true} className="mx-auto mb-4" />
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Forgot Password?</h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No worries! Enter your email and we&apos;ll send you a reset code.
          </p>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className={`rounded-xl p-8 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}
        >
          {error && (
            <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6" data-testid="forgot-error">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="Enter your email address"
                className="pl-10"
                data-testid="forgot-email"
              />
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full py-3"
            disabled={loading}
            data-testid="send-code-button"
          >
            {loading ? 'Sending Code...' : 'Send Reset Code'}
          </button>

          <Link 
            to="/login" 
            className={`flex items-center justify-center gap-2 mt-6 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
