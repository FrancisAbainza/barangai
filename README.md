# Barangay Maduya Portal

The online portal of Barangay Maduya, City of Carmona, Cavite. Residents can request documents, report complaints, reserve the barangay court and follow barangay news and projects without going to the barangay hall. Barangay staff handle all of it from the same app. An AI assistant answers residents' and staff's questions in Filipino or English.

## Features

### Public site

- Landing page with the barangay's hotlines, email and address
- News and announcements, and Transparency (the barangay's projects and their budgets)
- About Us: barangay and SK officials, goal, mission and vision
- Privacy policy and terms of use

Signed-in users are sent to the portal version of each page.

### Residents

- **Resident profile:** personal details and a valid ID, which document requests, complaints and court reservations need
- **Document requests:** Barangay Clearance, Certificate of Residency, Certificate of No Objection, Certificate of Indigency, Solo Parent Certification and Medical / Lab Assistance. Paid clearances are paid through GCash with an uploaded receipt. Requests go from Pending to Processing to Ready for Pickup to Claimed.
- **Complaints:** pinned on a map, with an AI-suggested category and priority. When a new report is close to an open complaint about the same thing, the resident can follow that complaint and get its updates instead of filing a duplicate.
- **Court reservations:** priced with the barangay's day and night rates, paid through GCash
- **Community Hub:** a map and directory of local businesses. Residents submit their own businesses, and an admin verifies them before they're listed.
- **News and Transparency:** reactions, comments and Facebook sharing
- **Notifications** whenever the barangay updates or deletes one of their submissions
- Light and dark mode, saved per account

### Barangay staff (admins)

- Review and update every submission. The home page shows a Needs Attention queue.
- Post news and transparency projects, and manage the officials on About Us
- AI response planning for complaints
- **Analytics:** monthly trends and breakdowns of requests, complaints, reservations, businesses and new users
- **User management:** view users and their profiles, ban residents, and browse the archive of deleted users
- **Barangay settings:** GCash number, clearance fees, court rates, goal/mission/vision, contact details and the AI assistant's knowledge base (PDFs)

Super admins can also change roles, ban admins, delete users and their data, and read the **audit logs** of every admin action.

### AI assistant

A chat widget on every portal page that:

- answers questions from the barangay's uploaded PDFs (retrieval with pgvector) and its current settings
- looks up live data: the user's own submissions, court availability and fees, local businesses (nearest first, with whether they're open now), news and projects. Admins can also ask about workload, analytics and audit logs.
- links to the right page or form, with the details the user already gave filled in
- accepts voice input

See [docs/ai-assistant.md](docs/ai-assistant.md) for how it works.

## Tech stack

| Area | Tools |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, server actions), React 19, TypeScript |
| UI | Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com), lucide-react, Recharts, sonner |
| Auth | [Clerk](https://clerk.com) |
| Database | [Neon](https://neon.tech) Postgres with pgvector, [Drizzle ORM](https://orm.drizzle.team) |
| Data fetching | TanStack React Query |
| Forms | React Hook Form, Zod |
| File storage | Cloudflare R2 (presigned URLs) |
| Maps | Google Maps through `@vis.gl/react-google-maps` |
| AI | [Vercel AI SDK](https://ai-sdk.dev) with OpenAI (`gpt-4o-mini`, `text-embedding-3-small`, `gpt-4o-mini-transcribe`), LangChain text splitters, unpdf |

## Getting started

### Prerequisites

- Node.js 20 or later
- Accounts for Clerk, Neon, Cloudflare R2, Google Cloud (Maps) and OpenAI

### 1. Install

```bash
git clone https://github.com/FrancisAbainza/barangai.git
cd barangai
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=

# Neon Postgres
DATABASE_URL=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=

# OpenAI
OPENAI_API_KEY=
```

### 3. Database

Enable pgvector in your Neon database (Neon's SQL editor works):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then create the tables from the schema in `src/db/schema.ts`:

```bash
npx drizzle-kit push
```

Tables are synced with `push`. Don't run `drizzle-kit generate`: the `drizzle/` folder only holds the pgvector migration, so `generate` would write a migration that recreates every table.

### 4. Clerk

1. **Session token:** in the Clerk Dashboard, go to **Sessions → Customize session token** and add the following, so the app can read each user's role:

   ```json
   {
     "metadata": "{{user.public_metadata}}"
   }
   ```

2. **Webhook:** add an endpoint at `https://<your-domain>/api/webhooks/clerk` subscribed to `user.created`, `user.updated` and `user.deleted`, and put its signing secret in `CLERK_WEBHOOK_SIGNING_SECRET`. It keeps the user archive that Analytics and the deleted-users list use. For local development, expose port 3000 with a tunnel such as ngrok.
3. **First super admin:** sign up in the app, then set your user's public metadata in the Clerk Dashboard to:

   ```json
   { "role": "superadmin" }
   ```

   From then on, roles can be changed in the app's User Management page. Users without a role are residents.

If users signed up before the webhook was set up, add them to the archive once with:

```bash
npm run backfill:user-snapshots
```

### 5. Cloudflare R2

Create a bucket and an API token with read and write access to it. Files are uploaded straight from the browser with presigned URLs, so add a CORS rule to the bucket that allows `GET` and `PUT` from your app's origin (e.g. `http://localhost:3000`).

### 6. Google Maps

Enable the **Maps JavaScript API** and **Geocoding API** for your API key, and create a **Map ID** in Google Cloud's Map Management.

### 7. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build, which is also the type check |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run backfill:user-snapshots` | Copy existing Clerk users into `user_snapshots` (one-time) |
| `npx drizzle-kit push` | Sync the schema to the database |
| `npx drizzle-kit studio` | Open a database GUI |

## Project structure

```
src/
├── app/                 # Routes: public pages, /portal/*, and the API routes (r2, chat, Clerk webhook)
├── actions/             # Server actions: queries, Clerk lookups and authorization, one file per domain
├── components/          # UI, one folder per domain (dialogs, forms, tables, map views)
│   └── ui/              # shadcn/ui components
├── db/                  # Drizzle schema and Neon client
├── hooks/
├── lib/                 # Shared helpers. lib/ai-assistant/ holds the assistant's prompt, search and tools
├── schemas/             # Zod schemas for the forms
└── proxy.ts             # Clerk middleware: sign-in and role checks per route
```

## Documentation

- [Portal user manual (PDF)](docs/barangay-maduya-portal-user-manual.pdf): how residents and staff use each page
- [AI assistant](docs/ai-assistant.md): how the assistant is put together and how to add forms, pages and tools
- [CLAUDE.md](CLAUDE.md): a detailed architecture overview

## Author

[Francis Rafael Abainza](https://francis-abainza-portfolio.vercel.app/)
