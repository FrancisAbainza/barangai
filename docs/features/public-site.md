# Public site

Signed-out visitors can read about the barangay, its news and its projects, and sign in or register. Everything else is in the portal.

## Pages

| Route | Rendering | Content |
|---|---|---|
| `/` | Server component (`src/app/page.tsx`) | Hero with the emergency hotline, Goal/Mission/Vision, latest news carousel, officials, services (each linking into the portal), privacy and terms, footer with contact details |
| `/news` | `NewsList` | Every news post, with search and category filter |
| `/news/[id]` | Server component | One post, with Open Graph metadata |
| `/transparency` | `TransparencyProjectList` | Every project, list and map |
| `/transparency/[id]` | Server component | One project, with Open Graph metadata |
| `/about-us` | Server components | Goal/Mission/Vision and the Barangay and SK officials |
| `/privacy`, `/terms` | Server components (`LegalPage`) | The Privacy Policy and Terms of Service |

Each public page except `/privacy` and `/terms` has a portal twin, and `src/proxy.ts` redirects signed-in users to it (`/news/14` → `/portal/news/14`). The legal pages are open to everyone.

## Chrome

The root layout renders two components only for signed-out visitors, inside Clerk's `<Show when="signed-out">`:

- `LandingHotlineBar`: the hotlines and email from `getBarangaySettings()`, as `tel:` and `mailto:` links (`toTelHref` strips everything a dialer doesn't read)
- `LandingPageHeader`: the logo, links to Home, News and About Us, and Clerk's **Log in** and **Register** buttons, with a sheet menu on small screens

`<Show>` is a server component, so the settings query in the hotline bar doesn't run for signed-in users.

## Signing in

Sign-in and sign-up open Clerk's modal (`mode="modal"`). `ClerkProvider` sets `/portal` as the fallback redirect after either, so a visitor who signs in from the landing page lands on the portal home. It's a fallback rather than a forced redirect, so a deep link that went through `auth.protect()` (for example a portal link opened while signed out) still returns to where it started.

The landing page's service cards link straight to portal pages (`/portal/document-request`, …). For a signed-out visitor, the middleware sends them to sign in first and then on to the service.

## Theme

The public pages are always light. `ThemeProvider` (`src/components/theme-provider.tsx`) passes `forcedTheme="light"` outside `/portal`, so a user who picked dark mode in the portal still sees the public pages in light mode.

## Sharing metadata

`/news/[id]` and `/transparency/[id]` export `generateMetadata`:

- `title`: the post's title and the barangay's name
- `description`: the first 200 characters of the content
- `openGraph.url`: the public URL
- `openGraph.images`: the first image, as `<origin>/api/r2?key=…`

The origin is built from the request's `x-forwarded-proto` and `host` headers, so it's correct behind a proxy. These pages are what Facebook's crawler reads when someone shares a post, so the image has to be readable without signing in, which is why the news and transparency upload prefixes are public.

The root layout's metadata gives every other page the title "Barangay Maduya Website" and a one-line description.

## Legal pages

`/privacy` and `/terms` are written in JSX with `LegalPage` and `LegalSection` (`src/components/legal/legal-page.tsx`). `LegalPage` shows "Last updated <date>" from its `lastUpdated` prop, and `LegalContact` renders the barangay's current contact details from settings. Both pages were last updated October 30, 2026.

- The Privacy Policy covers what the portal collects, how it's used, who can see it, the service providers (Clerk, Neon, Cloudflare, Google, OpenAI), retention, protection, rights under the Data Privacy Act of 2012, children, changes and contact.
- The Terms of Service cover who can use the portal, accounts, the resident profile and valid ID, the services, fees and payments, comments and conduct, submitted content, the AI assistant, availability, suspension and deletion, changes, governing law and contact.

Update `lastUpdated` and the relevant section when a feature changes what's collected, who sees it or how long it's kept (for example the notification retention period). Clerk's own components link to these pages too (`appearance.options.termsPageUrl` and `privacyPageUrl` in the root layout).

When writing long text in these pages, watch for a build quirk: multi-line JSX text that contains an HTML entity (`&apos;`, `&quot;`) loses its leading space when it follows a closing tag or `{expression}`. Put an explicit `{" "}` there. See the [Development guide](../development-guide.md#gotchas).

## Files

| File | What it does |
|---|---|
| `src/app/page.tsx` | The landing page |
| `src/components/landing/` | Animations, news carousel, officials showcase, section intros |
| `src/components/landing-hotline-bar.tsx`, `src/components/landing-page-header.tsx` | Signed-out chrome |
| `src/app/news/`, `src/app/transparency/`, `src/app/about-us/` | Public pages |
| `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/components/legal/legal-page.tsx` | Legal pages |
| `src/components/theme-provider.tsx` | Forces light mode outside the portal |
