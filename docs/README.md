# Barangay Maduya Portal: developer documentation

These documents describe how the portal is built and how to work on it. They're written for developers maintaining or extending the codebase. For how residents and staff use each page, see the [portal user manual (PDF)](barangay-maduya-portal-user-manual.pdf).

The portal is a Next.js 16 (App Router) app for Barangay Maduya, City of Carmona, Cavite. Residents use it to request documents, report complaints, reserve the barangay court, list their businesses and follow barangay news and projects. Barangay staff (admins) review all of it from the same app, and an AI assistant answers questions for both.

## Start here

| Document | What it covers |
|---|---|
| [Getting started](getting-started.md) | Accounts and services to set up, environment variables, first run, scripts and common setup problems |
| [Architecture](architecture.md) | The stack, folder layout, how pages, server actions and React Query fit together, URL-driven dialogs, time zones and the conventions every domain follows |
| [Authentication and roles](authentication-and-roles.md) | Clerk, the three roles, the route guards and Resident Credentials |
| [Role matrix](role-matrix.md) | What visitors, residents, admins and super admins can open and do: pages, actions, files and AI assistant tools, with where each is enforced |
| [Database](database.md) | Every table and enum, JSON column shapes, relationships and the `drizzle-kit push` workflow |
| [File storage](file-storage.md) | Cloudflare R2, upload prefixes, the `/api/r2` route and who cleans up files |

## Features

| Document | What it covers |
|---|---|
| [Document requests](features/document-requests.md) | The six document types, payment, pickup and soft copy delivery, statuses |
| [Complaints](features/complaints.md) | Reporting on a map, AI triage, duplicate detection and followers, AI response planning |
| [Court reservations](features/court-reservations.md) | Time storage, day and night billing, overlap rules, approval |
| [Community Hub](features/community-hub.md) | The business directory, verification, the map and directions |
| [News and Transparency](features/news-and-transparency.md) | Posts, projects, reactions, comments, sharing and the public pages |
| [Barangay settings and About Us](features/barangay-settings.md) | Fees, rates, contact details, goal/mission/vision, officials and the knowledge base |
| [Profiles and Resident Credentials](features/profiles.md) | The profile page, the resident profile form and what it unlocks |
| [Home pages](features/home.md) | The resident and admin home pages and the Needs Attention queue |
| [Notifications](features/notifications.md) | When residents are notified, links, phone notifications and retention |
| [Audit logs](features/audit-logs.md) | What's logged, how entries are built and who can read them |
| [Analytics](features/analytics.md) | The monthly report and how records are counted |
| [User management](features/user-management.md) | Roles, bans, account deletion, the deleted-users archive and the Clerk webhook |
| [Public site](features/public-site.md) | The signed-out pages, redirects, sharing metadata and the legal pages |

## Walkthroughs

Line-by-line traces of the code behind one flow, in the order it runs, jumping between files when the code does. Each one gives the date its line numbers were checked.

| Document | What it covers |
|---|---|
| [Phone notifications](walkthroughs/phone-notifications.md) | A resident turning phone notifications on, and an admin's status change being pushed to their phone and opened |

## AI

| Document | What it covers |
|---|---|
| [AI features](ai-features.md) | Every place the portal calls OpenAI: complaint triage and insights, voice input, the knowledge base pipeline |
| [AI assistant](ai-assistant.md) | The chat assistant in depth: request flow, tools, links, prompts and how to extend it |
| [AI assistant prompts](ai-assistant-prompts.md) | What users can ask the assistant, per role and topic, what answers each prompt, what it turns down and its known weak spots |

## Working on the code

| Document | What it covers |
|---|---|
| [UI conventions](ui-conventions.md) | shadcn/ui, theming and dark mode, forms, date and time pickers, the file uploader, maps and charts |
| [Development guide](development-guide.md) | Step-by-step recipes (new column, status, upload location, page, domain, setting, audit action) and gotchas |
| [Deployment](deployment.md) | Moving to production: services, environment, Clerk, R2, Maps and a post-deploy checklist |
| [Known issues](known-issues.md) | Gaps found while writing these docs, with where each one is and how to fix it |

## Other references

- [README](../README.md): the feature list and a short setup guide
- [CLAUDE.md](../CLAUDE.md): a condensed architecture overview, also used by Claude Code
