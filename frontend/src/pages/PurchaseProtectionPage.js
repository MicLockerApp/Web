import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Shield, CheckCircle, AlertCircle, Clock, Package, MessageSquare, Heart } from 'lucide-react';

const PurchaseProtectionPage = () => {
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
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                MicLocker Purchase Protection
              </h1>
            </div>
          </div>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            We've got your back so you can focus on the music
          </p>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Effective Date: {currentDate}
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

        {/* Intro */}
        <div className={`p-6 rounded-xl mb-10 ${isDark ? 'bg-dark-400' : 'bg-white shadow-lg'}`}>
          <p className={`text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            At MicLocker, we understand the excitement of finding the perfect piece of gear and the trust 
            required when buying or selling online. While the vast majority of transactions on our platform 
            complete without any issues, we know that sometimes things don't go as planned. That's why we've 
            created purchase protection programs for both buyers and sellers to ensure everyone has a safe 
            and positive experience on MicLocker.
          </p>
        </div>

        {/* Content */}
        <div className={`space-y-12 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          
          {/* Important Notice */}
          <div className={`p-4 rounded-lg border-l-4 border-primary ${isDark ? 'bg-primary/10' : 'bg-yellow-50'}`}>
            <p className="leading-relaxed">
              <strong>Important:</strong> These Purchase Protection Terms are part of our{' '}
              <Link to="/legal/terms-of-use" className="text-primary hover:underline">Terms of Use</Link>. 
              The MicLocker Purchase Protection Programs are not insurance policies, warranties, or guarantees. 
              MicLocker has sole discretion in determining whether a transaction qualifies for protection. 
              We reserve the right to modify or discontinue these programs at any time.
            </p>
          </div>

          {/* Section 1: How to Resolve Issues */}
          <section>
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <MessageSquare className="w-6 h-6 text-primary" />
              1. How to Resolve Order Issues
            </h2>
            
            <p className="leading-relaxed mb-4">
              If you encounter a problem with an order, here's the process to follow:
            </p>

            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-bold">1</span>
                  </div>
                  <div>
                    <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Contact the Other Party First
                    </h4>
                    <p className="text-sm">
                      Use MicLocker's messaging system to contact the buyer or seller directly. Most issues 
                      can be resolved quickly through direct communication. Give the other party 24 hours to respond.
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-bold">2</span>
                  </div>
                  <div>
                    <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Contact MicLocker Support
                    </h4>
                    <p className="text-sm">
                      If you cannot resolve the issue directly, or if you don't receive a response within 
                      24 hours, contact our support team through the{' '}
                      <Link to="/help" className="text-primary hover:underline">Contact Support</Link> page.
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-bold">3</span>
                  </div>
                  <div>
                    <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Case Review & Resolution
                    </h4>
                    <p className="text-sm">
                      Our team will review the case, request any necessary documentation, and work toward 
                      a fair resolution for both parties.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Important Guidelines:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>You must have a registered MicLocker account to open a dispute</li>
                <li>Cases must be reported within 7 days of delivery (or 14 days of expected delivery for non-delivery)</li>
                <li>If you file a chargeback with your bank, your MicLocker case will be closed</li>
                <li>Keep all communication within MicLocker's messaging system for documentation</li>
              </ul>
            </div>
          </section>

          {/* Section 2: Buyer Protection */}
          <section>
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <CheckCircle className="w-6 h-6 text-green-500" />
              2. Buyer Purchase Protection
            </h2>
            
            <p className="leading-relaxed mb-6">
              MicLocker's Buyer Purchase Protection helps ensure you receive what you ordered. You may be 
              eligible for a full or partial refund if your purchase doesn't meet expectations.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Eligibility Requirements
            </h3>
            <p className="mb-4">To qualify for Buyer Purchase Protection, your order must:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-6">
              <li>Be purchased and paid for through MicLocker's platform</li>
              <li>Be reported within the eligible timeframe (7 days from delivery or 14 days from expected delivery)</li>
              <li>Have attempted resolution with the seller first (24-hour response window)</li>
              <li>Fall into one of the covered categories below</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              What's Covered
            </h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${isDark ? 'border-green-500/30 bg-green-500/10' : 'border-green-200 bg-green-50'}`}>
                <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                  <Package className="w-5 h-5" />
                  Item Not Received
                </h4>
                <p className="text-sm">
                  If your item never arrives and tracking shows it wasn't delivered, or if tracking shows 
                  delivery but you can demonstrate non-receipt, you may be eligible for a full refund.
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${isDark ? 'border-green-500/30 bg-green-500/10' : 'border-green-200 bg-green-50'}`}>
                <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                  <AlertCircle className="w-5 h-5" />
                  Item Damaged in Transit
                </h4>
                <p className="text-sm">
                  If your item arrives damaged due to shipping, document the damage with photos immediately 
                  upon receipt. You may be eligible for a refund or partial refund.
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${isDark ? 'border-green-500/30 bg-green-500/10' : 'border-green-200 bg-green-50'}`}>
                <h4 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                  <AlertCircle className="w-5 h-5" />
                  Item Significantly Not as Described
                </h4>
                <p className="text-sm">
                  If the item you receive is significantly different from the listing description or photos, 
                  including wrong model, missing parts, undisclosed damage, or misrepresented condition.
                </p>
              </div>
            </div>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Examples of "Not as Described"
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Different model, color, or version than advertised</li>
              <li>Missing parts or accessories that were listed as included</li>
              <li>Undisclosed damage, defects, or modifications</li>
              <li>Item listed as "new" but shows signs of use</li>
              <li>Incorrect quantity received</li>
              <li>Item is counterfeit or not authentic when advertised as genuine</li>
            </ul>
          </section>

          {/* Section 3: Seller Protection */}
          <section>
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Shield className="w-6 h-6 text-blue-500" />
              3. Seller Protection
            </h2>
            
            <p className="leading-relaxed mb-6">
              MicLocker also protects sellers who follow best practices. We understand that sometimes issues 
              arise even when you've done everything right. Our Seller Protection helps qualified sellers 
              maintain good standing when disputes occur through no fault of their own.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              How to Qualify for Seller Protection
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-6">
              <li>Complete all transactions through MicLocker's platform</li>
              <li>Use tracking numbers for all shipments</li>
              <li>Ship items within your stated processing time (or within 3 business days)</li>
              <li>Ship to the address provided on MicLocker (not alternate addresses from messages)</li>
              <li>Package items properly to prevent damage in transit</li>
              <li>Provide accurate, detailed descriptions and photos of your items</li>
              <li>Respond promptly to buyer inquiries and support requests (within 48 hours)</li>
              <li>Maintain your account in good standing (no policy violations)</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Best Practices for Sellers
            </h3>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Use quality packaging:</strong> Protect instruments with proper padding, cases, and weather-resistant materials</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Document everything:</strong> Take photos of the item and packaging before shipping</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Consider insurance:</strong> For high-value items, purchase shipping insurance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Be accurate:</strong> Describe item condition honestly, including any flaws or wear</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Communicate clearly:</strong> Keep buyers informed about shipping and any delays</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4: What's Not Covered */}
          <section>
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <AlertCircle className="w-6 h-6 text-red-500" />
              4. What's Not Covered
            </h2>
            
            <p className="leading-relaxed mb-4">
              Certain situations and transactions are not eligible for MicLocker Purchase Protection:
            </p>

            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Transactions conducted outside of MicLocker (in-person, off-platform payments)</li>
              <li>Buyer's remorse or change of mind when item matches description</li>
              <li>Items that meet the listing description but don't meet buyer's subjective expectations</li>
              <li>Returns outside of the seller's stated return policy</li>
              <li>Disputes reported after the eligible timeframe (7/14 days)</li>
              <li>Items altered, damaged, or modified after receipt</li>
              <li>Shipping delays due to carrier issues, weather, or other external factors</li>
              <li>Items shipped to forwarding services or alternate addresses</li>
              <li>Items returned without seller agreement</li>
              <li>Disputes where a chargeback has been filed with the bank</li>
              <li>Transactions where insufficient documentation is provided</li>
            </ul>
          </section>

          {/* Section 5: Resolution Process */}
          <section>
            <h2 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Clock className="w-6 h-6 text-primary" />
              5. Case Resolution Process
            </h2>
            
            <p className="leading-relaxed mb-4">
              When a case is opened with MicLocker Support, here's what to expect:
            </p>

            <ol className="list-decimal list-inside space-y-4 ml-4">
              <li>
                <strong>Case Review:</strong> Our team will review the details provided by both parties.
              </li>
              <li>
                <strong>Documentation Request:</strong> We may request photos, videos, tracking information, 
                or other evidence from either party.
              </li>
              <li>
                <strong>Response Required:</strong> Both parties must respond to requests within 48 hours 
                to keep the case active.
              </li>
              <li>
                <strong>Resolution:</strong> Based on the evidence and our policies, we will determine 
                an appropriate resolution which may include refunds, partial refunds, or case dismissal.
              </li>
            </ol>

            <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Resolution Authority
              </h4>
              <p className="text-sm">
                By using MicLocker, both buyers and sellers grant MicLocker the authority to resolve 
                disputes, which may include issuing refunds from seller proceeds when appropriate. 
                MicLocker's decision on case resolution is final, though we reserve the right to reopen 
                cases if new information becomes available.
              </p>
            </div>
          </section>

          {/* Section 6: Contact */}
          <section>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              6. Questions or Concerns?
            </h2>
            <p className="leading-relaxed mb-4">
              If you have questions about our Purchase Protection programs or need assistance with a 
              transaction, please contact us:
            </p>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className="mb-2">
                <strong>Support:</strong>{' '}
                <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
              </p>
              <p className="mb-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:info@miclockerapp.com" className="text-primary hover:underline">info@miclockerapp.com</a>
              </p>
              <p>
                <strong>Legal Inquiries:</strong>{' '}
                <a href="mailto:legal@miclockerapp.com" className="text-primary hover:underline">legal@miclockerapp.com</a>
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

export default PurchaseProtectionPage;
