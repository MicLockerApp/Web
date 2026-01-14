import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const ReturnPolicyPage = () => {
  return (
    <div className="min-h-screen py-12 px-4" data-testid="return-policy-page">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-primary mb-8">
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Return Policy</h1>
          <div className="text-gray-400 text-sm space-y-1">
            <p><strong>Effective Date:</strong> January 14, 2026</p>
            <p><strong>Last Updated:</strong> January 14, 2026</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-dark-400 rounded-xl p-8 space-y-8">
          {/* Intro */}
          <p className="text-gray-300 leading-relaxed">
            This Return Policy ("Policy") governs all purchases, sales, and trades conducted through the MicLocker platform ("MicLocker," "Company," "we," "us," or "our"). By using the MicLocker website, mobile applications, or related services (collectively, the "Platform"), users agree to be bound by this Policy in its entirety.
          </p>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">1. Scope and Applicability</h2>
            <div className="text-gray-300 leading-relaxed space-y-4">
              <p>
                This Policy applies to all musical instruments, audio equipment, accessories, merchandise, and related goods (collectively, "Items") bought, sold, or traded through the Platform, unless otherwise expressly stated in writing by MicLocker.
              </p>
              <p>
                MicLocker operates as a marketplace platform and is not the direct seller of most Items listed. Individual users ("Sellers" and "Buyers") transact with one another subject to this Policy, MicLocker's Terms of Service, and any applicable laws.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">2. Standard 60-Day Return Requirement</h2>
            
            <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.1 Mandatory Seller Acceptance</h3>
            <p className="text-gray-300 leading-relaxed">
              All Sellers on the Platform are required to accept returns for a period of sixty (60) calendar days from the date the Item is marked as delivered to the Buyer, provided the return request meets the conditions set forth in this Policy.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.2 Condition of Returned Items</h3>
            <p className="text-gray-300 leading-relaxed">
              Returned Items must be in the same condition, or in a reasonably similar condition, as when originally sold. Reasonable wear consistent with ordinary inspection or testing of musical gear is permitted. Excessive wear, modification, misuse, neglect, or intentional damage is not permitted.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.3 Reasonableness Standard</h3>
            <p className="text-gray-300 leading-relaxed mb-3">
              The determination of whether an Item is in a "reasonable" condition shall be made in good faith, taking into account:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>The nature of the Item,</li>
              <li>The Item's age and condition at the time of sale,</li>
              <li>Industry norms for used musical instruments and gear.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">3. Damage or Destruction After 30 Days</h2>
            
            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.1 Post-30-Day Risk Allocation</h3>
            <p className="text-gray-300 leading-relaxed mb-3">
              If more than thirty (30) days have elapsed since the Item was shipped and the Item is subsequently:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-3">
              <li>Destroyed, or</li>
              <li>Damaged beyond its initial condition at the time of purchase,</li>
            </ul>
            <p className="text-gray-300 leading-relaxed">
              such that its market value is significantly reduced, then any refund shall be entirely at the Seller's discretion.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.2 Seller Discretion</h3>
            <p className="text-gray-300 leading-relaxed">
              In such circumstances, MicLocker shall not compel a Seller to issue a refund, whether full or partial. The Seller's decision shall be final, subject only to applicable law.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">4. Trades and Trade Transactions</h2>
            
            <h3 className="text-lg font-semibold text-white mt-6 mb-3">4.1 Finality of Trades</h3>
            <p className="text-gray-300 leading-relaxed">
              All trades conducted through the Platform are final.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">4.2 No Platform-Issued Refunds for Trades</h3>
            <p className="text-gray-300 leading-relaxed">
              MicLocker does not issue refunds, credits, or reversals for trade transactions under any circumstances.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">4.3 Private Resolution</h3>
            <p className="text-gray-300 leading-relaxed">
              Any dispute arising from a trade, including but not limited to dissatisfaction, misrepresentation, or a desire to reverse the trade, must be resolved solely between the participating users. MicLocker assumes no responsibility or liability for trade reversals.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">5. Requests After the 60-Day Period</h2>
            
            <h3 className="text-lg font-semibold text-white mt-6 mb-3">5.1 Seller-Initiated Company Review</h3>
            <p className="text-gray-300 leading-relaxed">
              If a Buyer seeks a refund after sixty (60) days, the Seller may, at their sole discretion, contact MicLocker to request a partial refund review.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">5.2 Company Discretion</h3>
            <p className="text-gray-300 leading-relaxed">
              Any refund issued after the 60-day period is entirely at MicLocker's discretion. MicLocker is under no obligation to approve such requests.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">5.3 Return to Company Custody</h3>
            <p className="text-gray-300 leading-relaxed mb-3">
              No refund—partial or otherwise—will be issued unless and until:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>The Item is returned to MicLocker,</li>
              <li>The Item is received, verified, and placed under MicLocker's custody and control.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">5.4 Reduced Refund Amount</h3>
            <p className="text-gray-300 leading-relaxed mb-3">
              Any approved refund issued under this section shall be for an amount less than the original purchase price, as determined by MicLocker, in order to account for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Depreciation,</li>
              <li>Handling and logistics costs,</li>
              <li>Administrative expenses,</li>
              <li>Any loss in resale value.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">6. Non-Refundable Costs</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              Unless required by law, the following are non-refundable:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Shipping fees,</li>
              <li>Payment processing fees,</li>
              <li>Insurance or handling charges,</li>
              <li>Any fees explicitly identified as non-refundable at checkout.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">7. Abuse, Fraud, and Misrepresentation</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              MicLocker reserves the right to deny any return or refund request if it determines, in its sole discretion, that a user has engaged in:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
              <li>Fraudulent activity,</li>
              <li>Return abuse,</li>
              <li>Misrepresentation of Item condition,</li>
              <li>Bad-faith conduct.</li>
            </ul>
            <p className="text-gray-300 leading-relaxed">
              Repeated abuse may result in account suspension or termination.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              MicLocker acts solely as a platform provider and shall not be liable for:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
              <li>Decisions made by Sellers regarding refunds,</li>
              <li>The condition, quality, or performance of Items,</li>
              <li>Losses arising from trades or Seller-discretion refunds.</li>
            </ul>
            <p className="text-gray-300 leading-relaxed">
              To the maximum extent permitted by law, MicLocker disclaims all liability related to return disputes between users.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">9. Modifications to This Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              MicLocker reserves the right to modify this Return Policy at any time. Continued use of the Platform following any changes constitutes acceptance of the revised Policy.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">10. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              This Policy shall be governed by and construed in accordance with the laws specified in MicLocker's Terms of Service, without regard to conflict-of-law principles.
            </p>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-dark-300 text-center">
            <p className="text-gray-400 font-semibold">MicLocker, Inc.</p>
            <p className="text-gray-500 text-sm">All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnPolicyPage;
