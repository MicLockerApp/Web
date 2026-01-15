import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Send, CheckCircle, AlertCircle, ChevronDown, Ticket, MessageSquare, Book, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const TICKET_CATEGORIES = [
  { value: 'Order Issue', label: 'Order Issue', description: 'Problems with your order, delivery, or tracking' },
  { value: 'Payment Problem', label: 'Payment Problem', description: 'Issues with payments, charges, or refunds' },
  { value: 'Refund Request', label: 'Refund Request', description: 'Request a refund for a purchase' },
  { value: 'Shipping Issue', label: 'Shipping Issue', description: 'Shipping delays, lost packages, or wrong address' },
  { value: 'Item Not As Described', label: 'Item Not As Described', description: 'Item received differs from listing' },
  { value: 'Account Problem', label: 'Account Problem', description: 'Login issues, profile settings, or security' },
  { value: 'Listing Help', label: 'Listing Help', description: 'Help creating or managing listings' },
  { value: 'Technical Issue', label: 'Technical Issue', description: 'Website bugs or technical problems' },
  { value: 'Report a User', label: 'Report a User', description: 'Report suspicious or inappropriate behavior' },
  { value: 'Feedback/Suggestion', label: 'Feedback/Suggestion', description: 'Share ideas to improve MicLocker' },
  { value: 'Other', label: 'Other', description: 'Something else not listed above' }
];

const HelpCenterPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    message: '',
    order_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      navigate('/login?redirect=/help');
      return;
    }

    if (!formData.category || !formData.subject || !formData.message) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: formData.category,
          subject: formData.subject,
          message: formData.message,
          order_id: formData.order_id || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTicketNumber(data.ticket_number);
      } else {
        throw new Error(data.detail || 'Failed to submit ticket');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit support ticket');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`min-h-screen py-12 ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
        <div className="max-w-2xl mx-auto px-4">
          <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Ticket Submitted!
            </h1>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Your ticket number is:
            </p>
            <p className="text-2xl font-bold text-primary mb-6">
              {ticketNumber}
            </p>
            <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              We've sent a confirmation email to <strong>{user?.email}</strong>.<br />
              Our team will respond within 24-48 hours.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setSuccess(false);
                  setFormData({ category: '', subject: '', message: '', order_id: '' });
                }}
                className="px-6 py-3 bg-dark-300 hover:bg-dark-200 text-white rounded-xl transition-colors"
              >
                Submit Another Ticket
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-primary hover:bg-yellow-400 text-black font-semibold rounded-xl transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-12 ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Help Center
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Submit a support ticket and our team will get back to you
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <a
            href="/returns"
            className={`p-4 rounded-xl flex items-center gap-3 transition-colors ${
              isDark ? 'bg-dark-400 hover:bg-dark-300' : 'bg-white hover:bg-gray-50 shadow'
            }`}
          >
            <Book className="w-6 h-6 text-primary" />
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Return Policy</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>How returns work</p>
            </div>
          </a>
          <a
            href="/contact-support"
            className={`p-4 rounded-xl flex items-center gap-3 transition-colors ${
              isDark ? 'bg-dark-400 hover:bg-dark-300' : 'bg-white hover:bg-gray-50 shadow'
            }`}
          >
            <MessageSquare className="w-6 h-6 text-primary" />
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Live Chat</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Talk to our AI assistant</p>
            </div>
          </a>
          <a
            href="/about"
            className={`p-4 rounded-xl flex items-center gap-3 transition-colors ${
              isDark ? 'bg-dark-400 hover:bg-dark-300' : 'bg-white hover:bg-gray-50 shadow'
            }`}
          >
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>About Us</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Learn about MicLocker</p>
            </div>
          </a>
        </div>

        {/* Ticket Form */}
        <div className={`rounded-2xl p-8 ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}>
          <div className="flex items-center gap-3 mb-6">
            <Ticket className="w-6 h-6 text-primary" />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Submit a Support Ticket
            </h2>
          </div>

          {!isAuthenticated && (
            <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                <strong>Please log in</strong> to submit a support ticket. This helps us assist you better.{' '}
                <a href="/login?redirect=/help" className="underline">Log in now</a>
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-4 mb-6 bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                What do you need help with? <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl appearance-none ${
                    isDark 
                      ? 'bg-dark-500 text-white border-dark-300' 
                      : 'bg-gray-50 text-gray-900 border-gray-200'
                  } border focus:ring-2 focus:ring-primary/50 focus:border-primary`}
                  required
                >
                  <option value="">Select a category...</option>
                  {TICKET_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              {formData.category && (
                <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {TICKET_CATEGORIES.find(c => c.value === formData.category)?.description}
                </p>
              )}
            </div>

            {/* Order ID (optional) */}
            {['Order Issue', 'Payment Problem', 'Refund Request', 'Shipping Issue', 'Item Not As Described'].includes(formData.category) && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Order ID (if applicable)
                </label>
                <input
                  type="text"
                  name="order_id"
                  value={formData.order_id}
                  onChange={handleChange}
                  placeholder="Enter your order ID"
                  className={`w-full px-4 py-3 rounded-xl ${
                    isDark 
                      ? 'bg-dark-500 text-white border-dark-300 placeholder-gray-500' 
                      : 'bg-gray-50 text-gray-900 border-gray-200 placeholder-gray-400'
                  } border focus:ring-2 focus:ring-primary/50 focus:border-primary`}
                />
              </div>
            )}

            {/* Subject */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Brief summary of your issue"
                className={`w-full px-4 py-3 rounded-xl ${
                  isDark 
                    ? 'bg-dark-500 text-white border-dark-300 placeholder-gray-500' 
                    : 'bg-gray-50 text-gray-900 border-gray-200 placeholder-gray-400'
                } border focus:ring-2 focus:ring-primary/50 focus:border-primary`}
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Please describe your issue in detail. Include any relevant information that will help us assist you better."
                rows={6}
                className={`w-full px-4 py-3 rounded-xl resize-none ${
                  isDark 
                    ? 'bg-dark-500 text-white border-dark-300 placeholder-gray-500' 
                    : 'bg-gray-50 text-gray-900 border-gray-200 placeholder-gray-400'
                } border focus:ring-2 focus:ring-primary/50 focus:border-primary`}
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isAuthenticated}
              className="w-full py-4 bg-primary hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Ticket
                </>
              )}
            </button>
          </form>

          <p className={`text-center text-sm mt-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            We typically respond within 24-48 hours. For urgent issues, please use our{' '}
            <a href="/contact-support" className="text-primary hover:underline">live chat</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
