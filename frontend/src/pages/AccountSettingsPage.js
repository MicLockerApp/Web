import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ArrowLeft, User, Mail, Lock, Check, X, AlertCircle, 
  Eye, EyeOff, ChevronRight, Shield
} from 'lucide-react';

const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  
  // Form states
  const [usernameForm, setUsernameForm] = useState({ newUsername: '', password: '' });
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [emailVerification, setEmailVerification] = useState({ 
    pending: false, 
    newEmail: '', 
    code: ['', '', '', '', '', ''] 
  });
  const [passwordForm, setPasswordForm] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  
  // UI states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Code input refs
  const codeInputRefs = useRef([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check for pending email change
    checkPendingEmailChange();
  }, [user, navigate]);

  const checkPendingEmailChange = async () => {
    try {
      const response = await authAPI.getPendingEmailChange();
      if (response.data.has_pending) {
        setEmailVerification({
          pending: true,
          newEmail: response.data.new_email,
          code: ['', '', '', '', '', '']
        });
        setActiveSection('email-verify');
      }
    } catch (err) {
      console.error('Error checking pending email change:', err);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // ==========================================
  // Username Change
  // ==========================================
  const handleUsernameChange = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    
    try {
      await authAPI.changeUsername(usernameForm.newUsername, usernameForm.password);
      setSuccess('Username changed successfully!');
      setUsernameForm({ newUsername: '', password: '' });
      setActiveSection(null);
      if (refreshUser) refreshUser();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change username');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Email Change
  // ==========================================
  const handleEmailChangeRequest = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    
    try {
      await authAPI.requestEmailChange(emailForm.newEmail, emailForm.password);
      setEmailVerification({
        pending: true,
        newEmail: emailForm.newEmail,
        code: ['', '', '', '', '', '']
      });
      setActiveSection('email-verify');
      setSuccess('Verification code sent to your new email address');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request email change');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailCodeChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...emailVerification.code];
    newCode[index] = value;
    setEmailVerification(prev => ({ ...prev, code: newCode }));
    clearMessages();
    
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleEmailCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !emailVerification.code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6);
        const newCode = [...emailVerification.code];
        digits.split('').forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setEmailVerification(prev => ({ ...prev, code: newCode }));
        if (digits.length > 0) {
          codeInputRefs.current[Math.min(digits.length, 5)]?.focus();
        }
      });
    }
  };

  const handleVerifyEmailChange = async () => {
    clearMessages();
    const fullCode = emailVerification.code.join('');
    
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    
    setLoading(true);
    
    try {
      await authAPI.verifyEmailChange(fullCode);
      setSuccess('Email changed successfully!');
      setEmailVerification({ pending: false, newEmail: '', code: ['', '', '', '', '', ''] });
      setEmailForm({ newEmail: '', password: '' });
      setActiveSection(null);
      if (refreshUser) refreshUser();
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmailCode = async () => {
    clearMessages();
    setLoading(true);
    
    try {
      await authAPI.resendEmailChangeCode();
      setEmailVerification(prev => ({ ...prev, code: ['', '', '', '', '', ''] }));
      setSuccess('New verification code sent');
      codeInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEmailChange = async () => {
    clearMessages();
    setLoading(true);
    
    try {
      await authAPI.cancelEmailChange();
      setEmailVerification({ pending: false, newEmail: '', code: ['', '', '', '', '', ''] });
      setEmailForm({ newEmail: '', password: '' });
      setActiveSection(null);
    } catch (err) {
      setError('Failed to cancel email change');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Password Change
  // ==========================================
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    clearMessages();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      await authAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setSuccess('Password changed successfully! Please log in again.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Log out after password change for security
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <LoadingSpinner />;

  const renderUsernameSection = () => (
    <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Username</h2>
            <p className="text-gray-500 text-sm">{user.username}</p>
          </div>
        </div>
        {activeSection !== 'username' && (
          <button
            onClick={() => { setActiveSection('username'); clearMessages(); }}
            className="btn btn-secondary text-sm"
          >
            Change
          </button>
        )}
      </div>
      
      {activeSection === 'username' && (
        <form onSubmit={handleUsernameChange} className="mt-4 pt-4 border-t border-dark-300">
          <div className="space-y-4">
            <div>
              <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                New Username
              </label>
              <input
                type="text"
                value={usernameForm.newUsername}
                onChange={(e) => setUsernameForm(prev => ({ ...prev, newUsername: e.target.value }))}
                placeholder="Enter new username"
                required
                minLength={3}
                data-testid="new-username-input"
              />
            </div>
            <div>
              <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Current Password (to confirm)
              </label>
              <input
                type="password"
                value={usernameForm.password}
                onChange={(e) => setUsernameForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                required
                data-testid="username-password-input"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => { setActiveSection(null); clearMessages(); }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
              data-testid="save-username-btn"
            >
              {loading ? 'Saving...' : 'Save Username'}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const renderEmailSection = () => (
    <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Address</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </div>
        {activeSection !== 'email' && activeSection !== 'email-verify' && (
          <button
            onClick={() => { setActiveSection('email'); clearMessages(); }}
            className="btn btn-secondary text-sm"
          >
            Change
          </button>
        )}
      </div>
      
      {activeSection === 'email' && (
        <form onSubmit={handleEmailChangeRequest} className="mt-4 pt-4 border-t border-dark-300">
          <div className="space-y-4">
            <div>
              <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                New Email Address
              </label>
              <input
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                placeholder="Enter new email"
                required
                data-testid="new-email-input"
              />
            </div>
            <div>
              <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Current Password (to confirm)
              </label>
              <input
                type="password"
                value={emailForm.password}
                onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                required
                data-testid="email-password-input"
              />
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-3">
            A verification code will be sent to your new email address.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => { setActiveSection(null); clearMessages(); }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
              data-testid="request-email-change-btn"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        </form>
      )}
      
      {activeSection === 'email-verify' && (
        <div className="mt-4 pt-4 border-t border-dark-300">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
            <p className="text-blue-300 text-sm">
              Enter the 6-digit code sent to <strong className="text-white">{emailVerification.newEmail}</strong>
            </p>
          </div>
          
          {/* Code Input Boxes */}
          <div className="flex justify-center gap-2 mb-4">
            {emailVerification.code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (codeInputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleEmailCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleEmailCodeKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 transition-all
                  bg-dark-300 border-dark-200 text-white focus:border-primary
                  focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid={`email-verification-code-${index}`}
              />
            ))}
          </div>
          
          <div className="flex gap-3 mb-3">
            <button
              type="button"
              onClick={handleCancelEmailChange}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleVerifyEmailChange}
              className="btn btn-primary flex-1"
              disabled={loading || emailVerification.code.some(d => !d)}
              data-testid="verify-email-change-btn"
            >
              {loading ? 'Verifying...' : 'Verify & Change Email'}
            </button>
          </div>
          
          <div className="text-center">
            <button
              onClick={handleResendEmailCode}
              disabled={loading}
              className="text-sm text-gray-400 hover:text-primary transition-colors"
            >
              Didn&apos;t receive a code? Resend
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderPasswordSection = () => (
    <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Password</h2>
            <p className="text-gray-500 text-sm">••••••••••</p>
          </div>
        </div>
        {activeSection !== 'password' && (
          <button
            onClick={() => { setActiveSection('password'); clearMessages(); }}
            className="btn btn-secondary text-sm"
          >
            Change
          </button>
        )}
      </div>
      
      {activeSection === 'password' && (
        <form onSubmit={handlePasswordChange} className="mt-4 pt-4 border-t border-dark-300">
          <div className="space-y-4">
            <div>
              <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  required
                  data-testid="current-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  data-testid="new-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">Minimum 6 characters</p>
            </div>
            <div>
              <label className={`block mb-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                required
                data-testid="confirm-password-input"
              />
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
            <p className="text-yellow-400 text-xs">
              ⚠️ You will be logged out after changing your password for security.
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => { setActiveSection(null); clearMessages(); }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
              data-testid="save-password-btn"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4" data-testid="account-settings-page">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-dark-300' : 'hover:bg-gray-100'}`}
          >
            <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Account Settings
            </h1>
            <p className="text-gray-500 text-sm">Manage your account credentials</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {renderUsernameSection()}
          {renderEmailSection()}
          {renderPasswordSection()}
        </div>

        {/* Security Info */}
        <div className={`mt-8 p-4 rounded-xl ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Security Tip
              </h3>
              <p className="text-gray-500 text-xs mt-1">
                For your security, all credential changes require password confirmation. 
                If you suspect unauthorized access, change your password immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Profile Link */}
        <div className="mt-6 text-center">
          <Link
            to={`/profile/${user.id}/edit`}
            className="text-primary hover:underline text-sm inline-flex items-center gap-1"
          >
            Edit Profile <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
