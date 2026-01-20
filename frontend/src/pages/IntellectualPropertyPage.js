import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Shield, Copyright, AlertTriangle, FileText, CheckCircle, Mail, Scale, Ban, HelpCircle } from 'lucide-react';

const IntellectualPropertyPage = () => {
  const { isDark } = useTheme();

  const protectedContent = [
    {
      type: 'Trademarks',
      description: 'Brand names, logos, slogans, and other marks that identify products or services.',
      examples: 'Gibson®, Fender®, Marshall®, instrument brand logos'
    },
    {
      type: 'Copyrights',
      description: 'Original creative works including photos, text, music, and videos.',
      examples: 'Product photos, listing descriptions, user-generated content'
    },
    {
      type: 'Patents',
      description: 'Inventions and designs protected by patent law.',
      examples: 'Proprietary pickup designs, unique pedal circuits'
    },
    {
      type: 'Trade Dress',
      description: 'The visual appearance of a product or its packaging.',
      examples: 'Distinctive guitar body shapes, amp cabinet designs'
    }
  ];

  const reportSteps = [
    {
      step: 1,
      title: 'Identify the Infringement',
      description: 'Locate the specific listing or content that infringes on your intellectual property rights.'
    },
    {
      step: 2,
      title: 'Gather Documentation',
      description: 'Collect evidence of your ownership, such as trademark registrations, copyright certificates, or proof of original creation.'
    },
    {
      step: 3,
      title: 'Submit a Report',
      description: 'File an IP infringement report through our Help Center with all required information and documentation.'
    },
    {
      step: 4,
      title: 'Review Process',
      description: 'Our team will review your claim and take appropriate action, typically within 2-5 business days.'
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
            <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Copyright className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Intellectual Property Policy
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Last updated: January 15, 2026
              </p>
            </div>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            MicLocker respects intellectual property rights and expects all users to do the same. This policy outlines how we protect IP rights and handle infringement claims.
          </p>
        </div>

        {/* Our Commitment */}
        <section className="mb-12">
          <div className={`rounded-xl p-6 ${isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Shield className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                Our Commitment to IP Protection
              </h2>
            </div>
            <p className={isDark ? 'text-purple-300/80' : 'text-purple-800'}>
              MicLocker is committed to being a trusted marketplace where legitimate products are sold by honest sellers. We actively work to prevent the sale of counterfeit goods and remove content that infringes on the intellectual property rights of others.
            </p>
          </div>
        </section>

        {/* Types of IP */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Types of Intellectual Property
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {protectedContent.map((item, index) => (
              <div key={index} className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {item.type}
                </h3>
                <p className={`mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {item.description}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <strong>Examples:</strong> {item.examples}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What Is Prohibited */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Prohibited Activities
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Ban className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
              <h3 className={`text-lg font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                The following are strictly prohibited:
              </h3>
            </div>
            <ul className="space-y-3">
              <li className={`flex items-start gap-2 ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-2" />
                <span><strong>Counterfeit Products:</strong> Items bearing trademarks without authorization, including fake brand instruments, counterfeit effects pedals, and knockoff accessories.</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-2" />
                <span><strong>Image Theft:</strong> Using photographs from other sellers, manufacturers, or third parties without permission.</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-2" />
                <span><strong>Trademark Misuse:</strong> Using brand names or logos in a misleading way, such as claiming compatibility that does not exist.</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-2" />
                <span><strong>Copyright Infringement:</strong> Reproducing copyrighted materials, including music, manuals, or promotional content, without authorization.</span>
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-2" />
                <span><strong>Deceptive Descriptions:</strong> Misrepresenting items as being from a specific brand or having specific features they do not have.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* How to Report */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Reporting IP Infringement
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            If you believe your intellectual property rights have been violated on MicLocker, follow these steps:
          </p>
          <div className="space-y-4">
            {reportSteps.map((step) => (
              <div key={step.step} className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center font-bold flex-shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {step.title}
                    </h3>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DMCA Notice */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            DMCA Notice Requirements
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              For copyright claims under the Digital Millennium Copyright Act (DMCA), your notice must include:
            </p>
            <ul className="space-y-2 mb-6">
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                A physical or electronic signature of the copyright owner or authorized agent
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Identification of the copyrighted work claimed to be infringed
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Identification of the material to be removed with sufficient detail to locate it
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                Your contact information (address, phone number, email)
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                A statement that you have a good faith belief that the use is not authorized
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                A statement, under penalty of perjury, that the information is accurate
              </li>
            </ul>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-500' : 'bg-gray-50'}`}>
              <p className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Mail className="w-4 h-4" />
                Send DMCA notices to: <strong>legal@miclockerapp.com</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Counter-Notice */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Counter-Notification
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-dark-400' : 'bg-white shadow-md'}`}>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              If you believe your content was removed in error, you may submit a counter-notification. Your counter-notice must include:
            </p>
            <ul className="space-y-2 mb-4">
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                Your physical or electronic signature
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                Identification of the removed material and its former location
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                A statement under penalty of perjury that the removal was in error
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                Consent to jurisdiction in your judicial district
              </li>
            </ul>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <strong>Note:</strong> Filing a false counter-notification may result in legal consequences. Consult an attorney if you are unsure.
            </p>
          </div>
        </section>

        {/* Consequences */}
        <section className="mb-12">
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Consequences of Violations
          </h2>
          <div className={`rounded-xl p-6 ${isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className={`w-6 h-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
              <h3 className={`text-lg font-semibold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                Repeat Infringer Policy
              </h3>
            </div>
            <p className={`mb-4 ${isDark ? 'text-orange-300/80' : 'text-orange-800'}`}>
              MicLocker maintains a strict repeat infringer policy:
            </p>
            <ul className="space-y-2">
              <li className={`flex items-start gap-2 ${isDark ? 'text-orange-300/80' : 'text-orange-800'}`}>
                <span className="font-bold">First Offense:</span> Listing removed, warning issued
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-orange-300/80' : 'text-orange-800'}`}>
                <span className="font-bold">Second Offense:</span> Temporary account suspension
              </li>
              <li className={`flex items-start gap-2 ${isDark ? 'text-orange-300/80' : 'text-orange-800'}`}>
                <span className="font-bold">Third Offense:</span> Permanent account termination
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <div className={`mt-12 pt-8 border-t text-center ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Questions about intellectual property? <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntellectualPropertyPage;
