import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Copyright, AlertTriangle, Flag, Ban } from 'lucide-react';

const IntellectualPropertyPage = () => {
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
              <Copyright className="w-8 h-8 text-primary" />
            </div>
            <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Intellectual Property Policy
            </h1>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            How MicLocker handles copyright and trademark matters
          </p>
        </div>

        <div className={`space-y-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          
          <div className={`p-6 rounded-xl ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}>
            <p className="leading-relaxed">
              MicLocker takes intellectual property infringement very seriously. We comply with 
              intellectual property laws and industry best practices to maintain the integrity of 
              our marketplace. This policy is part of our{' '}
              <Link to="/legal/terms-of-use" className="text-primary hover:underline">Terms of Use</Link>.
            </p>
          </div>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Flag className="w-6 h-6 text-primary" />
              1. Reporting Infringement
            </h2>
            <p className="mb-4">
              MicLocker strives to respond quickly when we receive a valid report of intellectual 
              property infringement. We will remove or disable access to allegedly infringing material.
            </p>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              How to Report
            </h3>
            <p className="mb-4">
              If you believe your intellectual property rights have been infringed:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Flag the listing for review through our platform</li>
              <li>Provide details about your claimed right</li>
              <li>Identify the specific content you believe is infringing</li>
              <li>Include your contact information</li>
            </ol>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Copyright Infringement (DMCA)
            </h3>
            <p className="mb-4">
              For copyright-specific infringement, you may also contact MicLocker's designated 
              Digital Millennium Copyright Act (DMCA) agent. A valid DMCA notice should include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your physical or electronic signature</li>
              <li>Identification of the copyrighted work claimed to be infringed</li>
              <li>Identification of the infringing material and its location on our site</li>
              <li>Your contact information (address, phone, email)</li>
              <li>A statement of good faith belief that the use is not authorized</li>
              <li>A statement, under penalty of perjury, that your notice is accurate</li>
            </ul>

            <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className="font-semibold mb-2">Send DMCA notices to:</p>
              <p>Email: <a href="mailto:legal@miclockerapp.com" className="text-primary hover:underline">legal@miclockerapp.com</a></p>
              <p className="text-sm mt-2">Subject line: "DMCA Notice"</p>
            </div>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              2. What Happens After a Report
            </h2>
            <p className="mb-4">
              When MicLocker receives a valid infringement report:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>We review the report for completeness and validity</li>
              <li>If valid, we remove or disable access to the allegedly infringing content</li>
              <li>We make a reasonable attempt to notify the affected user</li>
              <li>We may provide a copy of the report to the affected user, including reporter's name and email</li>
              <li>The affected user may have the opportunity to respond or file a counter-notice</li>
            </ul>

            <div className={`mt-4 p-4 rounded-lg border-l-4 border-yellow-500 ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-50'}`}>
              <p className="text-sm">
                <strong>Note:</strong> MicLocker may request additional information before processing 
                a report, such as identity verification or documentation. We may reject reports that 
                appear to be false, fraudulent, or submitted in bad faith.
              </p>
            </div>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Ban className="w-6 h-6 text-red-500" />
              3. Repeat Infringement
            </h2>
            <p className="mb-4">
              MicLocker terminates account privileges for users who are subject to repeat or 
              multiple notices of intellectual property infringement.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Repeat infringers will have their accounts terminated</li>
              <li>We reserve the right to refuse service to terminated users who attempt to create new accounts</li>
              <li>These actions apply to all accounts we believe are associated with the affected user</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              4. Counter-Notices
            </h2>
            <p className="mb-4">
              If you believe your content was wrongly removed due to a copyright claim, you may 
              file a counter-notice. A valid counter-notice must include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your physical or electronic signature</li>
              <li>Identification of the removed material and its previous location</li>
              <li>A statement under penalty of perjury that the material was removed by mistake</li>
              <li>Your name, address, and phone number</li>
              <li>Consent to jurisdiction of federal court in your district</li>
              <li>Agreement to accept service from the complaining party</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              5. Trademark Matters
            </h2>
            <p className="mb-4">
              MicLocker also respects trademark rights. If you believe a listing infringes your 
              trademark, please contact us with:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>The trademark at issue (word mark, logo, registration number if applicable)</li>
              <li>The specific listing(s) you believe are infringing</li>
              <li>The basis for your trademark claim</li>
              <li>Your contact information</li>
            </ul>
          </section>

          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Contact Us
            </h2>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className="mb-2">
                <strong>IP Concerns:</strong>{' '}
                <a href="mailto:legal@miclockerapp.com" className="text-primary hover:underline">legal@miclockerapp.com</a>
              </p>
              <p className="mb-2">
                <strong>General Support:</strong>{' '}
                <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
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

export default IntellectualPropertyPage;