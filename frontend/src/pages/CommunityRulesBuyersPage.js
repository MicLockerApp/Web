import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, ShoppingCart, Shield, MessageSquare, AlertTriangle, CheckCircle, Star, CreditCard, Package, Users, Heart } from 'lucide-react';

const CommunityRulesBuyersPage = () => {
  const { isDark } = useTheme();

  const rules = [
    {
      icon: CheckCircle,
      title: 'Buy with Good Intent',
      description: 'Only make offers and purchases when you genuinely intend to complete the transaction. Backing out after an offer is accepted hurts sellers and damages marketplace trust.',
      tips: [
        'Review listings carefully before making offers',
        'Ask questions before committing to a purchase',
        'Only bid what you are prepared to pay',
        'Complete purchases promptly after winning or accepting offers'
      ]
    },
    {
      icon: MessageSquare,
      title: 'Communicate Respectfully',
      description: 'Keep all communications professional and courteous. Our messaging system is designed to help you connect with sellers, not to harass or spam.',
      tips: [
        'Be polite and professional in all messages',
        'Keep negotiations fair and reasonable',
        'Respond to seller inquiries promptly',
        'Never use threatening, abusive, or discriminatory language'
      ]
    },
    {
      icon: CreditCard,
      title: 'Use Legitimate Payment Methods',
      description: 'All transactions must go through MicLocker\'s secure checkout system. This protects both you and the seller with our Purchase Protection guarantee.',
      tips: [
        'Never pay sellers directly outside of MicLocker',
        'Report any seller asking for off-platform payment',
        'Use secure payment methods through our checkout',
        'Keep transaction records for your protection'
      ]
    },
    {
      icon: Star,
      title: 'Complete Reviews After Purchases',
      description: 'After your first purchase, you must review your seller before making another purchase. This helps maintain community trust and accountability.',
      tips: [
        'Rate based on the actual transaction experience',
        'Be specific about what went well or poorly',
        'Report item condition (as described, minor issues, damaged, etc.)',
        'You\'ll receive a reminder 5 days after purchase to leave a review',
        'First-time buyers are exempt from this requirement'
      ]
    },
    {
      icon: Package,
      title: 'Handle Returns Fairly',
      description: 'If you need to return an item, follow our returns policy and communicate clearly with the seller about any issues.',
      tips: [
        'Report issues within the return window',
        'Document any problems with photos',
        'Give sellers a chance to resolve issues first',
        'Return items in the same condition received'
      ]
    },
    {
      icon: Shield,
      title: 'Protect the Community',
      description: 'Help us maintain a safe marketplace by reporting suspicious activity and fraudulent listings.',
      tips: [
        'Report listings that seem too good to be true',
        'Flag counterfeit or stolen goods',
        'Report any requests for off-platform transactions',
        'Help other buyers by sharing legitimate concerns'
      ]
    },
    {
      icon: Users,
      title: 'Trading Rules',
      description: 'MicLocker allows direct trades between users with no platform fees! Each user gets 1 free trade per month.',
      tips: [
        'You can propose a trade for any active listing',
        'Trades are direct swaps with no money exchanged',
        'Both parties must ship their items after accepting',
        'Confirm receipt when you receive your traded item',
        'Open a dispute ticket if there are any issues'
      ]
    }
  ];

  const violations = [
    'Submitting false claims or fraudulent chargebacks',
    'Attempting to circumvent marketplace fees',
    'Harassing or threatening sellers',
    'Creating multiple accounts to abuse promotions',
    'Returning items that have been modified or damaged',
    'Attempting to purchase stolen or counterfeit goods knowingly',
    'Using automated tools to snipe listings unfairly',
    'Sharing seller personal information publicly',
    'Abusing the trade system to circumvent monthly limits'
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
            <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ShoppingCart className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Community Rules: Buyers
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Last updated: January 15, 2026
              </p>
            </div>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            MicLocker thrives because of our community of passionate musicians and gear enthusiasts. These guidelines help ensure everyone has a positive buying experience.
          </p>
        </div>

        {/* Our Commitment */}
        <div className={`rounded-xl p-6 mb-10 border-2 ${isDark ? 'bg-primary/5 border-primary/30' : 'bg-yellow-50 border-yellow-300'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-6 h-6 text-primary" />
            <h2 className={`text-xl font-bold ${isDark ? 'text-primary' : 'text-yellow-700'}`}>
              Our Commitment to You
            </h2>
          </div>
          <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            MicLocker is committed to offering the highest level of service and satisfaction. MicLocker will do everything in its power to make every transaction fair and honest. Our commitment is to make sure that all users, including buyers and sellers are satisfied with our services. We at MicLocker stand by our name and our promise of a fair and honest platform and we want to make a platform that users can trust. If there are any major complaints or disputes for any reason, please contact{' '}
            <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline font-medium">info@miclockerapp.com</a>
            {' '}and/or{' '}
            <Link to="/help" className="text-primary hover:underline font-medium">submit a ticket for support</Link>
            {' '}and every single message and ticket will be read. We will not let any dispute or issue go unresolved. That is our promise. That is our guarantee.
          </p>
        </div>

        {/* Introduction */}
        <div className={`rounded-xl p-6 mb-10 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
          <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
            Why These Rules Matter
          </h2>
          <p className={isDark ? 'text-blue-300/80' : 'text-blue-800'}>
            When buyers act in good faith, sellers are more willing to offer great deals, respond quickly, and provide excellent service. Following these guidelines protects you, supports our sellers, and keeps the MicLocker community strong.
          </p>
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
                <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Best Practices:</p>
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

        {/* Violations */}
        <div className={`rounded-xl p-6 mb-10 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            <h2 className={`text-xl font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              Prohibited Actions
            </h2>
          </div>
          <p className={`mb-4 ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
            The following behaviors may result in account suspension or permanent ban:
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

        {/* Purchase Protection Callout */}
        <div className={`rounded-xl p-6 ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <Shield className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            <h2 className={`text-xl font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              You Are Protected
            </h2>
          </div>
          <p className={isDark ? 'text-green-300/80' : 'text-green-800'}>
            Every purchase through MicLocker is covered by our Purchase Protection program. If an item does not arrive, is significantly not as described, or is defective, we will help resolve the issue. <Link to="/legal/purchase-protection" className="underline font-medium">Learn more about Purchase Protection</Link>.
          </p>
        </div>

        {/* Footer */}
        <div className={`mt-12 pt-8 border-t text-center ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Questions about these rules? <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommunityRulesBuyersPage;
