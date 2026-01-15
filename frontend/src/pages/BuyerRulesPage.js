import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, ShoppingCart, CreditCard, Shield, MessageSquare, AlertTriangle, Heart } from 'lucide-react';

const BuyerRulesPage = () => {
  const { isDark } = useTheme();
  const currentDate = 'January 15, 2026';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link 
          to="/legal" 
          className={`inline-flex items-center gap-2 mb-8 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Terms & Policies
        </Link>

        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-primary" />
            </div>
            <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Community Rules for Buyers
            </h1>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Guidelines for a safe and positive buying experience on MicLocker
          </p>
        </div>

        <div className={`p-6 rounded-xl mb-10 ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}>
          <p className={`text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            MicLocker was built for musicians, audio engineers, studios, and music enthusiasts everywhere. 
            We've worked hard to create a welcoming community where everyone feels safe to explore, buy, 
            and find inspiration. These guidelines help maintain that environment.
          </p>
        </div>

        <div className={`space-y-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          
          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Heart className="w-6 h-6 text-primary" />
              1. Code of Conduct
            </h2>
            <p className="mb-4">All MicLocker users must adhere to the following standards:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Always follow MicLocker's <Link to="/legal/terms-of-use" className="text-primary hover:underline">Terms of Use</Link></li>
              <li>You must be 18 years or older, or have adult supervision</li>
              <li>You are responsible for all activity on your account</li>
              <li>Do not use fake identities or create accounts to evade restrictions</li>
              <li>Never share personal contact information in public areas of the site</li>
              <li>Treat all users and MicLocker staff with respect</li>
              <li>Do not engage in discrimination, hate speech, threats, or harassment</li>
              <li>Do not engage in any illegal activity including fraud</li>
            </ul>
            <p className={`mt-4 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Violations may result in immediate account termination at MicLocker's discretion.
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <CreditCard className="w-6 h-6 text-green-500" />
              2. Payment Obligations
            </h2>
            <p className="mb-4">
              When you purchase an item on MicLocker, you are obligated to complete payment in a 
              reasonable timeframe. Key points:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You are solely responsible for payment of items you purchase</li>
              <li>MicLocker may charge your payment method on file for any unpaid balances</li>
              <li>All payments must be made through MicLocker's platform</li>
              <li>Contact support if you experience payment issues</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <AlertTriangle className="w-6 h-6 text-red-500" />
              3. Off-Platform Transactions Prohibited
            </h2>
            <div className={`p-4 rounded-lg border-l-4 border-red-500 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <p className="font-semibold mb-2">Important:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Never complete transactions outside of MicLocker to avoid fees</li>
                <li>Off-platform transactions are not covered by MicLocker Purchase Protection</li>
                <li>MicLocker reserves the right to charge fees for transactions initiated on-site but completed elsewhere</li>
                <li>Attempting to circumvent fees may result in account suspension or termination</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Shield className="w-6 h-6 text-blue-500" />
              4. Marketplace Understanding
            </h2>
            <p className="mb-4">
              MicLocker is a marketplace that connects buyers and sellers. Understanding this relationship:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>MicLocker is not a party to the actual transaction between you and the seller</li>
              <li>MicLocker provides the platform but does not own or inspect items</li>
              <li>You release MicLocker from claims arising from transactions between users</li>
              <li>MicLocker may assist with disputes but cannot force transaction completion</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <MessageSquare className="w-6 h-6 text-primary" />
              5. Order Issues & Returns
            </h2>
            <p className="mb-4">If you need to cancel, return, or request a refund:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li><strong>Contact the seller first</strong> - Most issues can be resolved directly</li>
              <li><strong>Review shop policies</strong> - Each seller sets their own return policies</li>
              <li><strong>Contact MicLocker Support</strong> - If you cannot resolve the issue with the seller</li>
            </ol>
            <p className="mt-4">
              See our <Link to="/legal/purchase-protection" className="text-primary hover:underline">Purchase Protection</Link> page 
              for more details on buyer protections.
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              6. Community Ethics
            </h2>
            <p className="mb-4">
              MicLocker is committed to creating an inclusive environment where all music makers feel welcome. 
              We do not tolerate:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Content promoting hatred based on protected characteristics (race, gender, religion, etc.)</li>
              <li>Support for hate groups or their iconography</li>
              <li>Discriminatory language or slurs</li>
              <li>Harassment or intimidation of other users</li>
            </ul>
            <p className="mt-4">
              MicLocker may terminate accounts for violations of these ethics guidelines.
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Questions?
            </h2>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className="mb-2">
                <strong>Support:</strong>{' '}
                <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
              </p>
              <p>
                <strong>Email:</strong>{' '}
                <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline">info@miclockerapp.com</a>
              </p>
            </div>
          </section>

          <div className={`mt-12 pt-8 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Last Updated: {currentDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerRulesPage;