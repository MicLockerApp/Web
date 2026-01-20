import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage = () => {
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
            Privacy Policy
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            How we collect, use, and protect your personal information
          </p>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Effective Date: {currentDate}
          </p>
        </div>

        {/* Content */}
        <div className={`space-y-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          
          {/* Introduction */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Introduction
            </h2>
            <p className="leading-relaxed mb-4">
              MicLocker, LLC ("MicLocker," "we," "us," or "our") operates the MicLocker marketplace 
              platform, which allows musicians, audio engineers, recording studios, venues, and music 
              enthusiasts to buy, sell, and trade musical instruments and audio equipment. This Privacy 
              Policy explains how we collect, use, disclose, and safeguard your information when you 
              visit our website miclockerapp.com, use our mobile applications, or interact with our services.
            </p>
            <p className="leading-relaxed">
              By using MicLocker, you consent to the data practices described in this policy. If you 
              do not agree with our policies and practices, please do not use our Services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Information We Collect
            </h2>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Information You Provide Directly
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Information:</strong> Username, email address, password, and profile details</li>
              <li><strong>Profile Information:</strong> Category (Musician, Audio Engineer, Studio, Venue, Merchant), genres, instruments, specializations, bio, and profile photo</li>
              <li><strong>Contact Information:</strong> Phone number, mailing address, and social media handles</li>
              <li><strong>Transaction Information:</strong> Payment details, shipping addresses, purchase history, and sales records</li>
              <li><strong>Communications:</strong> Messages between users, support tickets, and feedback</li>
              <li><strong>Listing Content:</strong> Product descriptions, photos, videos, pricing, and shipping information</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Information Collected Automatically
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
              <li><strong>Usage Data:</strong> Pages viewed, search queries, listings browsed, and interaction patterns</li>
              <li><strong>Location Data:</strong> General geographic location based on IP address</li>
              <li><strong>Cookies and Tracking:</strong> Information collected through cookies, pixels, and similar technologies</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Information from Third Parties
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Payment Processors:</strong> Transaction confirmation and fraud prevention data</li>
              <li><strong>Social Media:</strong> Profile information if you connect social accounts</li>
              <li><strong>Identity Verification:</strong> Information from verification services when required</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              How We Use Your Information
            </h2>
            <p className="leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, maintain, and improve our marketplace services</li>
              <li>Process transactions and send related information</li>
              <li>Facilitate communication between buyers and sellers</li>
              <li>Send administrative notifications, updates, and security alerts</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Personalize your experience and provide relevant recommendations</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions and abuse</li>
              <li>Comply with legal obligations and enforce our terms</li>
              <li>Send promotional communications (with your consent)</li>
            </ul>
          </section>

          {/* How We Share Your Information */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              How We Share Your Information
            </h2>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              With Other Users
            </h3>
            <p className="leading-relaxed mb-4">
              When you engage in transactions, we share necessary information with the other party, 
              including your username, shipping address (for sellers), and communication through our 
              messaging system. Your public profile information is visible to other users.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              With Service Providers
            </h3>
            <p className="leading-relaxed mb-4">
              We share information with third-party vendors who perform services on our behalf, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Payment processing and fraud prevention</li>
              <li>Email and communication services</li>
              <li>Cloud hosting and data storage</li>
              <li>Analytics and performance monitoring</li>
              <li>Customer support tools</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              For Legal Reasons
            </h3>
            <p className="leading-relaxed">
              We may disclose information when required by law, to respond to legal process, to protect 
              our rights and property, to protect user safety, or to investigate potential violations 
              of our terms of service.
            </p>
          </section>

          {/* Your Privacy Choices */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Your Privacy Choices
            </h2>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Account Settings
            </h3>
            <p className="leading-relaxed mb-4">
              You can access and update your account information at any time through your profile settings. 
              You can choose which contact information to display publicly on your profile.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Communication Preferences
            </h3>
            <p className="leading-relaxed mb-4">
              You can opt out of promotional emails by clicking the unsubscribe link in any marketing email 
              or by updating your notification preferences. Note that you cannot opt out of transactional 
              communications related to your account or orders.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Cookie Preferences
            </h3>
            <p className="leading-relaxed mb-4">
              Most web browsers are set to accept cookies by default. You can usually modify your browser 
              settings to decline cookies if you prefer. Note that some features of our Services may not 
              function properly without cookies.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Data Access and Deletion
            </h3>
            <p className="leading-relaxed">
              You may request access to, correction of, or deletion of your personal information by 
              contacting us at <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline">info@miclockerapp.com</a>. 
              Please note that we may retain certain information as required by law or for legitimate 
              business purposes.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Data Security
            </h2>
            <p className="leading-relaxed mb-4">
              We implement appropriate technical and organizational security measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or destruction. 
              These measures include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Secure password hashing using industry-standard algorithms</li>
              <li>Regular security assessments and monitoring</li>
              <li>Access controls limiting employee access to personal data</li>
              <li>Secure hosting infrastructure with reputable providers</li>
            </ul>
            <p className="leading-relaxed mt-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure. 
              While we strive to protect your personal information, we cannot guarantee its absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Data Retention
            </h2>
            <p className="leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to 
              provide you services. We will retain and use your information as necessary to comply with 
              our legal obligations, resolve disputes, enforce our agreements, and for legitimate business 
              purposes such as maintaining transaction records for tax and accounting purposes.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Children's Privacy
            </h2>
            <p className="leading-relaxed">
              Our Services are not intended for individuals under the age of 18. We do not knowingly 
              collect personal information from children under 18. If we learn that we have collected 
              personal information from a child under 18, we will take steps to delete such information 
              as quickly as possible. If you believe we may have collected information from a child under 
              18, please contact us at <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline">info@miclockerapp.com</a>.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              International Data Transfers
            </h2>
            <p className="leading-relaxed">
              MicLocker is based in the United States. If you are accessing our Services from outside the 
              United States, please be aware that your information may be transferred to, stored, and 
              processed in the United States where our servers are located. By using our Services, you 
              consent to the transfer of information to countries outside your country of residence, 
              which may have different data protection rules.
            </p>
          </section>

          {/* California Privacy Rights */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              California Privacy Rights
            </h2>
            <p className="leading-relaxed mb-4">
              California residents have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Right to Know:</strong> Request information about the categories and specific pieces of personal information we have collected</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information, subject to certain exceptions</li>
              <li><strong>Right to Opt-Out:</strong> Opt out of the "sale" of personal information (note: we do not sell personal information)</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
            </ul>
            <p className="leading-relaxed mt-4">
              To exercise these rights, contact us at <a href="mailto:legal@miclockerapp.com" className="text-primary hover:underline">legal@miclockerapp.com</a>.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Changes to This Privacy Policy
            </h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. If we make material changes, we will 
              notify you by email or by posting a notice on our website prior to the change becoming 
              effective. We encourage you to review this Privacy Policy periodically for the latest 
              information on our privacy practices.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Contact Us
            </h2>
            <p className="leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className="mb-2"><strong>MicLocker, LLC</strong></p>
              <p className="mb-2">
                Email: <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline">info@miclockerapp.com</a>
              </p>
              <p className="mb-2">
                Legal Inquiries: <a href="mailto:legal@miclockerapp.com" className="text-primary hover:underline">legal@miclockerapp.com</a>
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

export default PrivacyPolicyPage;
