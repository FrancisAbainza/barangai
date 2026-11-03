# Deployment

The portal is a standard Next.js 16 app. The code assumes a serverless host like Vercel: `maxDuration` exports set function time limits, and the knowledge base's 15 MB limit is sized so one function invocation can process a PDF. Any host that runs `next build` and `next start` works, as long as it allows 60-second requests for the portal and `/api/chat`.

## Services

Production should use its own instances, separate from development:

| Service | For production |
|---|---|
| Clerk | A **production instance** (its own keys and domain). Development instances have limits and show a banner |
| Neon | A production branch or project, with `CREATE EXTENSION IF NOT EXISTS vector;` run once |
| Cloudflare R2 | A production bucket and API token |
| Google Cloud | An API key restricted to the production domain, with the Maps JavaScript, Geocoding and Routes APIs, and a Map ID |
| OpenAI | A project key with a monthly usage limit |

## Environment

Set every variable from [Getting started](getting-started.md#2-environment-variables) on the host. The `NEXT_PUBLIC_` ones are inlined at build time, so rebuild after changing them.

Generate a separate VAPID key pair for production (`npx web-push generate-vapid-keys`) and keep it. Replacing it later turns phone notifications off for every resident until they turn them on again.

## Steps

1. **Database.** Push the schema to the production database before the code that needs it goes live:

   ```bash
   DATABASE_URL=<production url> npx drizzle-kit push
   ```

   Review what `push` proposes. Destructive changes (dropped columns, changed enums, new `NOT NULL` constraints) need a decision from the owner. See [Database](database.md#keeping-the-database-in-sync).
2. **Clerk.**
   - Add the session token claim `{ "metadata": "{{user.public_metadata}}" }` to the production instance (it's per instance).
   - Add the webhook endpoint `https://<domain>/api/webhooks/clerk` with `user.created`, `user.updated` and `user.deleted`, and set `CLERK_WEBHOOK_SIGNING_SECRET` to its secret.
   - Set the sign-up consent links, if enabled, to `https://<domain>/terms` and `/privacy`.
   - Configure the production domain's DNS records as Clerk instructs.
3. **R2.** Add the production origin to the bucket's CORS `AllowedOrigins` (`GET`, `PUT`).
4. **Google Maps.** Add the production domain to the API key's HTTP referrer restrictions.
5. **Build and deploy** (`npm run build`). The build fails on type errors.
6. **First super admin.** Set one user's public metadata to `{ "role": "superadmin" }` in the Clerk Dashboard. Everything else is done in the app.
7. **Backfill** `user_snapshots` if the production instance already had users: run `npm run backfill:user-snapshots` with the production `.env`.
8. **Settings and content.** Fill in Barangay Settings (the GCash number default is a placeholder), add the officials and upload the user manual to the knowledge base.

## After deploying, check

- The landing page shows the right hotlines and address (they come from settings).
- Signing in lands on `/portal`, and the super admin sees Analytics, User Management, Barangay Settings and Audit Logs.
- A resident can save Resident Credentials with an ID photo (R2 upload and CORS work).
- A map shows pins, and picking a point fills in an address (Maps key, Map ID, Geocoding).
- Filing a complaint works (OpenAI).
- The AI assistant answers a question about the barangay's fees and a how-to question (settings and knowledge base).
- Creating a test account adds a row to `user_snapshots`, and the webhook's deliveries in the Clerk Dashboard show 200.
- Sharing a news post shows a preview with its title and image (Open Graph through `/api/r2`).

## Images

`next.config.ts` allows `next/image` to load from `placehold.co` and `img.clerk.com` (Clerk avatars). Uploaded files are served through `/api/r2` on the same origin, so they need no entry. Add a `remotePatterns` entry for any other image host.

## Operations

- **Backups.** Neon keeps point-in-time history according to the plan. R2 has no versioning unless you turn it on. Audit logs are never deleted by the app.
- **Retention.** Read notifications are deleted 30 days after they're read, when the user next opens their notifications. Nothing else expires on its own.
- **Orphaned files.** Most file deletions run in the browser after the database write, so an interrupted delete can leave files in R2 with no row pointing to them (see [File storage](file-storage.md#deleting)). They cost storage but aren't reachable from the app.
- **Costs to watch.** OpenAI usage grows with chat messages (at least three calls each), complaints and knowledge base uploads. Clerk's user list scans in User Management grow with the number of users.
