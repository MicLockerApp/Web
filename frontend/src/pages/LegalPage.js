import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { FileText, Shield, Users, CreditCard } from 'lucide-react';

const LegalPage = () => {
  const { isDark } = useTheme();

  const sections = [
    {
      icon: FileText,
      title: 'Terms of Use',
      description: 'The legal stuff you\'re agreeing to when you use our sites.',
      links: [
        { name: 'Terms of Use', path: '/legal/terms-of-use' },
        { name: 'API Terms of Use', path: '/legal/api-terms' },
        { name: 'Purchase Protection Terms', path: '/legal/purchase-protection' }
      ]
    },
    {
      icon: Shield,
      title: 'Privacy Policy',
      description: 'How we protect the information you give us and your rights as a user.',
      links: [
        { name: 'Privacy Policy', path: '/legal/privacy-policy' },
        { name: 'Cookies Policy', path: '/legal/cookies-policy' },
        { name: 'Intellectual Property Policy', path: '/legal/intellectual-property' }
      ]
    },
    {
      icon: Users,
      title: 'Community Rules',
      description: 'The standards we expect our users to adhere to when participating in our community.',
      links: [
        { name: 'Community Rules: Buyers', path: '/legal/buyers' },
        { name: 'Community Rules: Sellers', path: '/legal/sellers' }
      ]
    },
    {
      icon: CreditCard,
      title: 'Billing and Payments',
      description: 'Information about how payments work on MicLocker.',
      links: [
        { name: 'Billing Policy', path: '/legal/billing-policy' },
        { name: 'Payouts and Credits Policy', path: '/legal/payouts' },
        { name: 'Promotional Terms', path: '/legal/promotions' }
      ]
    }
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            MicLocker Terms & Policies
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Everything you need to know about using MicLocker
          </p>
        </div>

        {/* Sections Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {sections.map((section, index) => (
            <div 
              key={index}
              className={`rounded-2xl p-8 ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}
            >
              {/* Section Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {section.title}
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {section.description}
                  </p>
                </div>
              </div>

              {/* Links */}
              <div className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <Link
                    key={linkIndex}
                    to={link.path}
                    className={`block py-2 px-4 rounded-lg transition-colors ${
                      isDark 
                        ? 'text-primary hover:bg-dark-300' 
                        : 'text-primary hover:bg-gray-50'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`text-center mt-12 pt-8 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Last Updated: January 15, 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
