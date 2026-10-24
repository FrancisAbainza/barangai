import { getBarangaySettings } from "@/actions/settings";
import { toTelHref } from "@/lib/utils";

// Rendered above LandingPageHeader, and scrolls away while the header stays pinned. It's a
// server component apart from the header so the contact details from Barangay Settings
// arrive with the page instead of popping in after a client fetch.
export default async function LandingHotlineBar() {
  const { hotline1, hotline2, email } = await getBarangaySettings();
  const hotlines = [hotline1, hotline2].filter(Boolean);

  return (
    <div className="bg-primary-deep text-sm text-primary-foreground">
      <div className="mx-auto flex w-full flex-wrap items-center gap-x-5 gap-y-1 px-6 py-2.5 md:container">
        <span className="text-xs font-semibold tracking-wider text-yellow-500 uppercase">Hotlines</span>
        {hotlines.map((hotline) => (
          <a key={hotline} href={toTelHref(hotline)} className="hover:underline">
            {hotline}
          </a>
        ))}
        <a href={`mailto:${email}`} className="hover:underline">
          {email}
        </a>
      </div>
    </div>
  );
}
