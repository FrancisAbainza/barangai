# UI conventions

How the interface is built and the shared components to reach for before writing new ones.

## Components and styling

- **shadcn/ui** components live in `src/components/ui/` (style `radix-vega`, base color neutral, lucide icons, see `components.json`). The shadcn CLI owns these files, so edit them carefully and keep changes small.
- **Adding a shadcn component:** run `npx shadcn add <name>`. The current CLI writes `import { cn } from "cn"` and adds a `cn` npm package. Change the import to `import { cn } from "@/lib/utils"` and uninstall `cn` afterwards.
- **Tailwind CSS v4** through `@tailwindcss/postcss`, with theme tokens as CSS variables in `src/app/globals.css`. Merge class names with `cn()` (`clsx` + `tailwind-merge`).
- **Icons** come from `lucide-react`. **Toasts** use `toast.success` / `toast.error` / `toast.info` from `sonner`, rendered by the `Toaster` in the root layout.
- **Mobile:** `useIsMobile()` (`src/hooks/use-mobile.ts`) switches at 768px, the same as Tailwind's `md`. The portal sidebar is hidden below `md` and `PortalHeader` provides the menu button instead.
- **Barangay constants:** import the name, logo and city from `src/lib/data.ts` instead of typing them. Contact details, fees and rates are admin-editable, so read them from `getBarangaySettings()`.

### Shared components

