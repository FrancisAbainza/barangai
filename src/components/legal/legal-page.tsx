import { type LucideIcon } from "lucide-react";
import { getBarangaySettings } from "@/actions/settings";
import PageHeader from "@/components/page-header";
import { toTelHref } from "@/lib/utils";

interface LegalPageProps {
  icon: LucideIcon;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

// Shared layout for the Terms of Service and Privacy Policy, which Clerk's sign-up consent
// checkbox (set in the Clerk Dashboard) and its component footers link to.
export default function LegalPage({ icon, title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="w-full md:container space-y-6 m-auto px-6 py-10">
      <PageHeader icon={icon} title={title} description={`Last updated ${lastUpdated}`} />
      <article className="max-w-3xl space-y-8">{children}</article>
    </div>
  );
}

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-3 leading-relaxed text-foreground/85 [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

// The contact details are admin-editable, so they're read from the settings like the landing page footer.
export async function LegalContact() {
  const { hotline1, hotline2, email, address } = await getBarangaySettings();
  const hotlines = [hotline1, hotline2].filter(Boolean);

  return (
    <ul>
      <li>
        Email: <a href={`mailto:${email}`}>{email}</a>
      </li>
      {hotlines.length > 0 && (
        <li>
          Hotline:{" "}
          {hotlines.map((hotline, index) => (
            <span key={hotline}>
              {index > 0 && " / "}
              <a href={toTelHref(hotline)}>{hotline}</a>
            </span>
          ))}
        </li>
      )}
      <li>Address: {address}</li>
    </ul>
  );
}
