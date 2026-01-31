import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Smartphone, QrCode, Shield, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import api from '../services/api';

/**
 * Two-Factor Authentication Setup Component
 * 
 * Allows users to set up 2FA via:
 * - Authenticator App (TOTP/QR Code)
 * - SMS (Phone Number)
 */
const TwoFactorSetup = ({ onComplete, onSkip, isRequired = false }) => {
  const { isDark } = useTheme();
  const [step, setStep] = useState('choose'); // choose, totp-setup, totp-verify, sms-setup, sms-verify, complete
  const [method, setMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // TOTP state
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // SMS state
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  const handleMethodSelect = async (selectedMethod) => {
    setMethod(selectedMethod);
    setError('');
    
    if (selectedMethod === 'totp') {
      setLoading(true);
      try {
        const response = await api.post('/2fa/setup', { method: 'totp' });
        setTotpSecret(response.data.secret);
        setQrCodeUrl(response.data.qr_code_url);
        setStep('totp-setup');
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to initialize authenticator setup');
      } finally {
        setLoading(false);
      }
    } else {
      setStep('sms-setup');
    }
  };

  const handleSMSSetup = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }
    
    // Validate phone format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await api.post('/2fa/setup', { 
        method: 'sms',
        phone_number: phoneNumber.replace(/\s/g, '')
      });
      setStep('sms-verify');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/2fa/verify', {
        method: method,
        code: verificationCode
      });
      
      if (response.data.verified) {
        if (response.data.backup_codes) {
          setBackupCodes(response.data.backup_codes);
        }
        setStep('complete');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendSMS = async () => {
    setLoading(true);
    setError('');
    
    try {
      await api.post('/2fa/resend-sms');
      setError(''); // Clear any previous error
      alert('Verification code sent!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete({ method, backupCodes });
    }
  };

  // Method selection screen
  if (step === 'choose') {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
        <div className="text-center mb-6">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Secure Your Account
          </h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Add an extra layer of security with two-factor authentication
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleMethodSelect('totp')}
            disabled={loading}
            data-testid="2fa-totp-option"
            className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 transition-colors ${
              isDark 
                ? 'border-dark-300 hover:border-primary bg-dark-300' 
                : 'border-gray-200 hover:border-primary bg-gray-50'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-200' : 'bg-gray-200'}`}>
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Authenticator App
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Use Google Authenticator, Authy, or similar apps
              </p>
            </div>
            <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>

          <button
            onClick={() => handleMethodSelect('sms')}
            disabled={loading}
            data-testid="2fa-sms-option"
            className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 transition-colors ${
              isDark 
                ? 'border-dark-300 hover:border-primary bg-dark-300' 
                : 'border-gray-200 hover:border-primary bg-gray-50'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-200' : 'bg-gray-200'}`}>
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Text Message (SMS)
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Receive codes via SMS to your phone
              </p>
            </div>
            <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {!isRequired && onSkip && (
          <button
            onClick={onSkip}
            className={`w-full mt-6 py-3 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Skip for now (you can set this up later)
          </button>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}
      </div>
    );
  }

  // TOTP Setup screen
  if (step === 'totp-setup') {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
        <button
          onClick={() => setStep('choose')}
          className={`flex items-center gap-1 text-sm mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Set Up Authenticator App
          </h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Scan the QR code with your authenticator app
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white rounded-lg">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="2FA QR Code" 
                className="w-48 h-48"
                data-testid="2fa-qr-code"
              />
            )}
          </div>
        </div>

        {/* Manual entry */}
        <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
          <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Can&apos;t scan? Enter this code manually:
          </p>
          <code className={`text-sm font-mono break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {totpSecret}
          </code>
        </div>

        <button
          onClick={() => setStep('totp-verify')}
          className="w-full btn btn-primary py-3"
        >
          Continue
        </button>
      </div>
    );
  }

  // TOTP Verify screen
  if (step === 'totp-verify') {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
        <button
          onClick={() => setStep('totp-setup')}
          className={`flex items-center gap-1 text-sm mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Verify Setup
          </h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          data-testid="2fa-code-input"
          className={`w-full text-center text-2xl tracking-widest py-4 rounded-lg ${
            isDark ? 'bg-dark-300 text-white' : 'bg-gray-100 text-gray-900'
          }`}
        />

        {error && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || verificationCode.length !== 6}
          className="w-full btn btn-primary py-3 mt-6 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify & Enable'}
        </button>
      </div>
    );
  }

  // SMS Setup screen
  if (step === 'sms-setup') {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
        <button
          onClick={() => setStep('choose')}
          className={`flex items-center gap-1 text-sm mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Set Up SMS Authentication
          </h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Enter your phone number to receive verification codes
          </p>
        </div>

        <div className="mb-6">
          <label className={`block text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Phone Number (with country code)
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 234 567 8900"
            data-testid="2fa-phone-input"
            className={`w-full py-3 px-4 rounded-lg ${
              isDark ? 'bg-dark-300 text-white' : 'bg-gray-100 text-gray-900'
            }`}
          />
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Include your country code (e.g., +1 for US)
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleSMSSetup}
          disabled={loading || !phoneNumber.trim()}
          className="w-full btn btn-primary py-3 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Verification Code'}
        </button>
      </div>
    );
  }

  // SMS Verify screen
  if (step === 'sms-verify') {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
        <button
          onClick={() => setStep('sms-setup')}
          className={`flex items-center gap-1 text-sm mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Verify Phone Number
          </h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Enter the 6-digit code sent to {phoneNumber.slice(-4).padStart(phoneNumber.length, '•')}
          </p>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          data-testid="2fa-sms-code-input"
          className={`w-full text-center text-2xl tracking-widest py-4 rounded-lg ${
            isDark ? 'bg-dark-300 text-white' : 'bg-gray-100 text-gray-900'
          }`}
        />

        {error && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || verificationCode.length !== 6}
          className="w-full btn btn-primary py-3 mt-6 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify & Enable'}
        </button>

        <button
          onClick={handleResendSMS}
          disabled={loading}
          className={`w-full py-3 mt-2 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Resend Code
        </button>
      </div>
    );
  }

  // Complete screen with backup codes
  if (step === 'complete') {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white'}`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Two-Factor Authentication Enabled!
          </h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Your account is now more secure
          </p>
        </div>

        {backupCodes.length > 0 && (
          <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
            <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Save Your Backup Codes
            </p>
            <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Store these codes safely. You can use them to access your account if you lose your phone.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code 
                  key={index}
                  className={`text-sm font-mono px-2 py-1 rounded ${isDark ? 'bg-dark-200 text-white' : 'bg-white text-gray-900'}`}
                >
                  {code}
                </code>
              ))}
            </div>
            <button
              onClick={() => {
                const text = backupCodes.join('\n');
                navigator.clipboard.writeText(text);
                alert('Backup codes copied to clipboard!');
              }}
              className={`w-full mt-4 py-2 text-sm rounded-lg ${isDark ? 'bg-dark-200 text-white hover:bg-dark-100' : 'bg-white text-gray-900 hover:bg-gray-50 border'}`}
            >
              Copy All Codes
            </button>
          </div>
        )}

        <button
          onClick={handleComplete}
          className="w-full btn btn-primary py-3"
        >
          Continue
        </button>
      </div>
    );
  }

  return null;
};

export default TwoFactorSetup;
