# Getting started

This guide takes you from a fresh clone to a working local portal with a super admin account. It expands on the setup steps in the [README](../README.md).

## Prerequisites

- Node.js 20 or later and npm
- Accounts for the five services the portal depends on:

| Service | What the portal uses it for |
|---|---|
| [Clerk](https://clerk.com) | Sign-in, sign-up, user names and avatars, roles (`publicMetadata.role`), bans |
| [Neon](https://neon.tech) | PostgreSQL with the `pgvector` extension |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | Every uploaded file: IDs, receipts, evidence, photos, attachments, knowledge base PDFs |
| [Google Cloud](https://console.cloud.google.com) | Google Maps: map display, address lookup and driving directions |
| [OpenAI](https://platform.openai.com) | The AI assistant, embeddings, voice transcription and complaint triage |

## 1. Install

```bash
git clone https://github.com/FrancisAbainza/barangai.git
cd barangai
npm install
```

## 2. Environment variables

Create a `.env` file in the project root. `.env*` files are gitignored.

| Variable | Where to get it | Used by |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API keys | Clerk in the browser |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API keys | Clerk on the server (`auth()`, `clerkClient`) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk Dashboard → Webhooks → your endpoint → Signing secret | `src/app/api/webhooks/clerk/route.ts` (`verifyWebhook`) |
| `DATABASE_URL` | Neon → Connection details (the pooled connection string works) | `src/db/config.ts`, `drizzle.config.ts` |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → R2 → Account ID | `src/lib/r2.ts` (builds the S3 endpoint) |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 → Manage API tokens → a token with Object Read & Write on the bucket | `src/lib/r2.ts` |
| `R2_BUCKET_NAME` | The bucket you create | `src/lib/r2.ts` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud → APIs & Services → Credentials | Every map (`APIProvider`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Google Cloud → Map Management → Map IDs | Every map (advanced markers need a Map ID) |
| `OPENAI_API_KEY` | OpenAI → API keys | `@ai-sdk/openai` (read from the environment) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys`, once | Phone notifications (`src/lib/push.ts`, `PushNotificationToggle`). Optional: without them the toggle is hidden and only in-app notifications are sent |

The `NEXT_PUBLIC_` variables are inlined into the browser bundle at build time, so restart `npm run dev` (or rebuild) after changing them.

## 3. Database

1. Create a Neon project and copy its connection string into `DATABASE_URL`.
2. Enable pgvector. In Neon's SQL editor, run:

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

   This is the only thing in the `drizzle/` folder (`drizzle/0000_nebulous_chamber.sql`).
3. Create the tables from `src/db/schema.ts`:

   ```bash
   npx drizzle-kit push
   ```

Tables are synced with `push`, never with `generate` and `migrate`. Running `drizzle-kit generate` would write a migration that recreates every table, because the `drizzle/` folder holds only the pgvector migration. See [Database](database.md#keeping-the-database-in-sync) for the workflow when the schema changes.

## 4. Clerk

1. **Create an application** in the Clerk Dashboard and enable the sign-in methods you want (email, Google, and so on).
2. **Expose the role in the session token.** Go to **Sessions → Customize session token** and add:

   ```json
   {
     "metadata": "{{user.public_metadata}}"
   }
   ```

   The middleware (`src/proxy.ts`) and `getAuthRole()` (`src/lib/auth.ts`) read the role from `sessionClaims.metadata.role`. Without this claim, every user is treated as a resident and admin pages redirect away.
3. **Add the webhook.** Go to **Webhooks → Add endpoint**, set the URL to `https://<your-domain>/api/webhooks/clerk`, and subscribe to `user.created`, `user.updated` and `user.deleted`. Copy the endpoint's signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`.

   The webhook keeps `user_snapshots`, the archive behind Analytics' new-user counts and User Management's Deleted Users tab. Locally, Clerk can't reach `localhost`, so expose port 3000 with a tunnel (for example `ngrok http 3000`) and use the tunnel's URL. The portal works without the webhook, but new sign-ups won't be counted and deleted users won't be archived.
4. **Legal links (optional).** If you turn on Clerk's sign-up consent checkbox, set its Terms and Privacy links to `/terms` and `/privacy` in the Dashboard. The footer links on Clerk's own components are already set in `src/app/layout.tsx`.

## 5. Cloudflare R2

1. Create a bucket and put its name in `R2_BUCKET_NAME`.
2. Create an API token with **Object Read & Write** on that bucket.
3. Add a CORS policy. Browsers upload straight to R2 with presigned `PUT` URLs, so the bucket must allow your app's origin:

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```

   Add your production origin when you deploy. The bucket stays private: files are read through `/api/r2`, which redirects to a short-lived presigned URL. See [File storage](file-storage.md).

## 6. Google Maps

In Google Cloud, for the project that owns your API key:

1. Enable the **Maps JavaScript API** (every map), the **Geocoding API** (turning a picked point into an address in `MapPicker`) and the **Routes API** (the Community Hub's "Directions" button, `src/lib/directions.ts`). The legacy Directions API can't be enabled on new projects, which is why the code uses the Routes library.
2. Create a **Map ID** (Map Management → Create Map ID, JavaScript, Vector or Raster) and put it in `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.
3. Restrict the key to your origins (HTTP referrers), since it ships to the browser.

## 7. OpenAI

Put an API key in `OPENAI_API_KEY`. The portal uses `gpt-4o-mini`, `text-embedding-3-small` and `gpt-4o-mini-transcribe` (see [AI features](ai-features.md)). Complaint filing calls the model, so without a key residents can't submit complaints.

## 8. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 9. First-run checklist

1. **Sign up** through the landing page's "Log in" or "Register" button.
2. **Make yourself a super admin.** In the Clerk Dashboard, open your user and set **Public metadata** to:

   ```json
   { "role": "superadmin" }
   ```

   Then reload the portal. Session tokens refresh about once a minute, so if the admin menu items don't appear, sign out and back in. From now on, change roles from **User Management** in the app. Setting a role in the Clerk Dashboard skips the app's side effects (it doesn't clear Resident Credentials and isn't audit logged).
3. **Backfill the user archive** if anyone signed up before the webhook was running:

   ```bash
   npm run backfill:user-snapshots
   ```

4. **Fill in Barangay Settings** (`/portal/barangay-settings`). Until the first save there's no settings row, and every page uses the defaults in `src/lib/data.ts` (including a placeholder GCash number). Set the GCash number, clearance fees, court rates, goal, mission, vision and contact details.
5. **Add officials** for the Barangay and SK sections. They appear on the landing page, About Us and in the assistant's answers.
6. **Upload the knowledge base.** Upload `docs/barangay-maduya-portal-user-manual.pdf` (and any other barangay PDFs) on the AI Assistant Knowledge Base card. Without a document, the assistant can't answer how-to questions.
7. **Try both roles.** Sign up a second account in a private window to see the resident view. A resident must complete Resident Credentials on their profile before the document request, complaint and court reservation forms open.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build. It's also the type check, since there's no test suite |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (`next/core-web-vitals` and `next/typescript`) |
| `npm run backfill:user-snapshots` | Copy every Clerk user into `user_snapshots` (`scripts/backfill-user-snapshots.ts`). Safe to run again: it upserts |
| `npx drizzle-kit push` | Sync `src/db/schema.ts` to the database. It asks before destructive changes |
| `npx drizzle-kit studio` | Browse and edit the database in a local GUI |

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| A page fails with `column "..." does not exist` | The schema has a column the database doesn't. Drizzle's `select()` names every column in `schema.ts`, so run `npx drizzle-kit push` (see [Database](database.md#keeping-the-database-in-sync)). |
| You set a role but still see the resident view | The session token doesn't carry `metadata` (step 4.2), or it hasn't refreshed yet. Sign out and back in. |
| Uploads fail in the browser with a CORS error | The R2 bucket's CORS policy doesn't list your origin (step 5.3). |
| Uploading a news photo or official's photo returns 403 | Only admins can upload under the public prefixes (`officials`, `news/…`, `transparency/…`). |
| Images show as broken | The R2 credentials or bucket name are wrong, or the object was deleted. `/api/r2?key=…` redirects to R2, so open it directly to see the error. |
| The webhook returns 400 | `CLERK_WEBHOOK_SIGNING_SECRET` doesn't match the endpoint's secret. |
| Maps are blank or show "For development purposes only" | The API key is missing, the Maps JavaScript API isn't enabled, or billing isn't set up on the Google Cloud project. Markers need `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`. |
| "Directions" always says it can't find a route | The Routes API isn't enabled for the key. |
| A picked map point has "Address unavailable" | The Geocoding API isn't enabled for the key. |
| Submitting a complaint fails | `OPENAI_API_KEY` is missing or out of credit: filing a complaint calls `analyzeComplaint` first. |
| The assistant says no documents have been uploaded | Upload a PDF in Barangay Settings (step 9.6). |
| A knowledge base upload fails with "No extractable text" | The PDF is scanned images with no text layer. Run it through OCR first. |
| Analytics shows no new users | The webhook isn't set up, or users signed up before it was. Run the backfill script. |
