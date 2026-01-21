import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import VinylLogo from '../components/VinylLogo';
import analytics from '../services/analytics';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminFormData, setAdminFormData] = useState({ username: '', password: '' });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const username = formData.username;
    const password = formData.password;
    
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      
      // Track successful login
      analytics.userLoggedIn();
      
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
      setLoading(false);
      setFormData({ username, password });
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!adminFormData.username || !adminFormData.password) {
      setAdminError('Please enter both username and password.');
      return;
    }
    
    setAdminError('');
    setAdminLoading(true);

    try {
      await login(adminFormData.username, adminFormData.password);
      
      // Track admin login
      analytics.userLoggedIn();
      
      // Navigate to admin page
      navigate('/admin');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Admin login failed. Please check your credentials.';
      setAdminError(errorMessage);
      setAdminLoading(false);
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

        {/* Admin Login Section */}
        <div className={`mt-6 rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <button
            type="button"
            onClick={() => setShowAdminLogin(!showAdminLogin)}
            className={`w-full px-6 py-4 flex items-center justify-between ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-50'} transition-colors`}
            data-testid="admin-login-toggle"
          >
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`} />
              <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Admin Access</span>
            </div>
            {showAdminLogin ? (
              <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </button>
          
          {showAdminLogin && (
            <form onSubmit={handleAdminLogin} className={`px-6 pb-6 pt-2 border-t ${isDark ? 'border-dark-300' : 'border-gray-100'}`}>
              {adminError && (
                <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm" data-testid="admin-login-error">
                  {adminError}
                </div>
              )}
              
              <div className="mb-4">
                <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Admin Username</label>
                <input
                  type="text"
                  value={adminFormData.username}
                  onChange={(e) => setAdminFormData({ ...adminFormData, username: e.target.value })}
                  placeholder="Enter admin username"
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-yellow-500/50`}
                  data-testid="admin-username"
                />
              </div>
              
              <div className="mb-4">
                <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Admin Password</label>
                <input
                  type="password"
                  value={adminFormData.password}
                  onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                  placeholder="Enter admin password"
                  className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-200 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-yellow-500/50`}
                  data-testid="admin-password"
                />
              </div>
              
              <button
                type="submit"
                disabled={adminLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                  isDark 
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30' 
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                } ${adminLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="admin-login-submit"
              >
                <Shield className="w-4 h-4" />
                {adminLoading ? 'Signing In...' : 'Sign In as Admin'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
