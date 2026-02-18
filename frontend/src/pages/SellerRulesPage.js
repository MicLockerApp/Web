import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Store, Package, FileText, Truck, AlertTriangle, Shield, Heart, DollarSign } from 'lucide-react';

const SellerRulesPage = () => {
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
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Community Rules for Sellers
            </h1>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Guidelines for successful selling on MicLocker
          </p>
        </div>

        <div className={`space-y-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          
          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Heart className="w-6 h-6 text-primary" />
              1. Code of Conduct
            </h2>
            <p className="mb-4">All sellers must adhere to these standards:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Follow MicLocker's <Link to="/legal/terms-of-use" className="text-primary hover:underline">Terms of Use</Link></li>
              <li>Be 18 years or older, or have adult supervision</li>
              <li>Provide accurate personal and contact information</li>
              <li>Never list counterfeit, stolen, or prohibited items</li>
              <li>Do not use fake identities or evade account restrictions</li>
              <li>Treat buyers and MicLocker staff with respect</li>
              <li>Never engage in discrimination, harassment, or threats</li>
              <li>Do not share buyer's personal information inappropriately</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <FileText className="w-6 h-6 text-blue-500" />
              2. Listing Standards
            </h2>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              What Can Be Sold
            </h3>
            <p className="mb-4">MicLocker is a marketplace for music-related items:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-6">
              <li>Instruments and their parts (guitars, drums, keyboards, etc.)</li>
              <li>Items that enhance playing (straps, picks, cables, pedals)</li>
              <li>Recording and performance equipment (mixers, mics, amps, lighting)</li>
              <li>Music-related accessories and merchandise</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Listing Quality Requirements
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You must legally own and be able to sell the item</li>
              <li>Descriptions must be accurate and complete</li>
              <li>Use your own photos (no stock photos unless you're an authorized dealer)</li>
              <li>List items in appropriate categories with accurate tags</li>
              <li>Each unique item needs its own listing</li>
              <li>Prices must accurately represent the sale</li>
              <li>Shipping fees must be reasonable</li>
              <li>Do not include external links, phone numbers, or emails in listings</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Shield className="w-6 h-6 text-green-500" />
              3. Intellectual Property
            </h2>
            <p className="mb-4">
              MicLocker takes intellectual property rights seriously. Do not:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>List counterfeit or knock-off items</li>
              <li>Use copyrighted images without permission</li>
              <li>Infringe on trademarks, patents, or copyrights</li>
              <li>Sell unauthorized copies of any products</li>
            </ul>
            <p className="mt-4">
              See our <Link to="/legal/intellectual-property" className="text-primary hover:underline">Intellectual Property Policy</Link> for details.
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Store className="w-6 h-6 text-purple-500" />
              4. Shop Policies
            </h2>
            <p className="mb-4">
              All sellers should establish clear shop policies covering:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Shipping timeframes and methods</li>
              <li>Return and refund policies</li>
              <li>Payment terms</li>
              <li>Any other relevant selling policies</li>
            </ul>
            <p className="mt-4">
              Policies must comply with MicLocker's site-wide rules and be followed consistently.
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Package className="w-6 h-6 text-primary" />
              5. Sales & Shipping Obligations
            </h2>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className="font-semibold mb-2">All sales are binding. When an item sells:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Ship the exact item listed within 3 business days (or your stated timeframe)</li>
                <li>You cannot substitute items without buyer consent</li>
                <li>Use tracking numbers for all shipments</li>
                <li>Package items properly to prevent damage</li>
                <li>If you cannot fulfill an order, cancel promptly and professionally</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Truck className="w-6 h-6 text-blue-500" />
              6. Delivery & Returns
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Deliver items within your stated processing time</li>
              <li>If you haven't shipped within 3 business days, MicLocker may issue a refund on your behalf</li>
              <li>Honor your published return and refund policies</li>
              <li>Process refunds within 2 business days of receiving returned items</li>
              <li>Work with buyers to resolve issues directly when possible</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <AlertTriangle className="w-6 h-6 text-red-500" />
              7. Cancellations
            </h2>
            <p className="mb-4">
              Seller-initiated cancellations create a poor buyer experience. To maintain trust:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Keep your inventory accurate to avoid cancellations</li>
              <li>Excessive cancellations may affect your account standing</li>
              <li>Do not pressure buyers to cancel to avoid fees</li>
              <li>Cancellations due to lost/damaged shipments are handled case-by-case</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <AlertTriangle className="w-6 h-6 text-red-500" />
              8. Off-Platform Transactions Prohibited
            </h2>
            <div className={`p-4 rounded-lg border-l-4 border-red-500 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <ul className="list-disc list-inside space-y-2">
                <li>Never move transactions off MicLocker to avoid fees</li>
                <li>Off-platform transactions void all MicLocker protections</li>
                <li>MicLocker may charge fees for transactions initiated on-site but completed elsewhere</li>
                <li>Fee avoidance may result in account termination</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <DollarSign className="w-6 h-6 text-green-500" />
              9. Taxes
            </h2>
            <p>
              As a seller, you are responsible for understanding and complying with all applicable tax 
              obligations, including collecting and remitting sales tax where required. Consult a tax 
              professional for guidance specific to your situation.
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              10. Community Ethics
            </h2>
            <p className="mb-4">
              MicLocker values inclusivity. We do not tolerate content or conduct that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Promotes hatred based on protected characteristics</li>
              <li>Supports hate groups or their iconography</li>
              <li>Uses discriminatory language</li>
              <li>Harasses or intimidates users</li>
            </ul>
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
              <p className="mb-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline">info@miclockerapp.com</a>
              </p>
              <p>
                <strong>Phone:</strong>{' '}
                <a href="tel:+13146480249" className="text-primary hover:underline">+1 314-648-0249</a>
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

export default SellerRulesPage;