import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, DollarSign, Wallet, Clock, CreditCard, Building, AlertCircle, CheckCircle, HelpCircle, Gift, ArrowRight } from 'lucide-react';

const PayoutsAndCreditsPage = () => {
  const { isDark } = useTheme();

  const payoutMethods = [
    {
      icon: Building,
      name: 'Direct Deposit (ACH)',
      description: 'Funds transferred directly to your US bank account',
      timing: '1-3 business days',
      fee: 'Free',
      details: 'Available for US sellers with a verified bank account. Fastest and most secure method.'
    },
    {
      icon: CreditCard,
      name: 'Stripe',
      description: 'Instant transfer to your Stripe account after user declares that they have received the item or 14 days, whichever comes first',
      timing: 'Instant',
      fee: 'Free',
      details: 'Must have a verified Stripe account linked to your MicLocker profile.'
    },
    {
      icon: Wallet,
      name: 'MicLocker Credits',
      description: 'Keep funds as credits to use on MicLocker',
      timing: 'Instant',
      fee: 'Free',
      details: 'Use credits to buy gear or pay seller fees. Credits never expire.'
    }
  ];

  const payoutSchedule = [
    {
      scenario: 'Standard Sale',
      description: 'Buyer confirms delivery or 14 days pass without issues',
      releaseTime: 'After delivery confirmation or 14 days, whichever comes first'
    },
    {
      scenario: 'Buyer Confirms Receipt',
      description: 'Buyer explicitly confirms they received the item',
      releaseTime: 'Immediate release upon confirmation'
    },
    {
      scenario: 'No Response from Buyer',
      description: 'Buyer does not confirm or dispute within the review window',
      releaseTime: '14 days after delivery'
    },
    {
      scenario: 'Dispute Filed',
      description: 'Buyer files a dispute or reports an issue',
      releaseTime: 'Held until dispute is resolved'
    }
  ];

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
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Payouts and Credits Policy
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Last updated: January 15, 2026
              </p>
            </div>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Learn how and when you get paid for your sales on MicLocker, and how to manage your credits balance.
          </p>
        </div>

        {/* How Payouts Work */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            How Payouts Work
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Sale Completed</h3>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>A buyer purchases your item and payment is processed through MicLocker.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>You Ship the Item</h3>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Ship the item within your stated handling time and provide tracking information.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Item Delivered</h3>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Tracking shows the item has been delivered to the buyer.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
                <div>
                  <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Funds Released</h3>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>After the holding period, your funds are released and available for payout.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Payout Methods */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Payout Methods
          </h2>
          <div className="space-y-4">
            {payoutMethods.map((method, index) => (
              <div key={index} className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <method.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {method.name}
                      </h3>
                      <span className="badge bg-green-500/20 text-green-400">{method.fee}</span>
                    </div>
                    <p className={`mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{method.description}</p>
                    <div className="flex items-center gap-4">
                      <span className={`flex items-center gap-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock className="w-4 h-4" />
                        {method.timing}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{method.details}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Payout Schedule */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Payout Release Schedule
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            We hold funds temporarily to protect both buyers and sellers. Here is when your funds become available:
          </p>
          <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <table className="w-full">
              <thead className={isDark ? 'bg-dark-500' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Scenario</th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Fund Release</th>
                </tr>
              </thead>
              <tbody>
                {payoutSchedule.map((item, index) => (
                  <tr key={index} className={`border-t ${isDark ? 'border-dark-300' : 'border-gray-100'}`}>
                    <td className="px-6 py-4">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.scenario}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
                    </td>
                    <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.releaseTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* MicLocker Credits */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Gift className="w-6 h-6 text-primary" />
            MicLocker Credits
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-primary/10 border border-primary/20' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`mb-4 ${isDark ? 'text-yellow-300/90' : 'text-yellow-800'}`}>
              MicLocker Credits are a convenient way to keep your earnings on the platform. You can use them to:
            </p>
            <ul className="space-y-2 mb-4">
              <li className={`flex items-center gap-2 ${isDark ? 'text-yellow-300/90' : 'text-yellow-800'}`}>
                <CheckCircle className="w-4 h-4" />
                Purchase gear from other sellers
              </li>
              <li className={`flex items-center gap-2 ${isDark ? 'text-yellow-300/90' : 'text-yellow-800'}`}>
                <CheckCircle className="w-4 h-4" />
                Pay seller fees and promotional costs
              </li>
              <li className={`flex items-center gap-2 ${isDark ? 'text-yellow-300/90' : 'text-yellow-800'}`}>
                <CheckCircle className="w-4 h-4" />
                Convert to cash via payout at any time
              </li>
            </ul>
            <p className={`text-sm ${isDark ? 'text-yellow-400/80' : 'text-yellow-700'}`}>
              <strong>Credits never expire</strong> and can be withdrawn at any time with no additional fees.
            </p>
          </div>
        </section>

        {/* Important Notes */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Important Information
          </h2>
          <div className="space-y-4">
            <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <div>
                  <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Payout Holds</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    If a buyer opens a case or dispute, funds will be held until the issue is resolved. This protects both parties during the resolution process.
                  </p>
                </div>
              </div>
            </div>
            <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <div>
                  <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Minimum Payout</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    There is no minimum payout amount. You can withdraw any available balance at any time.
                  </p>
                </div>
              </div>
            </div>
            <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <div>
                  <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tax Reporting</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    MicLocker will issue a 1099-K to US sellers who meet IRS reporting thresholds. You are responsible for reporting all income from sales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Related Policies */}
        <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Related Policies</h3>
          <div className="flex flex-wrap gap-4">
            <Link to="/legal/billing-policy" className="flex items-center gap-1 text-primary hover:underline">
              Billing Policy <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/legal/sellers" className="flex items-center gap-1 text-primary hover:underline">
              Seller Rules <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-12 pt-8 border-t text-center ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Questions about payouts? <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayoutsAndCreditsPage;
