import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Wallet, CreditCard, Gift, Clock, CheckCircle } from 'lucide-react';

const PayoutsCreditsPage = () => {
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
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Payouts & Credits Policy
            </h1>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Understanding how payments and credits work on MicLocker
          </p>
        </div>

        <div className={`space-y-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          
          <div className={`p-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}>
            <p className="leading-relaxed">
              MicLocker is committed to paying sellers quickly for their sales. Payout timing depends 
              on bank processing, which typically takes 1-5 business days.
            </p>
          </div>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <CreditCard className="w-6 h-6 text-primary" />
              1. MicLocker Payments
            </h2>
            <p className="mb-4">
              MicLocker Payments allows sellers to accept payments from buyers through our platform.
            </p>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Key Points
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Payments may not be immediate and may be delayed for security reasons</li>
              <li>You agree to accept possible delays when using MicLocker Payments</li>
              <li>Payouts are sent to your verified bank account</li>
              <li>MicLocker Payments is available 24/7, with occasional maintenance downtime</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Eligibility Requirements
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Be at least 18 years old</li>
              <li>Complete identity verification</li>
              <li>Register valid bank account information</li>
              <li>Be current on all MicLocker fees</li>
              <li>Maintain positive feedback and low cancellation rates</li>
              <li>Publish and maintain return/refund policies</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Clock className="w-6 h-6 text-blue-500" />
              2. Payout Timeline
            </h2>
            
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Sale Completed</p>
                    <p className="text-sm">Buyer payment is processed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Holding Period</p>
                    <p className="text-sm">Brief hold for buyer protection (typically 1-3 days after delivery)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Payout Initiated</p>
                    <p className="text-sm">Funds sent to your bank account</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Funds Available</p>
                    <p className="text-sm">Typically 2-5 business days after payout initiation</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Gift className="w-6 h-6 text-purple-500" />
              3. MicLocker Credits
            </h2>
            <p className="mb-4">
              MicLocker Credits are account balances that can be used for purchases on the platform.
            </p>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              How Credits Work
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Credits can only be used for purchases on MicLocker</li>
              <li>Credits are automatically applied to eligible purchases</li>
              <li>Credits cannot be transferred to other accounts once redeemed</li>
              <li>Credits are non-refundable and cannot be redeemed for cash</li>
              <li>MicLocker Credits do not expire</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Sources of Credits
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Gift card redemption</li>
              <li>Customer service accommodations</li>
              <li>Promotional offers</li>
              <li>Refund balances</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Gift className="w-6 h-6 text-primary" />
              4. Gift Cards
            </h2>
            
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <h4 className="font-semibold mb-3">Gift Card Terms:</h4>
              <ul className="list-disc list-inside space-y-2">
                <li>Must have a MicLocker account to redeem</li>
                <li>Transferable before redemption, not after</li>
                <li>MicLocker is not responsible for lost gift cards</li>
                <li>Gift cards do not expire</li>
                <li>No fees associated with gift cards</li>
                <li>Non-refundable and cannot be redeemed for cash</li>
                <li>Unused balance remains as MicLocker Credits</li>
              </ul>
            </div>
            
            <p className={`mt-4 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Use of gift cards is void where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              5. Transaction Limits
            </h2>
            <p className="mb-4">
              For security purposes, MicLocker or our payment processors may impose limits on:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Individual transaction amounts</li>
              <li>Cumulative transaction values</li>
              <li>Number of transactions per day or period</li>
            </ul>
            <p className="mt-4">
              MicLocker is not liable for transactions that exceed established limits.
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

export default PayoutsCreditsPage;