import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import LegalPage, { LegalContact, LegalSection } from "@/components/legal/legal-page";
import { barangayName } from "@/lib/data";
import { READ_NOTIFICATION_RETENTION_DAYS } from "@/lib/notifications";

export default function PrivacyPage() {
  return (
    <LegalPage icon={ShieldCheck} title="Privacy Policy" lastUpdated="October 30, 2026">
      <p className="leading-relaxed text-foreground/85">
        {barangayName} protects your personal information in line with the Data Privacy Act of 2012 (Republic Act No.
        10173). This policy explains what the {barangayName}{" "}online portal (the &quot;Portal&quot;) collects, why we
        collect it, who can see it and what your rights are. It works together with our{" "}
        <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
          Terms of Service
        </Link>
        .
      </p>

      <LegalSection title="1. Information We Collect">
        <ul>
          <li>
            <strong>Account:</strong> your name, email address and profile photo. If you sign in with Google or another
            account, we receive these from that service.
          </li>
          <li>
            <strong>Resident profile:</strong> your full name, birthdate, sex, civil status, contact number, complete
            address, and photos of the front and back of a valid ID.
          </li>
          <li>
            <strong>Document requests:</strong> the document and its purpose, details you give about your situation,
            supporting documents and GCash payment receipts.
          </li>
          <li>
            <strong>Complaints:</strong> the subject, description, location and the photos or videos you attach.
          </li>
          <li>
            <strong>Court reservations:</strong> the date, time, purpose and GCash payment receipt.
          </li>
          <li>
            <strong>Community Hub businesses:</strong> the business name, description, contact number, social media
            link, operating hours, photos, location and business permit.
          </li>
          <li>
            <strong>Comments and reactions</strong> you post on news and transparency projects.
          </li>
          <li>
            <strong>AI assistant:</strong> the messages you type or speak, and your location if you choose to share it
            to find nearby businesses.
          </li>
          <li>
            <strong>Preferences:</strong> whether you use the light or dark theme.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use It">
        <ul>
          <li>To confirm your identity and residency</li>
          <li>
            To process your document requests, complaints, court reservations and business listings, and to contact you
            about them
          </li>
          <li>To notify you when the status of your submissions changes</li>
          <li>To keep the Barangay&apos;s official records and a log of staff actions for accountability</li>
          <li>To answer your questions through the AI assistant</li>
          <li>To keep the Portal secure and prevent misuse</li>
        </ul>
        <p>We don&apos;t sell your personal information or use it for advertising.</p>
      </LegalSection>

      <LegalSection title="3. Who Can See Your Information">
        <ul>
          <li>
            <strong>Barangay staff</strong> who manage the Portal can see your profile and submissions in order to
            process them.
          </li>
          <li>
            <strong>Only you and barangay staff</strong> can see your resident profile, valid ID, document requests,
            court reservations and payment receipts.
          </li>
          <li>
            <strong>Other users</strong>{" "}
            can see your name and profile photo on the comments and reactions you post, and the details of your business once it&apos;s verified in the Community Hub (but not its permit).
          </li>
          <li>
            <strong>Nearby residents reporting the same issue</strong>{" "}
            may be offered to follow your open complaint. They can see its details and status, but not your name or contact details. Noise, domestic and &quot;Others&quot;
            complaints are never shown to other residents.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Service Providers">
        <p>
          We use these service providers to run the Portal and share with each one only what it needs to do its job:
        </p>
        <ul>
          <li>
            <strong>Clerk</strong> for accounts and sign-in
          </li>
          <li>
            <strong>Neon</strong> for the database
          </li>
          <li>
            <strong>Cloudflare</strong> for storing uploaded photos and files
          </li>
          <li>
            <strong>OpenAI</strong> for the AI assistant, turning voice messages into text, and suggesting a category
            and priority for complaints
          </li>
          <li>
            <strong>Google Maps</strong> for maps and for turning map locations into addresses
          </li>
        </ul>
        <p>Some of these providers store or process data on servers outside the Philippines.</p>
      </LegalSection>

      <LegalSection title="5. How Long We Keep It">
        <ul>
          <li>Your submissions are kept as part of the Barangay&apos;s records, even after they&apos;re completed.</li>
          <li>Notifications you&apos;ve read are deleted automatically after {READ_NOTIFICATION_RETENTION_DAYS} days.</li>
          <li>The log of actions taken by barangay staff is kept for accountability.</li>
          <li>
            If you delete your account, your resident profile and submissions aren&apos;t deleted automatically, because
            they may be part of the Barangay&apos;s official records. You can ask us to delete them (see Your Rights).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. How We Protect It">
        <ul>
          <li>
            You have to sign in to use the Portal&apos;s services, and your information is shown only to the people
            listed above.
          </li>
          <li>
            Uploaded files are kept in private storage under random, hard-to-guess file names. Apart from the photos and
            files on public news, projects and the list of officials, they can only be opened by signed-in users.
          </li>
          <li>Information is sent over encrypted (HTTPS) connections.</li>
        </ul>
        <p>
          No system is completely secure. If a breach affects your personal information, we will notify you and the
          National Privacy Commission as the law requires.
        </p>
      </LegalSection>

      <LegalSection title="7. Your Rights">
        <p>Under the Data Privacy Act, you have the right to:</p>
        <ul>
          <li>be informed about how your personal information is collected and used</li>
          <li>access the personal information we hold about you</li>
          <li>correct information that is wrong or outdated (you can also edit your resident profile yourself)</li>
          <li>object to its processing, or ask us to block or delete it</li>
          <li>get a copy of it in a commonly used format</li>
          <li>claim damages if you are harmed by the misuse of your personal information</li>
          <li>
            file a complaint with the{" "}
            <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer">
              National Privacy Commission
            </a>
          </li>
        </ul>
        <p>
          To use these rights, contact the Barangay using the details below. Some records may have to be kept by law
          even if you ask us to delete them.
        </p>
      </LegalSection>

      <LegalSection title="8. Children">
        <p>
          If you are under 18, use the Portal only with the permission of a parent or guardian, who may contact us about
          your information.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to This Policy">
        <p>
          We may update this policy. The date at the top of this page shows when it last changed, and significant changes
          will be announced in News &amp; Announcements.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact Us">
        <p>For questions or requests about your personal information, contact the Barangay:</p>
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
