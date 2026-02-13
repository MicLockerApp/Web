import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Send, CheckCircle, AlertCircle, ChevronDown, Ticket, MessageSquare, Book, Shield, Upload, X, Image, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useS3Upload from '../hooks/useS3Upload';
import SignUpModal from '../components/SignUpModal';

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

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

const HelpCenterPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const fileInputRef = useRef(null);
  const { uploadFile, progress, error: uploadError, setError: setUploadError } = useS3Upload();
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    message: '',
    order_id: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (attachments.length + files.length > MAX_FILES) {
      setError(`You can only attach up to ${MAX_FILES} files`);
      return;
    }

    const validFiles = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`File type not allowed: ${file.name}. Please use JPG, PNG, GIF, WebP, or PDF.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    setError('');
    setUploadError(null);

    try {
      const uploadedFiles = [];

      for (const file of validFiles) {
        // Upload to S3 using the hook
        const result = await uploadFile(file, `support-tickets/${Date.now()}`);
        
        if (result.success) {
          uploadedFiles.push({
            url: result.url,
            filename: file.name,
            size: file.size,
            type: file.type
          });
        } else {
          throw new Error(result.error || `Failed to upload ${file.name}`);
        }
      }

      setAttachments(prev => [...prev, ...uploadedFiles]);
    } catch (err) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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
          order_id: formData.order_id || null,
          attachments: attachments.map(a => ({ url: a.url, filename: a.filename, type: a.type }))
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
                  setAttachments([]);
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
            Contact Support
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
                <button onClick={() => setShowSignUpModal(true)} className="underline">Log in or Sign up</button>
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

            {/* File Attachments */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Attachments (optional)
              </label>
              <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Upload screenshots or photos to help us understand your issue. Max 5 files, 10MB each. (JPG, PNG, GIF, WebP, PDF)
              </p>
              
              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="mb-3 space-y-2">
                  {attachments.map((file, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-100'}`}
                    >
                      {file.type.startsWith('image/') ? (
                        <img src={file.url} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className={`w-12 h-12 rounded flex items-center justify-center ${isDark ? 'bg-dark-400' : 'bg-gray-200'}`}>
                          <Image className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {file.filename}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Button */}
              {attachments.length < MAX_FILES && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    multiple
                    className="hidden"
                    data-testid="attachment-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`w-full py-3 px-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
                      isDark 
                        ? 'border-dark-300 hover:border-primary text-gray-400 hover:text-primary' 
                        : 'border-gray-300 hover:border-primary text-gray-500 hover:text-primary'
                    } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    data-testid="add-attachment-btn"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading to S3...
                        {Object.keys(progress).length > 0 && (
                          <span className="text-xs">
                            ({Object.values(progress)[Object.values(progress).length - 1]}%)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Add Photos or Files
                      </>
                    )}
                  </button>
                  {uploadError && (
                    <p className="text-red-400 text-sm mt-2">{uploadError}</p>
                  )}
                </div>
              )}
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

      {/* Sign Up Modal for visitors */}
      <SignUpModal 
        isOpen={showSignUpModal} 
        onClose={() => setShowSignUpModal(false)}
        action="ticket"
      />
    </div>
  );
};

export default HelpCenterPage;
