# News and Transparency

Admins publish two kinds of posts that everyone can read, including signed-out visitors: **News & Announcements** and **Transparency** projects (what the barangay is doing and what it costs). Both have reactions, threaded comments and Facebook sharing, and they're built almost identically.

| | News | Transparency |
|---|---|---|
| Portal pages | `/portal/news`, `/portal/news/[id]` | `/portal/transparency`, `/portal/transparency/[id]` |
| Public pages | `/news`, `/news/[id]` | `/transparency`, `/transparency/[id]` |
| Table | `news` | `transparency_projects` |
| Actions | `src/actions/news.ts` | `src/actions/transparency.ts` |
| Components | `src/components/news/` | `src/components/transparency/` |
| Query key prefix | `["news"]` | `["transparency-projects"]` |

## News posts

| Field | Rules |
|---|---|
| Title | At least 3 characters |
| Category | Announcement, Event or Emergency |
| Content | At least 10 characters |
| Media | Up to 10 photos or videos (`news/media`), shown as a gallery |
| Attachments | Up to 3 documents (`news/attachments`), listed under the post |
| Pinned | Pinned posts sort above the rest |

`getNews` orders by pinned, then newest, then id, 10 per page. It can search the title and content, filter by category, and narrow to one author (for an admin's profile). The landing page's carousel shows the first page.

## Transparency projects

| Field | Rules |
|---|---|
| Title | At least 3 characters |
| Category | Infrastructure, Health, Education, Livelihood, Social Welfare, Peace and Order, Environment, Others |
| Description | At least 10 characters |
| Budget | Optional, zero or more, stored as `numeric(12, 2)` |
| Location | Optional map pin |
| Media, attachments | Same as news, under `transparency/media` and `transparency/attachments` |

The list has a **List** view and a **Map** view (`TransparencyProjectsMapView`) of the projects with a location. There's no pinning, and projects have a budget, not an actual amount spent, and no status.

## Who can do what

| Action | Who |
|---|---|
| Read posts and comments | Everyone, signed in or not |
| Create a post | Admins. The create button only renders for admins (`/portal/news` and `/portal/transparency` check `getAuthRole()` on the server) |
| Edit or delete a post | Its author, or any super admin. Other admins can't touch each other's posts |
| React (like or dislike) | Signed-in users. The buttons are disabled for visitors |
| Comment and reply | Signed-in users. Visitors see a sign-in button instead of the comment box |
| Delete a comment | Its author only |

`createTransparencyProject` requires an admin on the server. `createNews` only requires a signed-in user (see [Known issues](../known-issues.md)).

## Reactions

One row per user per post (unique index), either `like` or `dislike`. `setNewsReaction(newsId, type)` toggles: the same type again removes the reaction, and the other type switches it. The list query returns each post's like and dislike counts, comment count and the viewer's own reaction (`userReaction`).

## Comments

Comments have one level of replies: a reply's `parentId` is a top-level comment, and `addNewsComment` refuses to reply to a reply. In the UI, replying to a reply attaches the new comment to the top-level comment (`replyTo.parentId ?? replyTo.id`). New comments show right away through an optimistic update. Deleting a comment deletes its replies (cascade). Comments aren't moderated and aren't audit logged.

## Sharing

The **Share** button opens Facebook's sharer with the post's public URL (`/news/<id>` or `/transparency/<id>`), never the `/portal` one, so it works for people without accounts.

The public post pages export `generateMetadata` with Open Graph tags: the title, the first 200 characters of the content and the first image. The image URL is `<origin>/api/r2?key=…`, which crawlers can fetch because the news and transparency prefixes are public. The origin comes from the request's `x-forwarded-proto` and `host` headers.

A signed-in user who opens a shared link is redirected to `/portal/news/<id>` by `src/proxy.ts`, so they stay in the portal. The portal post pages fetch the post on the server and hand it to `NewsPostDetail` / `TransparencyProjectDetail`, which keep it in React Query under the domain's prefix so reactions, edits and deletes on the card refresh it.

## Profiles

An admin's profile has News and Transparency tabs listing that admin's posts (`NewsList` and `TransparencyProjectList` with `authorId`).

## Side effects

Posts don't notify anyone. Every create, edit and delete is audit logged with the title, category and content or description (plus pinned for news, budget for projects). Media, attachments and the location aren't compared. The budget is logged in the numeric column's format (`"1500.00"`) so an unchanged budget doesn't show as a change.

The create dialogs (`?dialog=create-news`, `?dialog=create-transparency-project`) are registered for the AI assistant with `audience: "admin"`, and its `findNews` and `findTransparencyProjects` tools read the posts. See [AI assistant](../ai-assistant.md#news-and-announcements).

## Files

| File | What it does |
|---|---|
| `src/actions/news.ts`, `src/actions/transparency.ts` | Create, update, list, get by id, react, delete, and the comment actions |
| `src/schemas/news-schema.ts`, `src/schemas/transparency-schema.ts` | Form schemas and the transparency categories |
| `src/components/news/` | `NewsList`, `NewsCard`, `NewsForm`, the create, edit, delete and comments dialogs, `NewsPostDetail` |
| `src/components/transparency/` | The same pieces for projects, plus the map view |
| `src/components/landing/news-carousel.tsx` | The landing page's latest news |
| `src/app/news/[id]/page.tsx`, `src/app/transparency/[id]/page.tsx` | Public post pages with Open Graph metadata |
