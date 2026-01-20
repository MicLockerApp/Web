import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import VinylLogo from '../components/VinylLogo';
import { 
  FileText, Shield, Users, CreditCard, Globe, Search, Copyright, 
  ChevronRight, Scale, ShoppingCart, Store, Wallet, ArrowRight
} from 'lucide-react';

const LegalPage = () => {
  const { isDark } = useTheme();

  // Featured/primary policies
  const featuredPolicies = [
    {
      icon: FileText,
      title: 'Terms of Use',
      description: 'The terms and conditions that govern your use of MicLocker',
      path: '/legal/terms-of-use',
      color: 'blue'
    },
    {
      icon: Shield,
      title: 'Privacy Policy',
      description: 'How we collect, use, and protect your personal information',
      path: '/legal/privacy-policy',
      color: 'green'
    },
    {
      icon: Scale,
      title: 'Purchase Protection',
      description: 'Our buyer protection program that safeguards every transaction',
      path: '/legal/purchase-protection',
      color: 'purple'
    }
  ];

  // All policy sections
  const sections = [
    {
      title: 'For Buyers',
      icon: ShoppingCart,
      color: 'blue',
      policies: [
        { name: 'Community Rules: Buyers', path: '/legal/buyers', description: 'Guidelines for a great buying experience' },
        { name: 'Purchase Protection', path: '/legal/purchase-protection', description: 'How we protect your purchases' },
        { name: 'Return Policy', path: '/returns', description: 'How returns and refunds work' }
      ]
    },
    {
      title: 'For Sellers',
      icon: Store,
      color: 'green',
      policies: [
        { name: 'Community Rules: Sellers', path: '/legal/sellers', description: 'Standards for selling on MicLocker' },
        { name: 'Billing Policy', path: '/legal/billing-policy', description: 'How fees and charges work' },
        { name: 'Payouts & Credits', path: '/legal/payouts', description: 'How and when you get paid' }
      ]
    },
    {
      title: 'Privacy & Data',
      icon: Shield,
      color: 'purple',
      policies: [
        { name: 'Privacy Policy', path: '/legal/privacy-policy', description: 'Your data and how we use it' },
        { name: 'Intellectual Property', path: '/legal/intellectual-property', description: 'Copyright and trademark policies' },
        { name: 'EU Data & GDPR Policy', path: '/legal/eu-policy', description: 'Rights for EU users' }
      ]
    },
    {
      title: 'Marketplace',
      icon: Globe,
      color: 'yellow',
      policies: [
        { name: 'Terms of Use', path: '/legal/terms-of-use', description: 'Overall terms of service' },
        { name: 'Search & Ad Ranking', path: '/legal/search-ranking', description: 'How search results are ordered' }
      ]
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
        text: 'text-blue-500',
        border: isDark ? 'border-blue-500/30' : 'border-blue-200',
        hover: isDark ? 'hover:bg-blue-500/30' : 'hover:bg-blue-50'
      },
      green: {
        bg: isDark ? 'bg-green-500/20' : 'bg-green-100',
        text: 'text-green-500',
        border: isDark ? 'border-green-500/30' : 'border-green-200',
        hover: isDark ? 'hover:bg-green-500/30' : 'hover:bg-green-50'
      },
      purple: {
        bg: isDark ? 'bg-purple-500/20' : 'bg-purple-100',
        text: 'text-purple-500',
        border: isDark ? 'border-purple-500/30' : 'border-purple-200',
        hover: isDark ? 'hover:bg-purple-500/30' : 'hover:bg-purple-50'
      },
      yellow: {
        bg: isDark ? 'bg-primary/20' : 'bg-yellow-100',
        text: 'text-primary',
        border: isDark ? 'border-primary/30' : 'border-yellow-200',
        hover: isDark ? 'hover:bg-primary/30' : 'hover:bg-yellow-50'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-600' : 'bg-gray-50'}`}>
      {/* Hero Section */}
      <div className={`relative overflow-hidden ${isDark ? 'bg-dark-500' : 'bg-gray-900'}`}>
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
                <VinylLogo size={80} spinning={true} />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              Legal <span className="text-primary">&</span> Policies
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to know about using MicLocker, from our terms of service to how we protect your data
            </p>
          </div>
        </div>
        
        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={isDark ? 'text-dark-600' : 'text-gray-50'}>
            <path fill="currentColor" d="M0,80 L1440,80 L1440,40 C1200,80 960,0 720,40 C480,80 240,0 0,40 Z" />
          </svg>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Featured Policies */}
        <div className="mb-16">
          <h2 className={`text-sm font-semibold uppercase tracking-wider mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Most Viewed
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredPolicies.map((policy, index) => {
              const colors = getColorClasses(policy.color);
              return (
                <Link
                  key={index}
                  to={policy.path}
                  className={`group relative rounded-2xl p-6 border-2 transition-all duration-300 ${
                    isDark ? 'bg-dark-400 border-dark-300 hover:border-primary' : 'bg-white border-gray-100 hover:border-primary shadow-lg'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <policy.icon className={`w-7 h-7 ${colors.text}`} />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {policy.title}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {policy.description}
                  </p>
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Policy Sections */}
        <div className="grid md:grid-cols-2 gap-8">
          {sections.map((section, sectionIndex) => {
            const colors = getColorClasses(section.color);
            return (
              <div 
                key={sectionIndex}
                className={`rounded-2xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}
              >
                {/* Section Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                    <section.icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {section.title}
                  </h2>
                </div>

                {/* Policy Links */}
                <div className="space-y-2">
                  {section.policies.map((policy, policyIndex) => (
                    <Link
                      key={policyIndex}
                      to={policy.path}
                      className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                        isDark 
                          ? 'hover:bg-dark-300' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {policy.name}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          {policy.description}
                        </p>
                      </div>
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links Bar */}
        <div className={`mt-16 rounded-2xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}>
          <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {[
              { name: 'Terms of Use', path: '/legal/terms-of-use' },
              { name: 'Privacy Policy', path: '/legal/privacy-policy' },
              { name: 'Billing Policy', path: '/legal/billing-policy' },
              { name: 'Purchase Protection', path: '/legal/purchase-protection' },
              { name: 'Buyer Rules', path: '/legal/buyers' },
              { name: 'Seller Rules', path: '/legal/sellers' },
              { name: 'Payouts', path: '/legal/payouts' },
              { name: 'IP Policy', path: '/legal/intellectual-property' },
              { name: 'Search Ranking', path: '/legal/search-ranking' },
              { name: 'EU/GDPR', path: '/legal/eu-policy' },
              { name: 'Return Policy', path: '/returns' }
            ].map((link, index) => (
              <Link
                key={index}
                to={link.path}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isDark 
                    ? 'bg-dark-300 text-gray-300 hover:bg-dark-200 hover:text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Help CTA */}
        <div className={`mt-12 rounded-2xl p-8 text-center ${isDark ? 'bg-primary/10 border border-primary/20' : 'bg-yellow-50 border border-yellow-200'}`}>
          <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Have Questions?
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Our support team is here to help you understand our policies and resolve any concerns.
          </p>
          <Link
            to="/help"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-yellow-400 text-black font-semibold rounded-xl transition-colors"
          >
            Contact Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Footer */}
        <div className={`mt-12 pt-8 border-t text-center ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Last Updated: January 15, 2026 &bull; © {new Date().getFullYear()} MicLocker. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