| Component | Use it for |
|---|---|
| `PageHeader` | Every page's title, icon, description and right-side actions |
| `StatCard` | A number with a label, icon and description (admin stat tiles, Analytics) |
| `ShortcutTileContent`, `shortcutTileClassName` | The home pages' link tiles |
| `EmptyState` | An icon, title and description when a list is empty |
| `LoadMoreTrigger` | The last row of an infinite table: fetches the next page as it scrolls into view |
| `ResidentCredentialsBanner` | The "complete your credentials" prompt on service pages |
| `FileUploader` | Every file field (see [File storage](file-storage.md#accepted-files-and-limits)) |
| `MediaGrid`, `AttachmentList`, `MediaLightbox`, `MediaPreviewList` | Showing uploaded files |
| `DatePicker`, `TimePicker`, `DateTimePicker` | Every date and time input (below) |
| `MapPicker`, `MapView` and the `*-map-view.tsx` components | Maps (below) |

## Forms

Forms use React Hook Form with a Zod schema from `src/schemas/<name>-schema.ts`:

```tsx
const { control, register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ComplaintFormValues>({
  resolver: zodResolver(complaintFormSchema),
  defaultValues: { ...baseDefaults, ...defaultValues },
});

<Field data-invalid={!!errors.subject}>
  <FieldLabel htmlFor="subject">Subject</FieldLabel>
  <Input id="subject" {...register("subject")} />
  <FieldError errors={[errors.subject]} />
</Field>
```

- Layout and errors use shadcn's `Field`, `FieldLabel`, `FieldDescription` and `FieldError`.
- Custom inputs (pickers, the file uploader, the map picker, selects) are wired with a `Controller`.
- A form component takes `defaultValues`, `onSubmit` and `onCancel`. The dialog around it owns the mutation: it uploads files, calls the server action, invalidates queries, shows a toast and closes. This keeps one form usable for both create and edit dialogs.
- Forms the AI assistant can open spread `useDialogPrefill(id)` into `defaultValues`.
- Schema files also export the option lists (`COMPLAINT_CATEGORIES`, `VALID_ID_TYPES`, …) that the database enums are built from, so a select's options always match the column.
- Keep validation in one place, the Zod schema, and enforce what matters for integrity again in the server action. Don't repeat the same check in the picker, the schema and the action when the picker already prevents bad input.

## Dates and times

Never use `<input type="date">`. The three pickers keep their values as plain strings so time zones never come into it:

| Component | Value | Notable props |
|---|---|---|
| `DatePicker` (`src/components/date-picker.tsx`) | Local `"YYYY-MM-DD"`, or `""` | `disabledDays` (react-day-picker matchers, e.g. `{ before: today }` or `{ dayOfWeek: [0, 6] }`), `required`, `captionLayout="dropdown"` with `startMonth`/`endMonth` for far-off dates like birthdates |
| `TimePicker` (`src/components/time-picker.tsx`) | 24-hour `"HH:MM"`, or `""` | `minTime`, `maxTime`, `step` (minutes between options; without it, a plain time input) |
| `DateTimePicker` (`src/components/date-time-picker.tsx`) | Local `"YYYY-MM-DDTHH:MM"`, or `""` until both parts are picked | `disabledDays`, `minTime`, `maxTime`, `step` |

Convert with `toDateValue(date)` and `parseDateValue(value)` from `src/lib/utils.ts`. `new Date("YYYY-MM-DDTHH:MM")` reads local time, so a `DateTimePicker` value becomes a `Date` in the browser before it's sent to the server. The browser is assumed to be on Philippine time. See [Architecture](architecture.md#time-zones).

## Theming and dark mode

- **Tokens.** `globals.css` defines the palette as `oklch` CSS variables on `:root` and overrides them under `.dark`. The primary color is a deep blue, with `--primary-deep` (a navy) for the public site's hotline bar, footer and feature cards.
- **Portal only.** `ThemeProvider` (`next-themes`, class attribute) forces `light` outside `/portal`. System theme detection is off and the default is light.
- **The `dark:` variant** is `&:is(.dark *):not(.light *)`. A `.light` class re-scopes the light palette inside dark mode, for surfaces that are always white, like Google Maps info windows and the route card (`className="light …"`).
- **Saving the choice.** `ThemeToggle` (in the sidebar footer) sets the theme and saves it with `setMyThemePreference`. `ThemePreferenceSync` (in the portal layout) applies the saved theme once on load, so it follows the user to a new device. next-themes also keeps it in `localStorage`.

## Charts

Charts are shadcn charts (`src/components/ui/chart.tsx`) over Recharts 3.

- Series use `--chart-1` to `--chart-5` in that order. They're a colorblind-checked categorical palette with separate dark-mode values. A single-series chart uses `--chart-1`.
- Recharts doesn't draw a bar of value 0 or its `LabelList`, and it lists legend and tooltip items by name unless you pass `itemSorter`.
- On Analytics, a split by status or priority is a `SplitBar` (one segmented bar plus a legend with every count, zeros included), and the types or categories that came up are a `BreakdownPieChart` (a donut with the five most frequent in the chart colors and the rest gray).

## Maps

Google Maps runs through `@vis.gl/react-google-maps`. Each map is wrapped in an `APIProvider` with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and uses `mapId={NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}`, which `AdvancedMarker` requires.

| Component | What it does |
|---|---|
| `MapPicker` | A form field: click or use your current location to drop a pin, then reverse-geocode it into a `LocationValue` (`{ coordinates, address }`) |
| `MapView` | Shows one read-only location (complaint and business dialogs, project cards) |
| `ComplaintsMapView`, `BusinessesMapView`, `TransparencyProjectsMapView` | Every record with a location as a pin, with an info window per pin |
| `MaduyaBoundaryOverlay` | Draws the barangay's boundary polygon (`MADUYA_BOUNDARY_PATH` in `src/lib/maduya-boundary.ts`, from OpenStreetMap relation 12015821) |
| `CurrentLocationControl`, `CurrentLocationMarker` | A button that pans to and pins the user's position |
| `RouteOverlay` with `useDirections` | Draws a driving route and shows its distance and time (Community Hub) |

- **Reverse geocoding** uses the client-side `google.maps.Geocoder` (`coordinatesToAddress` in `src/lib/geocoding.ts`), because the Geocoding REST endpoint sends no CORS headers and is blocked in the browser. A failed lookup gives `""`, shown as "Address unavailable".
- **Directions** use the Routes library (`google.maps.importLibrary("routes")`, `computeRoute` in `src/lib/directions.ts`), because the legacy Directions API can't be enabled on new projects.
- **Your position** comes from `getCurrentLocation()` (`src/lib/geolocation.ts`), a promise around `navigator.geolocation`. `distanceInMeters` computes straight-line distances.

## Tables and lists

- Admin pages put a search box and a **Filters** button above the table. The button opens a dialog with the filters and sort order, and shows a badge counting the active filters.
- Search inputs are debounced before they become part of the query key.
- Clicking a row opens its Submission Info and sets `?view=<id>`. The last cell holds the actions menu and stops the click from reaching the row.
- Status, priority and category badges get their variant from the domain's lib (`statusBadgeVariant`, `priorityBadgeVariant`).

## Text

- The interface is in English. The AI assistant's prompt doesn't set a language, so it replies in whatever the user writes in (Filipino, English or Taglish).
- Dates for people use `en-US` long or short month formats ("November 3, 2026", "Nov 3, 2026"). Money uses `₱` with two decimals for fees (`formatFee`).
- Reference numbers are plain `DR-12`, never zero-padded, so staff can type them.
