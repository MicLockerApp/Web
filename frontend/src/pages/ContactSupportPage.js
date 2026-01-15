import React from 'react';
import { MessageSquare, Clock, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ContactSupportPage = () => {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen py-12 ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Hello, how can we help you?
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Contact MicLocker Support
          </p>
        </div>

        {/* Safety Notice */}
        <div className={`rounded-xl p-6 mb-8 ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                For your safety
              </h3>
              <p className={`text-sm ${isDark ? 'text-yellow-300/80' : 'text-yellow-600'}`}>
                Keep all communication on MicLocker and never share personal info via messages. 
                This helps protect you from scams and ensures all transactions are covered by our buyer protection.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Support Section */}
        <div className={`rounded-xl p-8 ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Contact MicLocker Support
            </h2>
          </div>

          <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Our virtual assistant is here to help you with most questions that come up on MicLocker. 
            For further assistance, MicLocker Support is here to help.
          </p>

          {/* Support Hours */}
          <div className={`rounded-lg p-6 mb-8 ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Live Chat Hours
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Monday - Friday</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>3:30 a.m. – 9 p.m. CT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Saturday - Sunday</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>8:30 a.m. – 4:30 p.m. CT</span>
              </div>
            </div>
          </div>

          {/* Contact Button */}
          <button
            onClick={() => {
              // In a real implementation, this would open a chat widget
              alert('Live chat support would open here. This feature requires integration with a chat service like Intercom, Zendesk, or Ada.');
            }}
            className="w-full btn btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            Contact Support
          </button>

          <p className={`text-center text-sm mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Our support team typically responds within a few minutes during business hours.
          </p>
        </div>

        {/* Common Topics */}
        <div className="mt-12">
          <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Common Support Topics
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: 'Order Issues', description: 'Help with orders, shipping, or delivery' },
              { title: 'Refunds & Returns', description: 'Request a refund or return an item' },
              { title: 'Account Help', description: 'Password reset, account settings, verification' },
              { title: 'Seller Support', description: 'Listing help, payouts, seller questions' },
              { title: 'Payment Issues', description: 'Payment methods, failed transactions, invoices' },
              { title: 'Safety & Trust', description: 'Report suspicious activity or scams' },
            ].map((topic, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  isDark 
                    ? 'bg-dark-400 hover:bg-dark-300' 
                    : 'bg-white shadow hover:shadow-md'
                }`}
                onClick={() => {
                  alert(`Support topic: ${topic.title}\n\nThis would open a chat with context about ${topic.title.toLowerCase()}.`);
                }}
              >
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {topic.title}
                </h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {topic.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSupportPage;
