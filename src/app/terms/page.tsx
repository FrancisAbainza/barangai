import Link from "next/link";
import { ScrollText } from "lucide-react";
import LegalPage, { LegalContact, LegalSection } from "@/components/legal/legal-page";
import { barangayCity, barangayName } from "@/lib/data";

export default function TermsPage() {
  return (
    <LegalPage icon={ScrollText} title="Terms of Service" lastUpdated="October 30, 2026">
      <p className="leading-relaxed text-foreground/85">
        These Terms of Service apply to your use of the {barangayName} online portal (the &quot;Portal&quot;), run by{" "}
        {barangayName}, {barangayCity}{" "}(the &quot;Barangay&quot;, &quot;we&quot;). By creating an account or using the
        Portal, you agree to these Terms and to our{" "}
        <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        . If you don&apos;t agree, please don&apos;t use the Portal. You can still transact with the Barangay in person at
        the Barangay Hall.
      </p>

      <LegalSection title="1. Who Can Use the Portal">
        <p>
          The Portal is for residents of {barangayName} and people who have business with the Barangay. If you are under
          18, you may use it only with the permission of a parent or guardian.
        </p>
      </LegalSection>

      <LegalSection title="2. Your Account">
        <ul>
          <li>Give accurate information when you sign up, and keep it up to date.</li>
          <li>Keep your sign-in details private. You are responsible for anything done through your account.</li>
          <li>Create only one account for yourself, and don&apos;t sign up or submit requests in someone else&apos;s name.</li>
          <li>Tell the Barangay right away if you think someone else is using your account.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Resident Profile and Valid ID">
        <p>
          Some services require a resident profile with your personal details and photos of a valid ID. The Barangay
          uses these to confirm your identity and residency. Submitting false information or another person&apos;s ID
          may lead to the rejection of your requests, the suspension of your account, and referral to the proper
          authorities.
        </p>
      </LegalSection>

      <LegalSection title="4. Barangay Services">
        <ul>
          <li>
            <strong>Document requests</strong>{" "}
            are reviewed by barangay staff, who may approve or reject them. You&apos;ll be notified in the Portal when your document is ready or if your request is rejected.
          </li>
          <li>
            <strong>Complaints</strong> must be truthful and made in good faith. The Barangay decides how to prioritize
            and act on each report. The Portal is not an emergency service. In an emergency, call 911 or the barangay
            hotline.
          </li>
          <li>
            <strong>Court reservations</strong> are confirmed only once approved. The Barangay may need to cancel an
            approved reservation for official use, bad weather or emergencies, and will let you know if it does.
          </li>
          <li>
            <strong>Community Hub</strong>{" "}
            listings must be for real, lawful businesses that you own or represent.
            Barangay staff check each listing before it appears, and check it again after it&apos;s edited. A listing
            doesn&apos;t mean the Barangay endorses the business.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Fees and Payments">
        <p>
          Fees are set by the Barangay and may change. The fee shown when you submit a request is the one that applies.
          Pay only to the Barangay&apos;s GCash account shown in the Portal, and upload your proof of payment with your
          request. If a paid request is rejected, contact the Barangay about your payment.
        </p>
      </LegalSection>

      <LegalSection title="6. Comments and Community Conduct">
        <p>
          Your name and profile photo are shown with the comments and reactions you post on news and projects. Don&apos;t
          post anything that is:
        </p>
        <ul>
          <li>false or misleading</li>
          <li>abusive, threatening, hateful or harassing</li>
          <li>obscene or violent</li>
          <li>someone else&apos;s personal information, such as their address, phone number, ID or photos</li>
          <li>spam, advertising or unrelated to the post (list businesses in the Community Hub instead)</li>
        </ul>
        <p>The Barangay may remove content that breaks these rules and suspend accounts that keep breaking them.</p>
      </LegalSection>

      <LegalSection title="7. Content You Submit">
        <p>
          You keep ownership of the text, photos and files you submit. You allow the Barangay to store, view and use them
          to provide its services and keep its official records. Upload only content you have the right to share.
        </p>
      </LegalSection>

      <LegalSection title="8. AI Assistant">
        <p>
          The Portal&apos;s AI assistant answers questions and helps you fill out forms. It can make mistakes, so confirm
          important details such as fees, schedules and requirements with the Barangay. Its answers are not official
          decisions of the Barangay.
        </p>
      </LegalSection>

      <LegalSection title="9. Availability">
        <p>
          The Portal is provided as is. We work to keep it running and its information accurate, but we can&apos;t
          promise that it will always be available or free of errors. Barangay services remain available in person at
          the Barangay Hall.
        </p>
      </LegalSection>

      <LegalSection title="10. Suspension and Account Deletion">
        <p>
          The Barangay may suspend or delete accounts that break these Terms. You can delete your account at any time
          from your account settings. Deleting your account doesn&apos;t automatically delete the records of your
          transactions with the Barangay. See the <Link href="/privacy">Privacy Policy</Link> for how to request that.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to These Terms">
        <p>
          We may update these Terms. The date at the top of this page shows when they last changed, and significant
          changes will be announced in News &amp; Announcements. If you keep using the Portal after a change, you accept
          the updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="12. Governing Law">
        <p>These Terms are governed by the laws of the Republic of the Philippines.</p>
      </LegalSection>

      <LegalSection title="13. Contact Us">
        <p>For questions about these Terms, contact the Barangay:</p>
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
