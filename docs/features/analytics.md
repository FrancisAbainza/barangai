# Analytics

A monthly report on the portal's activity for admins, at `/portal/analytics`. Pick a month and see how many requests, complaints, reservations, businesses, posts and sign-ups it had, how that compares with the month before, the trend over the past year, and breakdowns by status, type, category and priority.

## The page

`AnalyticsDashboard` (`src/components/analytics/analytics-dashboard.tsx`):

| Part | What it shows |
|---|---|
| Month picker | Every month from the first one with data (`getAnalyticsFirstMonth`) to the current month, newest first |
| Summary tiles | Document requests, complaints, court reservations, businesses, news posts and new users for the month, each with its change from the month before ("3 more than last month") |
| Trend chart | `MonthlyTrendChart`: the 12 months up to the picked month, one line per kind, with a Table tab showing the same numbers |
| Document Requests card | `SplitBar` by status, `BreakdownPieChart` by document type |
| Court Reservations card | Hours booked and fees (approved reservations only), `SplitBar` by status |
| Complaints card | `SplitBar` by status and by priority, `BreakdownPieChart` by category |
| Community Hub card | `SplitBar` by status, `BreakdownPieChart` by category |

While a newly picked month loads, the previous report stays on screen dimmed (`placeholderData: keepPreviousData`).

## How records are counted

`getMonthlyAnalytics(month)` (`src/actions/analytics.ts`, admins only) takes a `"YYYY-MM"` month and:

1. Works out the 12 months ending with it and the Philippine-time instant each one starts (`getMonthStart`, `"2026-10-01T00:00:00+08:00"`).
2. Runs one query per table for the rows created in that span: document requests, complaints, court reservations, businesses, news posts, and users (`user_snapshots.joinedAt`).
3. Counts in memory. Each row goes in the Philippine calendar month it was created in (`toPhilippineMonth`, which shifts the UTC timestamp by 8 hours).

The rules that follow from this:

- **A record counts toward the month it was created in**, not when it was reviewed. "Complaints in October" means complaints filed in October.
- **Breakdowns show each record's current status.** October's "Resolved" count is how many complaints filed in October are resolved now, whenever that happened. Questions about when things were reviewed need the [audit logs](audit-logs.md).
- **Court fees and hours** add up the approved reservations created that month, using the fee stored with each.
- **A business edited by its owner** gets a new `createdAt` (see [Community Hub](community-hub.md#editing-is-resubmitting)), so it moves to the month of the edit.
- **New users** come from `user_snapshots`, which the Clerk webhook fills. Users who signed up before the webhook existed only appear after `npm run backfill:user-snapshots`. Deleted users still count in the month they joined.

`countBy` lists every status and priority in its enum order, zeros included, so the split bars always show the same segments. For types and categories it lists only the ones that came up, most frequent first.

## Charts

The charts are shadcn charts over Recharts 3, using the `--chart-1` to `--chart-5` colors from `globals.css`:

- `SplitBar` (`split-bar.tsx`) draws one segmented bar plus a legend with each count, which also shows the zeros Recharts wouldn't draw.
- `BreakdownPieChart` (`breakdown-pie-chart.tsx`) draws a donut with a legend. The five most frequent items get the chart colors and the rest are gray.
- `MonthlyTrendChart` (`monthly-trend-chart.tsx`) draws the 12-month trend as a `LineChart`, with a table view of the same data.

See [UI conventions](../ui-conventions.md#charts).

## AI assistant

The admin assistant's `getAnalytics` tool calls the same `getMonthlyAnalytics`, then adds the change from last month, totals over a span of up to 12 months and each kind's busiest month, all worked out in code. See [AI assistant](../ai-assistant.md#analytics-admins).

## Files

| File | What it does |
|---|---|
| `src/actions/analytics.ts` | `getMonthlyAnalytics`, `getAnalyticsFirstMonth` |
| `src/lib/analytics.ts` | `getCurrentMonth`, `toPhilippineMonth`, `getMonthStart`, `shiftMonth`, `formatMonth` |
| `src/components/analytics/` | The dashboard, trend chart, breakdown card, split bar and pie chart |
| `src/app/portal/analytics/page.tsx` | The page |
