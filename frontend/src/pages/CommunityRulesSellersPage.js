import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Store, Camera, MessageSquare, AlertTriangle, CheckCircle, DollarSign, Package, Clock, Shield, Ban, FileText } from 'lucide-react';

const CommunityRulesSellersPage = () => {
  const { isDark } = useTheme();

  const rules = [
    {
      icon: Camera,
      title: 'Create Accurate Listings',
      description: 'Your listings should honestly represent the item you are selling. Use your own photos, describe any flaws or damage, and list the correct condition.',
      tips: [
        'Use clear, well-lit photos of the actual item',
        'Describe all cosmetic and functional issues honestly',
        'Choose the correct condition category',
        'Include all relevant specifications and details',
        'Never use stock photos or images from other sellers'
      ]
    },
    {
      icon: DollarSign,
      title: 'Price Fairly',
      description: 'Set competitive, honest prices for your items. Manipulating prices or fees hurts the marketplace and drives away potential buyers.',
      tips: [
        'Research similar items to price competitively',
        'Include all costs in your listing price',
        'Never inflate shipping costs to avoid fees',
        'Honor the prices in your listings',
        'Consider using the Make an Offer feature for flexibility'
      ]
    },
    {
      icon: Package,
      title: 'Ship Promptly & Safely',
      description: 'Once a sale is made, ship the item within your stated handling time. Pack items securely to prevent damage during transit.',
      tips: [
        'Ship within your stated handling time',
        'Use appropriate packaging for musical equipment',
        'Provide valid tracking information',
        'Insure valuable items during shipping',
        'Communicate any delays immediately'
      ]
    },
    {
      icon: MessageSquare,
      title: 'Communicate Professionally',
      description: 'Respond to buyer inquiries promptly and professionally. Good communication builds trust and leads to more sales.',
      tips: [
        'Respond to messages within 24 hours',
        'Answer all questions thoroughly',
        'Be patient with first-time buyers',
        'Keep buyers informed about their orders',
        'Handle disputes calmly and professionally'
      ]
    },
    {
      icon: Clock,
      title: 'Handle Offers Fairly',
      description: 'When buyers make offers, respond promptly and negotiate in good faith. Do not accept offers you cannot fulfill.',
      tips: [
        'Respond to offers within 24-48 hours',
        'Counter-offer if the initial offer is too low',
        'Honor accepted offers - they are binding',
        'Decline offers politely if not interested',
        'Never accept multiple offers for the same item'
      ]
    },
    {
      icon: Shield,
      title: 'Follow Marketplace Policies',
      description: 'Adhere to all MicLocker policies regarding prohibited items, fees, and conduct. Violations can result in account suspension.',
      tips: [
        'Only sell items permitted on MicLocker',
        'Pay seller fees promptly',
        'Never ask buyers to pay outside the platform',
        'Report suspicious buyer activity',
        'Keep your account information up to date'
      ]
    }
  ];

  const prohibitedItems = [
    'Counterfeit or replica items',
    'Stolen merchandise',
    'Items with removed or altered serial numbers',
    'Weapons or items that can be easily converted to weapons',
    'Hazardous materials (e.g., leaking batteries)',
    'Items that infringe on intellectual property rights',
    'Non-music-related items',
    'Digital downloads or services'
  ];

  const violations = [
    'Listing items you do not own or cannot ship',
    'Significantly misrepresenting item condition',
    'Failing to ship items after payment',
    'Requesting payment outside of MicLocker',
    'Manipulating reviews or ratings',
    'Creating multiple accounts to circumvent restrictions',
    'Fee avoidance schemes',
    'Harassing buyers'
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
              <Store className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Community Rules: Sellers
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Last updated: January 15, 2026
              </p>
            </div>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            As a seller on MicLocker, you are the backbone of our marketplace. These guidelines help you succeed while maintaining a trustworthy community for all members.
          </p>
        </div>

        {/* Seller Benefits Callout */}
        <div className={`rounded-xl p-6 mb-10 ${isDark ? 'bg-primary/10 border border-primary/20' : 'bg-yellow-50 border border-yellow-200'}`}>
          <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-primary' : 'text-yellow-700'}`}>
            Why Sell on MicLocker?
          </h2>
          <ul className={`space-y-2 ${isDark ? 'text-yellow-300/80' : 'text-yellow-800'}`}>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Access to a passionate community of musicians and gear enthusiasts
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Low platform fees with transparent pricing
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Secure payment processing and seller protection
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Powerful tools to manage your listings and sales
            </li>
          </ul>
        </div>

        {/* Rules */}
        <div className="space-y-8 mb-12">
          {rules.map((rule, index) => (
            <div key={index} className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <rule.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {rule.title}
                  </h3>
                  <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                    {rule.description}
                  </p>
                </div>
              </div>
              <div className={`ml-16 p-4 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
                <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Seller Tips:</p>
                <ul className="space-y-2">
                  {rule.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className={`flex items-start gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Prohibited Items */}
        <div className={`rounded-xl p-6 mb-8 ${isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Ban className={`w-6 h-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            <h2 className={`text-xl font-semibold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
              Prohibited Items
            </h2>
          </div>
          <p className={`mb-4 ${isDark ? 'text-orange-300/80' : 'text-orange-800'}`}>
            The following items cannot be sold on MicLocker:
          </p>
          <ul className="space-y-2">
            {prohibitedItems.map((item, index) => (
              <li key={index} className={`flex items-start gap-2 ${isDark ? 'text-orange-300/80' : 'text-orange-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-2" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Violations */}
        <div className={`rounded-xl p-6 mb-10 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            <h2 className={`text-xl font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              Policy Violations
            </h2>
          </div>
          <p className={`mb-4 ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
            The following actions may result in listing removal, account suspension, or permanent ban:
          </p>
          <ul className="space-y-2">
            {violations.map((violation, index) => (
              <li key={index} className={`flex items-start gap-2 ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-2" />
                {violation}
              </li>
            ))}
          </ul>
        </div>

        {/* Fees Info */}
        <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
          <div className="flex items-center gap-3 mb-4">
            <FileText className={`w-6 h-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Understanding Seller Fees
            </h2>
          </div>
          <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            MicLocker charges a small platform fee on each successful sale to maintain the marketplace and provide seller tools. For complete details on our fee structure, payment processing, and payouts, please review our policies:
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/legal/billing-policy" className="text-primary hover:underline">Billing Policy</Link>
            <Link to="/legal/payouts" className="text-primary hover:underline">Payouts & Credits Policy</Link>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-12 pt-8 border-t text-center ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Questions about selling? <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommunityRulesSellersPage;
