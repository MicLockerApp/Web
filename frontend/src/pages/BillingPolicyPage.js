import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft } from 'lucide-react';

const BillingPolicyPage = () => {
  const { isDark } = useTheme();
  const currentDate = 'January 15, 2026';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Link */}
        <Link 
          to="/legal" 
          className={`inline-flex items-center gap-2 mb-8 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Terms & Policies
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Billing Policy
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Understanding fees, payments, and payouts on MicLocker
          </p>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Effective Date: {currentDate}
          </p>
        </div>

        {/* Content */}
        <div className={`space-y-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          
          {/* Overview */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Overview
            </h2>
            <p className="leading-relaxed mb-4">
              MicLocker is committed to providing a transparent and fair fee structure for our marketplace. 
              This Billing Policy outlines the fees associated with selling on MicLocker, how payments are 
              processed, and how you receive your payouts.
            </p>
            <div className={`p-4 rounded-lg border-l-4 border-primary ${isDark ? 'bg-primary/10' : 'bg-yellow-50'}`}>
              <p className="font-semibold">
                Key Point: Listing items on MicLocker is completely free. You only pay fees when your item sells.
              </p>
            </div>
          </section>

          {/* Fee Structure */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Fee Structure
            </h2>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Listing Fees
            </h3>
            <p className="leading-relaxed mb-4">
              <strong>$0 - Free to list.</strong> You can create as many listings as you want without any 
              upfront costs. There are no insertion fees, listing fees, or subscription fees to sell on MicLocker.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Platform Fee
            </h3>
            <p className="leading-relaxed mb-4">
              When your item sells, MicLocker charges a <strong>3% platform fee</strong> based on the total 
              sale price (item price + shipping cost paid by the buyer). This fee supports the operation 
              of the marketplace, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Secure payment processing infrastructure</li>
              <li>Customer support for buyers and sellers</li>
              <li>Platform development and maintenance</li>
              <li>Fraud prevention and buyer protection programs</li>
              <li>Marketing to attract buyers to your listings</li>
            </ul>

            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className="font-semibold mb-3">Example Calculation:</p>
              <div className="space-y-2 text-sm">
                <div className={`pb-2 border-b ${isDark ? 'border-dark-300' : 'border-gray-300'}`}>
                  <p className="flex justify-between"><span>Item Sale Price:</span> <span>$500.00</span></p>
                  <p className="flex justify-between"><span>Shipping Paid by Buyer:</span> <span>$25.00</span></p>
                  <p className="flex justify-between font-medium"><span>Total Sale:</span> <span>$525.00</span></p>
                </div>
                <div className={`pb-2 border-b ${isDark ? 'border-dark-300' : 'border-gray-300'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Fees Deducted:</p>
                  <p className="flex justify-between"><span>Platform Fee (3%):</span> <span className="text-red-400">-$15.75</span></p>
                  <p className="flex justify-between"><span>Payment Processing (3.19%):</span> <span className="text-red-400">-$16.75</span></p>
                  <p className="flex justify-between"><span>Payment Processing (Fixed):</span> <span className="text-red-400">-$0.49</span></p>
                  <p className="flex justify-between font-medium"><span>Total Fees:</span> <span className="text-red-400">-$32.99</span></p>
                </div>
                <div className="pt-1">
                  <p className="flex justify-between font-bold text-base">
                    <span className="text-primary">Your Payout:</span> 
                    <span className="text-primary">$492.01</span>
                  </p>
                </div>
              </div>
            </div>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Payment Processing Fees
            </h3>
            <p className="leading-relaxed mb-4">
              In addition to the platform fee, standard payment processing fees apply to all transactions. 
              These fees are charged by our payment processor and are deducted from your payout:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>3.19% + $0.49 per transaction for credit/debit card payments</li>
              <li>Processing fees vary by payment method and may be subject to change</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Promotional Fee Rates
            </h3>
            <p className="leading-relaxed">
              MicLocker occasionally offers promotional fee rates. Early adopters who joined as one of our 
              first 300 users enjoy <strong>0% Platform Fees For Life</strong>. Other promotional rates may 
              be offered during special events or for qualifying sellers.
            </p>
          </section>

          {/* How Fees Are Charged */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              How Fees Are Charged
            </h2>
            <p className="leading-relaxed mb-4">
              Fees are automatically deducted from your sale proceeds. You never need to pay fees separately 
              or maintain a balance to cover fees. Here's how it works:
            </p>
            <ol className="list-decimal list-inside space-y-3 ml-4">
              <li>
                <strong>Item Sells:</strong> A buyer purchases your item and payment is processed.
              </li>
              <li>
                <strong>Fees Deducted:</strong> Platform and payment processing fees are automatically 
                calculated and deducted from the sale amount.
              </li>
              <li>
                <strong>Payout Initiated:</strong> The remaining balance is prepared for payout to your 
                designated bank account.
              </li>
              <li>
                <strong>Funds Received:</strong> You receive your payout according to your payout schedule.
              </li>
            </ol>
          </section>

          {/* Payment Methods */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Accepted Payment Methods
            </h2>
            <p className="leading-relaxed mb-4">
              MicLocker accepts the following payment methods from buyers:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Major credit cards (Visa, Mastercard, American Express, Discover)</li>
              <li>Debit cards</li>
              <li>Additional payment methods may be available in certain regions</li>
            </ul>
            <p className="leading-relaxed mt-4">
              All payments are processed securely. MicLocker does not store complete credit card information 
              on our servers.
            </p>
          </section>

          {/* Payouts */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Receiving Your Payouts
            </h2>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Payout Methods
            </h3>
            <p className="leading-relaxed mb-4">
              Payouts are sent directly to your bank account. To receive payouts, you must:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Add and verify a bank account in your seller settings</li>
              <li>Complete any required identity verification</li>
              <li>Maintain accurate and up-to-date account information</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Payout Schedule
            </h3>
            <p className="leading-relaxed mb-4">
              Payouts are processed according to the following schedule:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Funds become available for payout after a brief holding period to allow for buyer protection</li>
              <li>Standard payouts are processed within 1-3 business days</li>
              <li>Bank processing times vary; funds typically arrive within 2-5 business days after payout is initiated</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Minimum Payout Amount
            </h3>
            <p className="leading-relaxed">
              There is no minimum payout amount. All earned funds will be paid out according to your payout schedule.
            </p>
          </section>

          {/* Refunds and Cancellations */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Refunds and Cancellations
            </h2>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              When a Refund Occurs
            </h3>
            <p className="leading-relaxed mb-4">
              If a transaction is refunded (due to cancellation, return, or dispute resolution), the 
              following applies:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>The platform fee is returned to you in full</li>
              <li>Payment processing fees are generally non-refundable (varies by processor)</li>
              <li>The refund amount is deducted from your available balance or future payouts</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Seller-Initiated Cancellations
            </h3>
            <p className="leading-relaxed">
              If you cancel a sale before shipping, the buyer receives a full refund. Frequent cancellations 
              may affect your seller standing and visibility on the platform.
            </p>
          </section>

          {/* Disputes */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Billing Disputes
            </h2>
            <p className="leading-relaxed mb-4">
              If you believe there is an error with any fees charged or payout amounts, please contact our 
              support team within 60 days of the transaction. We will review your case and provide a detailed 
              explanation or correction if warranted.
            </p>
            <p className="leading-relaxed">
              Contact us at <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline">info@miclockerapp.com</a> with 
              the subject line "Billing Dispute" and include relevant transaction details.
            </p>
          </section>

          {/* Tax Information */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Tax Information
            </h2>
            <p className="leading-relaxed mb-4">
              As a seller on MicLocker, you are responsible for understanding and complying with all 
              applicable tax obligations. This may include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Reporting income from sales on your tax returns</li>
              <li>Collecting and remitting sales tax where required</li>
              <li>Providing tax identification information when requested</li>
            </ul>
            <p className="leading-relaxed">
              MicLocker may be required to report your sales to tax authorities and provide you with tax 
              forms (such as Form 1099-K in the United States) if you meet certain thresholds. We recommend 
              consulting with a tax professional regarding your specific obligations.
            </p>
          </section>

          {/* Changes to Billing Policy */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Changes to This Policy
            </h2>
            <p className="leading-relaxed">
              MicLocker reserves the right to modify this Billing Policy at any time. Changes to fees will 
              be communicated via email and/or notice on the website at least 30 days before taking effect. 
              Continued use of the platform after changes become effective constitutes acceptance of the 
              modified policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Questions?
            </h2>
            <p className="leading-relaxed mb-4">
              If you have any questions about our billing practices or this policy, please contact us:
            </p>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className="mb-2">
                Email: <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline">info@miclockerapp.com</a>
              </p>
              <p>
                Support: <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
              </p>
            </div>
          </section>

          {/* Footer */}
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

export default BillingPolicyPage;
