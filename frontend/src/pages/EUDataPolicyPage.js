import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Globe, Shield, Users, FileText, CheckCircle, Scale, Mail, Building, ArrowRight, Lock, Database, UserCheck, AlertCircle } from 'lucide-react';

const EUDataPolicyPage = () => {
  const { isDark } = useTheme();

  const gdprRights = [
    {
      right: 'Right to Access',
      description: 'You can request a copy of all personal data we hold about you.'
    },
    {
      right: 'Right to Rectification',
      description: 'You can request correction of inaccurate personal data.'
    },
    {
      right: 'Right to Erasure',
      description: 'You can request deletion of your personal data ("right to be forgotten").'
    },
    {
      right: 'Right to Data Portability',
      description: 'You can request your data in a structured, machine-readable format.'
    },
    {
      right: 'Right to Object',
      description: 'You can object to processing of your data for certain purposes.'
    },
    {
      right: 'Right to Restrict Processing',
      description: 'You can request that we limit how we use your data.'
    }
  ];

  const p2bRights = [
    {
      title: 'Ranking Transparency',
      description: 'We clearly disclose the main factors that determine how your listings appear in search results.',
      link: '/legal/search-ranking'
    },
    {
      title: 'Terms and Conditions',
      description: 'Our terms are written in plain language and you are notified of any changes with reasonable notice.',
      link: '/legal/terms-of-use'
    },
    {
      title: 'Complaint Handling',
      description: 'We have an internal system for handling complaints and provide reasons for any account restrictions.',
      link: '/help'
    },
    {
      title: 'Differentiated Treatment',
      description: 'We disclose any preferential treatment given to our own services or select partners.',
      link: null
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
            <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Globe className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                EU Data & Regulatory Policies
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Last updated: January 15, 2026
              </p>
            </div>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Information for users in the European Union regarding data protection, privacy rights, and platform-to-business regulations.
          </p>
        </div>

        {/* Table of Contents */}
        <section className="mb-12">
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>On This Page</h2>
            <div className="grid md:grid-cols-2 gap-2">
              <a href="#gdpr" className="text-primary hover:underline">GDPR Compliance</a>
              <a href="#data-transfer" className="text-primary hover:underline">International Data Transfers</a>
              <a href="#your-rights" className="text-primary hover:underline">Your Rights</a>
              <a href="#p2b" className="text-primary hover:underline">P2B Regulation Compliance</a>
              <a href="#dsa" className="text-primary hover:underline">Digital Services Act</a>
              <a href="#contact" className="text-primary hover:underline">Contact Information</a>
            </div>
          </div>
        </section>

        {/* GDPR Section */}
        <section id="gdpr" className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Shield className="w-6 h-6 text-primary" />
            GDPR Compliance
          </h2>
          <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={isDark ? 'text-blue-300/90' : 'text-blue-800'}>
              MicLocker complies with the General Data Protection Regulation (GDPR) for all users in the European Economic Area (EEA). We process your data lawfully, fairly, and transparently.
            </p>
          </div>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Legal Bases for Processing</h3>
            <div className="space-y-4">
              <div>
                <h4 className={`font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Contractual Necessity</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  We process data necessary to provide our marketplace services, including account management, transaction processing, and customer support.
                </p>
              </div>
              <div>
                <h4 className={`font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Legal Obligations</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  We retain certain data to comply with tax, fraud prevention, and other legal requirements.
                </p>
              </div>
              <div>
                <h4 className={`font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Legitimate Interests</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  We may process data to improve our services, prevent fraud, and communicate with you about your account.
                </p>
              </div>
              <div>
                <h4 className={`font-medium mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Consent</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  For marketing communications and non-essential cookies, we obtain your explicit consent.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Transfers */}
        <section id="data-transfer" className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Database className="w-6 h-6 text-primary" />
            International Data Transfers
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              MicLocker operates servers primarily in the United States. When we transfer personal data from the EEA to the US or other countries, we ensure appropriate safeguards are in place:
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Standard Contractual Clauses (SCCs)</h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    We use EU-approved Standard Contractual Clauses to govern international data transfers.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>EU-U.S. Data Privacy Framework</h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Where applicable, we rely on certified service providers under the Data Privacy Framework.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Supplementary Measures</h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    We implement additional technical and organizational measures, including encryption and access controls.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Your Rights */}
        <section id="your-rights" className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <UserCheck className="w-6 h-6 text-primary" />
            Your Rights Under GDPR
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {gdprRights.map((item, index) => (
              <div key={index} className={`rounded-xl p-5 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
                <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.right}</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.description}</p>
              </div>
            ))}
          </div>
          <div className={`mt-6 rounded-xl p-6 ${isDark ? 'bg-primary/10 border border-primary/20' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`flex items-start gap-2 ${isDark ? 'text-yellow-300/90' : 'text-yellow-800'}`}>
              <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>To exercise any of these rights, contact us at <strong>privacy@miclockerapp.com</strong>. We will respond within 30 days as required by GDPR.</span>
            </p>
          </div>
        </section>

        {/* P2B Regulation */}
        <section id="p2b" className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Users className="w-6 h-6 text-primary" />
            Platform-to-Business (P2B) Regulation
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            The EU Platform-to-Business Regulation promotes fairness and transparency for business users of online platforms. Here is how MicLocker complies:
          </p>
          <div className="space-y-4">
            {p2bRights.map((item, index) => (
              <div key={index} className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.description}</p>
                  </div>
                  {item.link && (
                    <Link to={item.link} className="text-primary hover:underline text-sm flex items-center gap-1 flex-shrink-0">
                      Learn more <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DSA Section */}
        <section id="dsa" className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Scale className="w-6 h-6 text-primary" />
            Digital Services Act (DSA)
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              MicLocker complies with the EU Digital Services Act. As an online marketplace, we have implemented:
            </p>
            <ul className="space-y-3">
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Content Moderation:</strong> Clear policies for reporting and removing illegal content</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Notice and Action:</strong> A mechanism for users to report illegal content</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Transparency:</strong> Annual reports on content moderation activities</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Seller Verification:</strong> Know Your Business Customer processes for sellers</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Mail className="w-6 h-6 text-primary" />
            Contact Information
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Data Protection Officer</h3>
                <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  For GDPR-related inquiries:
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Email:</strong> dpo@miclockerapp.com
                </p>
              </div>
              <div>
                <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>EU Representative</h3>
                <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Our representative in the EU:
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Email:</strong> eu-rep@miclockerapp.com
                </p>
              </div>
            </div>
            <div className={`mt-6 pt-6 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'} flex-shrink-0 mt-0.5`} />
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  If you are unsatisfied with our response to a privacy concern, you have the right to lodge a complaint with your local Data Protection Authority.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Related Links */}
        <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Related Policies</h3>
          <div className="flex flex-wrap gap-4">
            <Link to="/legal/privacy-policy" className="flex items-center gap-1 text-primary hover:underline">
              Privacy Policy <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/legal/terms-of-use" className="flex items-center gap-1 text-primary hover:underline">
              Terms of Use <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/legal/search-ranking" className="flex items-center gap-1 text-primary hover:underline">
              Search Ranking Disclosures <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-12 pt-8 border-t text-center ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Questions about EU regulations? <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EUDataPolicyPage;
