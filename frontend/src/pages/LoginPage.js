import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import VinylLogo from '../components/VinylLogo';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const username = formData.username;
    const password = formData.password;
    
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
      setLoading(false);
      setFormData({ username, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" data-testid="login-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <VinylLogo size={80} spinning={true} className="mx-auto mb-4" />
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome Back</h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sign in to your MicLocker account</p>
        </div>

        <form onSubmit={handleSubmit} className={`rounded-xl p-8 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
          {error && (
            <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6" data-testid="login-error">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Username or Email</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              autoFocus
              data-testid="login-username"
            />
          </div>

          <div className="mb-6">
            <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              data-testid="login-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full py-3"
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <Link 
            to="/forgot-password" 
            className={`block text-center mt-4 ${isDark ? 'text-gray-400 hover:text-primary' : 'text-gray-600 hover:text-primary'} transition-colors`}
            data-testid="forgot-password-link"
          >
            Forgot Password?
          </Link>

          <p className={`text-center mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline" data-testid="register-link">
              Sign Up
            </Link>
          </p>
        </form>

        {/* Demo credentials */}
        <div className={`mt-6 p-4 rounded-lg text-center ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Demo Credentials:</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span className="text-primary">jmcdougall</span> / <span className="text-primary">Eisenhower1212!!</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
