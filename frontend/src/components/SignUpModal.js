import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, LogIn } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SignUpModal = ({ isOpen, onClose, action = 'interact' }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  if (!isOpen) return null;

  // Map action to user-friendly message
  const getActionMessage = () => {
    switch (action) {
      case 'message':
        return 'send messages to other users';
      case 'favorite':
        return 'save favorites';
      case 'like':
        return 'like auditions';
      case 'book':
        return 'book sessions';
      case 'contact':
        return 'contact this user';
      case 'review':
        return 'leave reviews';
      case 'apply':
        return 'apply to gigs';
      case 'respond':
        return 'respond to gigs';
      case 'report':
        return 'report content';
      case 'ticket':
        return 'submit support tickets';
      default:
        return 'interact with other users';
    }
  };

  const handleSignUp = () => {
    onClose();
    navigate('/register');
  };

  const handleSignIn = () => {
    onClose();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-2xl p-8 ${isDark ? 'bg-dark-200' : 'bg-white'} shadow-2xl relative`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? 'hover:bg-dark-300 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          data-testid="signup-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <UserPlus className="w-10 h-10 text-primary" />
          </div>
        </div>
        
        {/* Title */}
        <h2 className={`text-2xl font-bold text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Join MicLocker
        </h2>
        
        {/* Message */}
        <p className={`text-center mb-8 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Create a free account to <span className="font-semibold text-primary">{getActionMessage()}</span> and connect with creative professionals.
        </p>
        
        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSignUp}
            className="w-full py-3 px-6 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            data-testid="signup-modal-signup-btn"
          >
            <UserPlus className="w-5 h-5" />
            Create Account
          </button>
          
          <button
            onClick={handleSignIn}
            className={`w-full py-3 px-6 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              isDark 
                ? 'bg-dark-300 text-white hover:bg-dark-400' 
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
            data-testid="signup-modal-signin-btn"
          >
            <LogIn className="w-5 h-5" />
            Sign In
          </button>
        </div>

        {/* Footer */}
        <p className={`text-center mt-6 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Already have an account? <button onClick={handleSignIn} className="text-primary hover:underline">Sign in here</button>
        </p>
      </div>
    </div>
  );
};

export default SignUpModal;
