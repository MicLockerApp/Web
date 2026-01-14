import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import VinylLogo from '../components/VinylLogo';
import { ArrowLeft, CheckCircle, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const VerifyResetCodePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  
  const email = location.state?.email || '';
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('verify'); // 'verify' or 'reset'
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6);
        const newCode = [...code];
        digits.split('').forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setCode(newCode);
        if (digits.length > 0) {
          inputRefs.current[Math.min(digits.length, 5)]?.focus();
        }
      });
    }
  };

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

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.checkResetCode(email, fullCode);
      if (response.data.valid) {
        setStep('reset');
      } else {
        setError(response.data.message || 'Invalid verification code');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid verification code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const fullCode = code.join('');
      await authAPI.verifyResetCode(email, fullCode, newPassword);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');
    
    try {
      await authAPI.requestPasswordReset(email);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Password Reset!
          </h1>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Your password has been successfully reset. You will be redirected to login shortly.
          </p>
          <Link to="/login" className="btn btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" data-testid="verify-reset-page">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <VinylLogo size={80} spinning={true} className="mx-auto mb-4" />
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {step === 'verify' ? 'Enter Verification Code' : 'Create New Password'}
          </h1>
          {step === 'verify' && (
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              If the email <span className="text-primary font-medium">{email}</span> matches an account in our database, 
              we&apos;ve sent a 6-digit verification code to that inbox.
            </p>
          )}
        </div>

        <div className={`rounded-xl p-8 ${isDark ? 'bg-dark-400' : 'bg-white border border-gray-200 shadow-sm'}`}>
          {/* Info Box */}
          {step === 'verify' && (
            <div className={`flex items-start gap-3 p-4 rounded-lg mb-6 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
              <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                <p className="font-medium mb-1">Check your inbox!</p>
                <p className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                  Don&apos;t forget to check your <strong>spam folder</strong> if you don&apos;t see the email in your inbox. 
                  The code expires in 15 minutes.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2" data-testid="verify-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 'verify' ? (
            <>
              {/* Code Input Boxes */}
              <div className="flex justify-center gap-2 mb-6">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 transition-all
                      ${isDark 
                        ? 'bg-dark-300 border-dark-200 text-white focus:border-primary' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-primary'
                      }
                      focus:outline-none focus:ring-2 focus:ring-primary/20`}
                    data-testid={`code-input-${index}`}
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyCode}
                className="btn btn-primary w-full py-3"
                disabled={loading || code.some(d => !d)}
                data-testid="verify-code-button"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="mt-4 text-center">
                <button
                  onClick={handleResendCode}
                  disabled={resending}
                  className={`text-sm ${isDark ? 'text-gray-400 hover:text-primary' : 'text-gray-600 hover:text-primary'} transition-colors`}
                >
                  {resending ? 'Sending...' : "Didn\u0027t receive a code? Resend"}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    className="pl-10 pr-10"
                    data-testid="new-password"
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
                <label className={`block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Confirm new password"
                    className="pl-10"
                    data-testid="confirm-password"
                  />
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-3"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                data-testid="reset-password-button"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <Link 
            to="/login" 
            className={`flex items-center justify-center gap-2 mt-6 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyResetCodePage;
