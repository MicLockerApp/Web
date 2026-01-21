import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Heart } from 'lucide-react';

const TermsOfUsePage = () => {
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
            MicLocker Terms of Use
          </h1>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Below find the basic terms and conditions you agree to once you begin using MicLocker
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

        {/* Content */}
        <div className={`prose prose-lg max-w-none ${isDark ? 'prose-invert' : ''}`}>
          {/* Preamble */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>PREAMBLE</h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              PLEASE READ THESE TERMS OF USE AND THE DOCUMENTS THAT WE REFERENCE BELOW (COLLECTIVELY THE "TERMS OF USE") 
              CAREFULLY BEFORE USING THE WEBSITES AND SERVICES OFFERED BY MICLOCKER, LLC ("MICLOCKER"). THESE TERMS OF USE 
              SET FORTH THE LEGALLY BINDING TERMS AND CONDITIONS FOR YOUR USE OF MICLOCKER.COM OR ANY AFFILIATED WEBSITES 
              (COLLECTIVELY, "WEBSITE" OR "SITE"), MICLOCKER'S MOBILE APPLICATIONS AND DESKTOP APPLICATIONS (THE "APPS"), 
              AS WELL AS MICLOCKER'S APPLICATION PROGRAMMING INTERFACES ("APIs"). WE'LL REFER TO THE WEBSITE, THE APPS, 
              THE API, AND OTHER SERVICES AS THE "SERVICES."
            </p>
            <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              THESE TERMS OF USE APPLY TO OUR REGISTERED BUYERS ("BUYERS"), SELLERS ("SELLERS" AND TOGETHER WITH OUR BUYERS 
              OUR "MEMBERS"), THOSE WHO PURCHASE ITEMS WITHOUT AN ACCOUNT, AND ANYONE ELSE WHO VISITS OR USES THE SERVICES, 
              WHETHER AN INDIVIDUAL OR AN ENTITY (TOGETHER WITH "MEMBERS," "YOU," "YOUR," "USER" AND "USERS"). YOU ARE 
              EXPRESSLY AGREEING TO BE BOUND BY THESE TERMS OF USE. BY USING THE SITE AND SERVICES OFFERED BY MICLOCKER 
              YOU HEREBY WAIVE ANY AND ALL CLAIMS CHALLENGING THE APPLICABILITY OR BINDING NATURE OF THE TERMS OF USE.
            </p>
            <p className={`mt-4 font-semibold ${isDark ? 'text-primary' : 'text-primary'}`}>
              IF YOU DO NOT AGREE WITH THE TERMS OF USE, PLEASE DO NOT USE THE SITE.
            </p>

            <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                These Terms of Use include the following which are incorporated by reference:
              </p>
              <ul className={`list-disc list-inside space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <li><Link to="/legal/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link></li>
                <li><Link to="/legal/intellectual-property" className="text-primary hover:underline">Intellectual Property Policy</Link></li>
                <li><Link to="/legal/buyers" className="text-primary hover:underline">Community Rules: Buyers</Link></li>
                <li><Link to="/legal/sellers" className="text-primary hover:underline">Community Rules: Sellers</Link></li>
                <li><Link to="/legal/billing-policy" className="text-primary hover:underline">Billing Policy</Link></li>
              </ul>
            </div>

            <div className={`mt-6 p-4 rounded-lg border-l-4 border-primary ${isDark ? 'bg-primary/10' : 'bg-yellow-50'}`}>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Please note that Section 6 of the Terms of Use below contains a binding arbitration agreement and class 
                action waiver. This means you and MicLocker are agreeing to submit any disputes between us exclusively 
                to individual arbitration and not to sue in court, with only limited exceptions. Please read this Section 
                carefully, as it affects your rights.
              </p>
            </div>
          </section>

          {/* Section 1 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              1. MicLocker is a Marketplace/Venue
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker acts primarily as a marketplace to allow users who comply with MicLocker's Terms of Use to offer, 
              sell, advertise, and buy musical instruments, audio equipment, and related merchandise. MicLocker serves 
              musicians, audio engineers, recording studios, venues, and music enthusiasts looking to buy, sell, and trade 
              professional music gear.
            </p>
            <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker cannot guarantee the truth, accuracy or legality of listings or the ability of sellers to sell 
              items or the ability of buyers to pay for items. MicLocker also cannot ensure that a buyer or seller will 
              actually complete a transaction or guarantee the true identity, age, and nationality of a user. MicLocker 
              encourages you to communicate directly with potential transaction partners through the tools available on 
              the Site.
            </p>
            <p className={`mt-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              YOU USE THE MICLOCKER SERVICE AT YOUR OWN RISK AND AGREE THAT THE SITE IS PROVIDED TO YOU WITH ALL FAULTS, 
              INCLUDING NO PROMISE OF CONTINUOUS SERVICE.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              2. Membership
            </h2>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (A) Age
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              The Services are available only to individuals who are 18 years of age and older. You represent and warrant 
              that you are at least 18 years old and that all registration information you submit is accurate and truthful. 
              MicLocker may, in its sole discretion, refuse to offer access to, or use of the Site to, any person or entity 
              and change its eligibility criteria at any time. Individuals under 18 are only permitted to use MicLocker's 
              Services only with the supervision of a parent or legal guardian, and in all such cases, the adult is the 
              user and is responsible for any and all activities.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (B) User Categories
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              Upon registration, users must select a primary category that best describes their role in the music industry:
            </p>
            <ul className={`list-disc list-inside mt-2 space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <li><strong>Musician:</strong> Individual artists and performers</li>
              <li><strong>Audio Engineer:</strong> Sound professionals and mixing/mastering specialists</li>
              <li><strong>Recording Studio:</strong> Professional recording facilities</li>
              <li><strong>Venue:</strong> Performance spaces and event locations</li>
              <li><strong>Merchant:</strong> Professional gear dealers and retailers</li>
            </ul>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (C) Password
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              Your password is your responsibility. Keep your password secure. You are fully responsible for all activity, 
              liability and damage resulting from your failure to maintain password confidentiality. You agree to immediately 
              notify MicLocker of any unauthorized use of your password or any breach of security.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (D) Account Information
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              You must keep your account information up-to-date and accurate at all times, including a valid email address. 
              To sell items on MicLocker you must provide and maintain valid payment information such as valid credit card 
              information, contact information, and bank account information for receiving payouts.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (E) Account Transfer
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              You may not transfer or sell your MicLocker account and User ID to another party. If you are registering as 
              a business entity, you personally guarantee that you have the authority to bind the entity to these Terms of Use.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (F) Right to Refuse Service
            </h3>
            <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              ACCESS TO MICLOCKER'S SERVICES AND THE SITE IS A PRIVILEGE GRANTED AT MICLOCKER'S SOLE DISCRETION. 
              YOU HAVE NO RIGHT TO ACCESS MICLOCKER'S SITE. MicLocker reserves the right, in MicLocker's sole discretion, 
              to terminate any user who it determines is violating these Terms of Use or engaging in fraudulent or 
              unauthorized activity.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              3. Fees and Services
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              Joining and setting up a shop on MicLocker is free. MicLocker does not charge fees to list an item for sale. 
              MicLocker charges a 3% platform fee of the sale price when the item sells. This fee helps us maintain the 
              marketplace, provide customer support, and continue developing new features for our community.
            </p>
            
            <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Fee Structure:
              </p>
              <ul className={`list-disc list-inside space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <li>Listing Fee: Free</li>
                <li>Platform Fee: 3% of sale price (charged to seller)</li>
                <li>Payment Processing: Standard payment processor fees may apply</li>
              </ul>
            </div>

            <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker's Billing Policy, which is subject to change, is incorporated into these Terms of Use by reference. 
              Changes to the Billing Policy and the fees for MicLocker's services are effective immediately after posting 
              the changes on the Site to the fullest extent permitted by law. MicLocker may also choose to temporarily 
              change fees for promotional events.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Special Promotions
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker may offer promotional fee structures from time to time. For example, early adopters may qualify 
              for reduced or waived platform fees. The terms of any promotional offers will be communicated at the time 
              of the promotion.
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              4. Content License
            </h2>
            
            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (A) Your Content
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker does not claim ownership rights in content you place on the Site or in your listings (the "Content"). 
              You understand that you are solely responsible for Your Content. You represent that you have all necessary 
              rights to Your Content and that you're not infringing or violating any third party's rights by posting it.
            </p>
            <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              By posting Your Content through our Services, You grant MicLocker a non-exclusive, worldwide, perpetual, 
              irrevocable, royalty-free, sublicensable right to use, display, edit, modify, reproduce, distribute, store, 
              and prepare derivative works of Your Content. This allows us to provide and improve the Services and to 
              promote MicLocker, your MicLocker shop, or the Services in general.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (B) Personal Information
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker will only use personal information in accordance with MicLocker's Privacy Policy. As part of a 
              transaction, you may obtain personal information, including email address and shipping information, from 
              another MicLocker user. Without obtaining prior permission from the other user, this personal information 
              shall only be used for that transaction or for transaction-related communications.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              5. Information Control
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker does not control the Content provided by users that is made available on MicLocker. You may find 
              some Content to be offensive, harmful, inaccurate, or deceptive. However, MicLocker will do everything in its 
              power to mitigate this and to make sure that all listings are honest and fair. We scan through the website and 
              if there are any potential malicious listings or profiles, we will take necessary actions to address those concerns. 
              By using MicLocker, you agree to accept such risks and expressly agree that MicLocker (and MicLocker's officers, 
              directors, agents, subsidiaries, joint ventures and employees) is not responsible for any and all acts or omissions 
              of users on MicLocker.
            </p>
            <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              Please use caution, common sense, and practice safe buying and selling when using MicLocker. We encourage 
              users to thoroughly inspect listings, ask questions, and verify the condition of items before completing 
              transactions.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              6. Arbitration and Dispute Resolution Agreement
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              If you're upset with us, let us know, and we'll work together in good faith to resolve your issue. But if 
              we can't work it out, then you and MicLocker (including our employees, officers, directors, agents, 
              subsidiaries, and affiliates) agree to submit our disputes exclusively to binding individual arbitration, 
              and we won't sue each other in court before a judge or jury, except in limited circumstances.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (A) Disputes We'll Arbitrate
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              You and MicLocker agree to mandatory individual arbitration for all claims arising from or relating to the 
              Services, these and prior versions of the Terms of Use, any products, data, or content bought or sold, 
              offered, accessed, displayed, transmitted or listed through the Services.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (B) Class and Representative Action Waiver
            </h3>
            <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              You and MicLocker agree that we each may bring claims against the other only on an individual basis, and 
              not on a class, representative, or collective basis. Disputes between us can't be consolidated with those 
              of any other person or entity.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              (C) Informal Dispute Resolution
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              Before either side files an arbitration, you and MicLocker will try in good faith to resolve our differences. 
              To start the process, you must send an individualized written notice ("Notice of Dispute") to MicLocker at 
              legal@miclockerapp.com with your name and the email address registered to your MicLocker account, and a 
              description of the Dispute and how you'd like it resolved. The parties then have 30 days to investigate 
              claims and try to resolve the Dispute.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              7. Intra User Disputes
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              In the event that you have a dispute with another MicLocker user or third party, we encourage you to contact 
              the other party and try to resolve the dispute directly. Should you have a dispute with one or more users, 
              or an outside party, YOU RELEASE MICLOCKER (AND MICLOCKER'S OFFICERS, DIRECTORS, AGENTS, SUBSIDIARIES, 
              JOINT VENTURES AND EMPLOYEES) FROM ANY AND ALL CLAIMS, DEMANDS AND DAMAGES ARISING OUT OF OR IN ANY WAY 
              CONNECTED WITH SUCH DISPUTES.
            </p>

            <h3 className={`text-xl font-semibold mt-6 mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Order Disputes
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              Issues related to transactions on MicLocker can usually be resolved via direct communication between the 
              buyer and the seller. If a buyer and seller are unable to resolve a dispute, MicLocker may be able to help. 
              Contact our support team at info@miclockerapp.com for assistance.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              8. Offers and Negotiations
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker provides a "Make an Offer" feature that allows buyers to submit price offers to sellers. Sellers 
              may accept, counter, or decline offers at their discretion. When an offer is accepted, both parties are 
              expected to complete the transaction in good faith.
            </p>
            <ul className={`list-disc list-inside mt-4 space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>Offers are binding once accepted by the seller</li>
              <li>Counter-offers may be made until a final agreement is reached</li>
              <li>Offers expire after 48 hours unless otherwise specified</li>
              <li>Repeated offer abuse may result in account restrictions</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              9. Messaging and Communications
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker provides messaging features to facilitate communication between buyers and sellers. By using the 
              Site and services available on the Site, you agree to receive communications from MicLocker and other users.
            </p>
            <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              When you register for an account, subscribe to a newsletter, or provide us with your email address, you 
              will receive notice of and agree to receive marketing emails and messages from us. You can unsubscribe at 
              any time from marketing emails through the opt-out link included in marketing emails, or by reaching out 
              to MicLocker support.
            </p>
            
            <div className={`mt-6 p-4 rounded-lg border-l-4 border-red-500 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
              <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                Messaging Policy & Prohibited Conduct
              </h3>
              <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                Messages between users are designed for users to connect and use the platform with transparency. If any of 
                the following are found to be true, terminations and potential lifetime bans will be imposed:
              </p>
              <ul className={`list-disc list-inside space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <li>Circumventing the platform to conduct offline transactions or markets</li>
                <li>Any sexually driven messages, including: images, inappropriate messages, harassment, or solicitation</li>
                <li>Sending spam, promotional content, or unsolicited advertisements</li>
                <li>Phishing attempts or requests for sensitive personal information (passwords, SSN, bank details)</li>
                <li>Threats, intimidation, bullying, or abusive language</li>
                <li>Sharing another user's personal information without consent (doxxing)</li>
                <li>Impersonating another user, MicLocker staff, or any third party</li>
                <li>Attempting to manipulate or deceive other users regarding listings or transactions</li>
                <li>Soliciting reviews, feedback manipulation, or offering incentives for fake reviews</li>
                <li>Discussing or promoting illegal activities</li>
                <li>Sending malicious links, malware, or attempting to compromise user security</li>
                <li>Using automated systems or bots to send messages</li>
                <li>Any form of discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics</li>
              </ul>
              <p className={`mt-4 font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                MicLocker reserves the right to monitor messages for policy violations and take action including warning, 
                suspension, or permanent ban without prior notice.
              </p>
              <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                MicLocker will comply with all local, state and federal laws. If any violations become illegal, criminal 
                or dangerous in any way, MicLocker will take actions to reach out to the proper authorities to handle 
                such matters, in alignment with all applicable laws.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              10. MicLocker's Intellectual Property
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker, and other MicLocker graphics, logos, designs, page headers, button icons, scripts, and service 
              names are registered trademarks, trademarks, trade dress or copyrights of MicLocker, LLC in the U.S. and/or 
              other countries. MicLocker's trademarks, trade dress, copyrights, patents, and all other MicLocker intellectual 
              property may not be used, in any manner, without the prior express written consent of a duly authorized 
              representative of MicLocker.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              11. No Warranty
            </h2>
            <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              MICLOCKER IS DEDICATED TO MAKING OUR SERVICES THE BEST THEY CAN BE, BUT WE'RE NOT PERFECT AND SOMETIMES 
              THINGS CAN GO WRONG. YOU UNDERSTAND THAT OUR SITE AND SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" 
              AND WITHOUT ANY KIND OF WARRANTY (EXPRESS OR IMPLIED). WE ARE EXPRESSLY DISCLAIMING ANY WARRANTIES OF 
              TITLE TO PRODUCTS THAT ARE NOT OWNED BY MICLOCKER, NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS FOR 
              A PARTICULAR PURPOSE.
            </p>
            <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              WE DO NOT GUARANTEE THAT: (I) THE SITE OR SERVICES WILL BE SECURE OR AVAILABLE AT ANY PARTICULAR TIME 
              OR LOCATION; (II) ANY DEFECTS OR ERRORS WILL BE CORRECTED; (III) THE SITE OR SERVICES WILL BE FREE OF 
              VIRUSES OR OTHER HARMFUL MATERIALS; OR (IV) THE RESULTS OF USING THE SITE OR SERVICES WILL MEET YOUR 
              EXPECTATIONS. YOU USE THE SITE OR SERVICES SOLELY AT YOUR OWN RISK.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              12. Limitation of Liability
            </h2>
            <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL MICLOCKER, AND (AS APPLICABLE) MICLOCKER'S 
              AFFILIATES, AND EACH OF THEIR OFFICERS, DIRECTORS, EMPLOYEES, AGENTS AND SUPPLIERS BE LIABLE FOR ANY 
              DAMAGES WHATSOEVER, WHETHER DIRECT, INDIRECT, GENERAL, SPECIAL, COMPENSATORY, CONSEQUENTIAL, AND/OR 
              INCIDENTAL, ARISING OUT OF OR RELATING TO THE CONDUCT OF YOU OR ANYONE ELSE IN CONNECTION WITH THE USE 
              OF THE SERVICES OR THESE TERMS OF USE.
            </p>
            <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MICLOCKER'S LIABILITY TO YOU OR ANY THIRD PARTIES IN ANY CIRCUMSTANCE IS LIMITED TO THE GREATER OF (A) 
              THE AMOUNT OF FEES YOU PAY TO MICLOCKER IN THE 12 MONTHS PRIOR TO THE ACTION GIVING RISE TO LIABILITY 
              AND (B) $100.
            </p>
          </section>

          {/* Section 13 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              13. Indemnity
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              We hope this never happens, but if MicLocker gets sued or receives a claim because of something that you 
              did (or failed to do), you agree to indemnify and hold MicLocker including its affiliates and each of 
              their officers, directors, agents, and employees, harmless from any claim or demand, including reasonable 
              attorneys' fees, made by any third party due to or arising out of your breach of these Terms of Use, or 
              your violation of any law or the rights of a third party.
            </p>
          </section>

          {/* Section 14 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              14. Modification of Service or Terms
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker may update all Terms of Use, from time to time, without notice, including by adding entirely 
              new terms and deleting existing terms, to the maximum extent permitted by law. If the changes are material 
              and notice is required by law, we'll let you know in advance by posting the changes through the Services 
              and/or sending you an email or message about the changes. Your use of the Services after the effective 
              date of the changes constitutes your acceptance of the updated Terms of Use.
            </p>
          </section>

          {/* Section 15 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              15. Choice of Law and Forum
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              MicLocker is based in the United States. If there are claims between you and MicLocker that aren't subject 
              to arbitration, you and MicLocker each agree to litigate those claims exclusively in state or federal 
              court, and to submit to the personal jurisdiction of those courts. These Terms, and all disputes between 
              us, shall be governed exclusively by U.S. federal law and applicable state law, without regard to 
              conflict-of-law rules.
            </p>
          </section>

          {/* Section 16 */}
          <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              16. Contact Information
            </h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
              If you have any questions about these Terms of Use, please email us at:
            </p>
            <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>General Inquiries:</strong> info@miclockerapp.com
              </p>
              <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>Legal Notices:</strong> legal@miclockerapp.com
              </p>
              <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>Support:</strong> <Link to="/help" className="text-primary hover:underline">Contact Support</Link>
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className={`mt-12 pt-8 border-t ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Effective date: {currentDate}
            </p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Last Updated: {currentDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
