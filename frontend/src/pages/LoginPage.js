import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VinylLogo from '../components/VinylLogo';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" data-testid="login-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <VinylLogo size={80} spinning={true} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400 mt-2">Sign in to your MicLocker account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-dark-400 rounded-xl p-8">
          {error && (
            <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6" data-testid="login-error">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-gray-400 mb-2">Username or Email</label>
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
            <label className="block text-gray-400 mb-2">Password</label>
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

          <p className="text-center text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline" data-testid="register-link">
              Sign Up
            </Link>
          </p>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-dark-400 rounded-lg text-center">
          <p className="text-gray-400 text-sm">Demo Credentials:</p>
          <p className="text-gray-300 text-sm mt-1">
            <span className="text-primary">admin</span> / <span className="text-primary">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
