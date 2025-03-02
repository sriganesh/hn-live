import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface TermsPageProps {
  theme: 'green' | 'og' | 'dog';
  isRunning: boolean;
}

export function TermsPage({ theme, isRunning }: TermsPageProps) {
  const navigate = useNavigate();

  // Add ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Create an AbortController to cancel any in-flight requests
        const controller = new AbortController();
        window.dispatchEvent(new CustomEvent('abortRequests', { detail: controller }));
        
        // Navigate after a short delay to allow cleanup
        setTimeout(() => {
          navigate(-1);
        }, 0);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [navigate]);

  return (
    <div className={`
      fixed inset-0 z-50 overflow-hidden
      ${theme === 'green'
        ? 'bg-black text-green-400'
        : theme === 'og'
        ? 'bg-[#f6f6ef] text-[#828282]'
        : 'bg-[#1a1a1a] text-[#828282]'}
    `}>
      <div className="h-full overflow-y-auto overflow-x-hidden p-2 pb-20">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold tracking-wider hover:opacity-75 flex items-center`}
              >
                <span>HN</span>
                <span className={`mx-1 animate-pulse ${!isRunning ? 'text-gray-500' : ''}`}>•</span>
                <span>LIVE</span>
              </button>
              <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
                / TERMS
              </span>
            </div>
            
            <button 
              onClick={() => navigate(-1)}
              className="opacity-75 hover:opacity-100"
            >
              [ESC]
            </button>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none mb-20">
            <h1 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              Terms and Conditions
            </h1>
            <p className="text-sm opacity-75">Last Updated: February 09, 2025</p>

            <p>
              Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the HN Live website (the "Service") operated by HN Live ("Company", "we", "us", or "our"). By accessing or using the Service, you agree to be bound by these Terms and by our Privacy Policy. If you disagree with any part of the Terms, then you may not access the Service.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              Community Guidelines
            </h2>
            <p>At HN Live, we believe in keeping things simple:</p>
            <ul>
              <li>Be nice and respectful to other users</li>
              <li>Follow Hacker News community guidelines and site rules</li>
              <li>Don't abuse the service or attempt to circumvent rate limits</li>
              <li>Help us maintain a high-quality, constructive environment for everyone</li>
            </ul>
            <p>Remember: HN Live is built for the community, by the community. Let's keep it friendly and productive.</p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              1. Definitions
            </h2>
            <p>For the purposes of these Terms:</p>
            <ul>
              <li><strong>Account:</strong> A unique account created for you to access the Service.</li>
              <li><strong>Company:</strong> Refers to HN Live.</li>
              <li><strong>Country:</strong> Refers to New Jersey, United States.</li>
              <li><strong>Device:</strong> Any device (computer, cellphone, tablet, etc.) that can access the Service.</li>
              <li><strong>Service:</strong> The HN Live website, accessible at https://hn.live.</li>
              <li><strong>You:</strong> The individual or entity accessing or using the Service.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              2. Acceptance of Terms
            </h2>
            <p>
              By accessing or using our Service, you confirm that you have read, understood, and agree to be bound by these Terms. Your use of the Service is also subject to our Privacy Policy, which is incorporated herein by reference.
            </p>
            <p>
              You represent that you are over the age of 18. The Company does not permit those under 18 to use the Service.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              3. User Accounts and Registration
            </h2>
            <ul>
              <li><strong>Account Creation:</strong> Certain features of the Service may require you to register for an Account. You agree to provide accurate, current, and complete information during the registration process.</li>
              <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your Account credentials and for all activities that occur under your Account. Please notify us immediately if you suspect any unauthorized use of your Account.</li>
              <li><strong>Account Termination:</strong> We reserve the right to suspend or terminate any Account that violates these Terms or exhibits unauthorized or abusive behavior.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              4. Use of the Service
            </h2>
            <ul>
              <li><strong>Lawful Purposes:</strong> You agree to use the Service only for lawful purposes and in accordance with these Terms.</li>
              <li><strong>Prohibited Actions:</strong> You agree not to engage in any conduct that could damage, disable, overburden, or impair the Service or interfere with any other party's use of the Service.</li>
              <li><strong>Community Standards:</strong> Our Service is built for the community. Please be respectful and follow our community guidelines when interacting with other users.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              5. Content and Community Guidelines
            </h2>
            <ul>
              <li><strong>User-Generated Content:</strong> You are solely responsible for any content that you post, upload, or otherwise transmit through the Service.</li>
              <li><strong>Content Restrictions:</strong> You agree not to post any content that is unlawful, defamatory, abusive, or that infringes on the rights of any third party.</li>
              <li><strong>Moderation:</strong> We reserve the right to remove or modify any content at our discretion if it violates these Terms or is deemed harmful to the community.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              6. Data Collection and Privacy
            </h2>
            <ul>
              <li><strong>Data Collection:</strong> We collect personal and usage data as described in our Privacy Policy. By using the Service, you consent to such collection, use, and disclosure.</li>
              <li><strong>Cookies and Tracking:</strong> We use cookies and similar technologies to enhance your experience. You can manage your cookie preferences through your browser settings.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              7. Payment, Pro Features, and Monetization
            </h2>
            <ul>
              <li><strong>Free and Paid Services:</strong> While the Service is available for free, we may offer additional "Pro" features for a fee. If you opt for paid features, you agree to provide accurate payment information and abide by any additional terms associated with such features.</li>
              <li><strong>Payment Processing:</strong> All payments are processed securely through third-party payment providers. Please review their policies for additional details.</li>
              <li><strong>Future Monetization:</strong> We reserve the right to introduce non-intrusive advertisements or modify our monetization model in the future. Any changes that affect data collection or user experience will be communicated in advance and, if necessary, additional consent will be obtained.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              8. Intellectual Property Rights
            </h2>
            <ul>
              <li><strong>Ownership:</strong> The Service and its original content, features, and functionality are the exclusive property of HN Live and its licensors.</li>
              <li><strong>Restrictions:</strong> You may not reproduce, distribute, modify, or create derivative works of any part of the Service without our explicit written permission.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              9. Disclaimers and Limitation of Liability
            </h2>
            <ul>
              <li><strong>"AS IS" Basis:</strong> The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied.</li>
              <li><strong>No Warranty:</strong> We do not warrant that the Service will be uninterrupted, error-free, or secure.</li>
              <li><strong>Limitation of Liability:</strong> To the maximum extent permitted by law, HN Live and its suppliers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly. In no event shall our total liability exceed the greater of the amount you have paid for accessing the Service or 100 USD.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              10. Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless HN Live, its affiliates, officers, directors, employees, and agents from any claims, damages, liabilities, costs, or expenses (including reasonable attorneys' fees) arising from your use of the Service or violation of these Terms.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              11. Termination
            </h2>
            <ul>
              <li><strong>Right to Terminate:</strong> We reserve the right to terminate or suspend your access to the Service immediately, without prior notice, for any reason, including if you breach these Terms.</li>
              <li><strong>Effect of Termination:</strong> Upon termination, your right to use the Service will cease immediately, and we may delete any data associated with your Account in accordance with our data retention policies.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              12. Governing Law and Dispute Resolution
            </h2>
            <ul>
              <li><strong>Governing Law:</strong> These Terms shall be governed and construed in accordance with the laws of New Jersey, United States, without regard to its conflict of law provisions.</li>
              <li><strong>Dispute Resolution:</strong> Any disputes arising out of or related to these Terms or the Service shall first be attempted to be resolved informally. If informal resolution fails, disputes will be resolved through binding arbitration in accordance with the rules of the applicable jurisdiction.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              13. Additional Legal Provisions
            </h2>
            <ul>
              <li><strong>Severability:</strong> If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law and the remaining provisions will continue in full force and effect.</li>
              <li><strong>Waiver:</strong> The failure to exercise a right or to require performance of an obligation under these Terms shall not affect a party's ability to exercise such right or require such performance at any time thereafter.</li>
              <li><strong>Translation Rights:</strong> These Terms and Conditions may have been translated. You agree that the original English text shall prevail in the case of a dispute.</li>
              <li><strong>United States Legal Compliance:</strong> You represent and warrant that (i) You are not located in a country that is subject to the United States government embargo, or that has been designated by the United States government as a "terrorist supporting" country, and (ii) You are not listed on any United States government list of prohibited or restricted parties.</li>
              <li><strong>European Union Users:</strong> If You are a European Union consumer, you will benefit from any mandatory provisions of the law of the country in which you are resident.</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              14. Changes to These Terms
            </h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. Your continued use of the Service after any changes will constitute your acceptance of the revised Terms.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              15. Contact Us
            </h2>
            <p>If you have any questions or concerns about these Terms, please contact us at:</p>
            <p>Email: email@hn.live</p>
          </div>
        </div>
      </div>
    </div>
  );
} 