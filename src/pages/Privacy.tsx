import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PrivacyPageProps {
  theme: 'green' | 'og' | 'dog';
  isRunning: boolean;
}

export function PrivacyPage({ theme, isRunning }: PrivacyPageProps) {
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
                / PRIVACY
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
              Privacy Policy
            </h1>
            <p className="text-sm opacity-75">Last Updated: February 09, 2025</p>

            <p>
              This Privacy Policy describes how HN Live ("Company", "we", "us", or "our") collects, uses, and discloses your information when you use our website https://hn.live (the "Service"). We are committed to protecting your privacy and handling your personal information in a responsible and transparent manner.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              Our Privacy Philosophy
            </h2>
            <p>We believe in being transparent and straightforward about data:</p>
            <ul>
              <li>We only collect information that's necessary for the site to function</li>
              <li>We don't sell your data or use it for marketing purposes</li>
              <li>We hate spam as much as you do - you'll only hear from us about important service updates</li>
              <li>We believe in giving you control over your data</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              1. Information We Collect
            </h2>
            <h3>a. Personal Data</h3>
            <p>When you register for an account or interact with the Service, we may collect:</p>
            <ul>
              <li>Email Address: Required for account creation, authentication, and communication</li>
              <li>Name: Optional information to personalize your experience</li>
              <li>Payment Information: When you use paid features (processed securely via third-party payment providers)</li>
            </ul>

            <h3>b. Usage Data</h3>
            <p>Automatically collected data includes:</p>
            <ul>
              <li>IP Address: For security and diagnostic purposes</li>
              <li>Browser Type and Version: To optimize our Service for your device</li>
              <li>Pages Visited and Time Spent: To analyze how you interact with our Service</li>
              <li>Device Information: Such as device type, operating system, and other technical details</li>
              <li>Other Diagnostic Data: Collected via cookies and similar tracking technologies</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              2. How We Use Your Information
            </h2>
            <p>We use the information we collect for various purposes:</p>
            <ul>
              <li>Providing and Maintaining the Service: To ensure the Service functions properly and to manage your account</li>
              <li>Improving the Service: To analyze usage trends, fix issues, and enhance user experience</li>
              <li>Processing Payments: For handling transactions related to any paid features</li>
              <li>Communication: To send you updates, notifications, and important messages related to your account or the Service</li>
              <li>Personalization: To tailor content and features based on your preferences and usage</li>
              <li>Security and Diagnostics: To monitor and safeguard the Service against unauthorized access and to diagnose technical problems</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              3. Cookies and Tracking Technologies
            </h2>
            <p>We use cookies and similar technologies to improve your experience:</p>
            <ul>
              <li>Necessary Cookies: Essential for the Service to function (e.g., keeping you logged in)</li>
              <li>Functionality Cookies: To remember your preferences and settings</li>
              <li>Analytics Cookies: To help us understand how our Service is used (via Google Analytics)</li>
            </ul>
            <p>You can manage your cookie preferences through your browser settings. Disabling cookies may affect the functionality of certain parts of the Service.</p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              4. Disclosure of Your Information
            </h2>
            <p>We may disclose your information in the following circumstances:</p>
            <ul>
              <li>Service Providers: To trusted third parties who assist us in operating the Service (e.g., hosting providers, payment processors, and analytics services). These providers are bound by confidentiality agreements and are not permitted to use your data for any other purposes.</li>
              <li>Legal Requirements: If required by law or in response to a subpoena, court order, or governmental request</li>
              <li>Business Transfers: In connection with a merger, acquisition, or sale of all or part of our assets, subject to confidentiality provisions</li>
              <li>With Your Consent: When you give us permission to share your information with other parties</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              5. Data Retention
            </h2>
            <p>
              We retain your personal data only as long as necessary for the purposes for which it was collected and to comply with our legal obligations. You can delete your account at any time, which will remove your personal information from our active databases. However, we may retain certain information as required by law or for legitimate business purposes.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              6. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and maintained on servers located outside of your jurisdiction. By using the Service, you consent to the transfer of your information to jurisdictions that may have data protection laws different from those in your country.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              7. Your Privacy Rights
            </h2>
            <p>Depending on your jurisdiction, you may have certain rights regarding your personal data:</p>
            <ul>
              <li>Right to Access: You can request copies of your personal data</li>
              <li>Right to Rectification: You can request that we correct any inaccurate or incomplete information</li>
              <li>Right to Erasure: Under certain conditions, you can request the deletion of your personal data</li>
              <li>Right to Restrict Processing: You can request that we limit how we process your personal data</li>
              <li>Right to Data Portability: You can request a copy of your data in a structured, commonly used, and machine-readable format</li>
              <li>Right to Withdraw Consent: If your data is processed based on your consent, you have the right to withdraw that consent at any time</li>
            </ul>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              8. Regional Privacy Rights
            </h2>
            <h3>GDPR Privacy (For EU Users)</h3>
            <p>
              If You are a resident of the European Economic Area (EEA), you have certain data protection rights under GDPR. We aim to take reasonable steps to allow you to correct, amend, delete, or limit the use of your Personal Data.
            </p>

            <h3>CCPA Privacy Rights (For California Residents)</h3>
            <p>
              If you are a California resident, you have specific rights regarding access to your Personal Data, including the right to request deletion of your Personal Data and the right to opt out of sales of Personal Data (note that we do not sell Personal Data).
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              9. Security of Your Data
            </h2>
            <p>
              We implement commercially reasonable measures to protect your personal data from unauthorized access, disclosure, alteration, or destruction. However, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              10. Children's Privacy
            </h2>
            <p>
              Our Service is not directed to children under the age of 13. We do not knowingly collect personal data from children under 13. If you believe that we have inadvertently collected data from a child under 13, please contact us immediately, and we will take steps to remove the information promptly.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              11. Links to Other Websites
            </h2>
            <p>
              Our Service may contain links to other websites not operated by us. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              12. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. When we update the Privacy Policy, we will revise the "Last Updated" date at the top of this page. We encourage you to review this Privacy Policy periodically for any changes.
            </p>

            <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              13. Contact Us
            </h2>
            <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:</p>
            <p>Email: email@hn.live</p>
          </div>
        </div>
      </div>
    </div>
  );
} 