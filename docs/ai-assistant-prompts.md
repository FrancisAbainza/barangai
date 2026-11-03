# AI assistant prompts

The prompts the AI assistant can handle, by role and topic: an example of each, where the answer comes from, and what the reply contains. It also lists what the assistant turns down and where its answers are known to slip. Use it to know what to expect from the assistant, and as a checklist after changing the system prompt, a tool or the model. For how the assistant works, see [AI assistant](ai-assistant.md).

Users can ask in English, Filipino or Taglish, by typing or with voice input. The examples below are the kind of wording the tool descriptions and the chat's "Show example questions" list use (`RESIDENT_SUGGESTED_PROMPTS` and `ADMIN_SUGGESTED_PROMPTS` in `src/components/ai-assistant/chat-panel.tsx`).

## Kinds of prompts

| Kind | Example | What the assistant does |
|---|---|---|
| A question | "Ano ang hotline ng barangay?" | Answers directly from the barangay settings, the officials lists, the knowledge base or a tool's result, instead of sending the user to a page |
| How to do something | "Paano mag-request ng barangay clearance?" | Gives every step from the knowledge base as a numbered list, then links the form (or the page the steps start on) |
| Do something now | "Pa-request ng barangay clearance para sa bago kong trabaho" | Links the form, with the details the user already gave filled in. If the request is too broad ("I want to request a document"), it asks which one |
| Go somewhere | "Go to the news page" | Links the page |
| Anything else | "Write me a Python script" | Turns it down in a sentence or two and says what it can help with (see [What it turns down](#what-it-turns-down)) |

Every link in a reply shows as a button. A link only opens a page, a form or a record: the assistant never submits, approves or changes anything, and never says it did. It links up to 3 records an answer is about, and for more it links their page.

## Both roles

### Barangay information

These answers come from the barangay settings and officials lists that are in every system prompt, so they're always the current values from Barangay Settings.

| Prompt | Answered from |
|---|---|
| "Ano ang hotline ng barangay?", "What's the barangay's email?", "Saan ang barangay hall?" | Contact details: hotlines, email, address |
| "Magkano ang barangay clearance para sa trabaho?", "Libre ba ang clearance para sa scholarship?" | Clearance fees by purpose, and the free purposes |
| "Ano ang GCash number para sa bayad?" | GCash number and account name |
| "Magkano ang court per hour?" | Court day and night rates |
| "Sino ang kapitan?", "Who are the SK officials?" | Barangay and SK officials lists |
| "Ano ang mission at vision ng barangay?" | Goal, mission and vision |

### The knowledge base

Anything else specific to the barangay, such as requirements, schedules, policies and how to use the portal, comes from the PDFs uploaded on Barangay Settings' AI Assistant Knowledge Base card (the [portal user manual](barangay-maduya-portal-user-manual.pdf), for one). The reply says the information came from the barangay's uploaded reference document.

| Prompt | Reply |
|---|---|
| "Ano ang requirements para sa Certificate of Indigency?" | The requirements from the excerpts |
| "Paano mag-request ng barangay clearance?", "How do I reserve the court?" | Every step as a numbered list, then the form's link |
| "Paano ko i-approve yung court reservation?" (admin) | Every step, then a link to the page they start on |

If no excerpt covers the question, the assistant says it doesn't have that information rather than guessing, and links the relevant page. Residents also get the hotlines. If no PDF has been uploaded, residents are told an admin hasn't uploaded the reference document yet, and admins are told they can upload one in Barangay Settings.

### Court reservations

| Prompt | Answered from | Reply |
|---|---|---|
| "Magkano kung mag-reserve ako 4:30 to 7:30 PM?", "How much for 3 hours from 5 PM?" | `calculateCourtFee` | The total and its hour-by-hour breakdown. An hour that crosses 6:00 AM or 6:00 PM is billed at the night rate |
| "Bakante ba ang court sa Sabado ng gabi?", "Anong oras pa available bukas?", "Pwede ba 8 to 10 PM sa Biyernes?" | `checkCourtAvailability` | The booked and open times on up to 7 dates, cut to the hours asked about, with a plain yes or no when a specific time is taken. Past dates and today's past hours are left out |
| "Pa-reserve ako ng court sa Sabado, 3 to 5 PM, para sa basketball practice" | `getFormLink` | The reservation form with the date, start time, hours and purpose filled in |

"Bukas", "sa Sabado" and other days are looked up in the coming week's calendar that the tool's description lists, so the dates are right.

### Local businesses

| Prompt | Answered from | Reply |
|---|---|---|
| "Saan ang pinakamalapit na karinderya?" | `getUserLocation`, then `findBusinesses` | The browser asks to share the user's location, then the businesses that fit, nearest first with distances. If the location can't be read within 30 seconds, it answers with their addresses |
| "May vulcanizing shop ba dito?", "Saan may nagbebenta ng load?" | `findBusinesses` | The verified Community Hub businesses whose name, category or description fits. If none fit, it says so |
| "Bukas pa ba sila?", "Ano ang contact number ng …?" | `findBusinesses` | Whether each is open now (from its hours, in Philippine time), and its contact number and address |

Each business named in the reply gets a link that opens its details on the Community Hub, up to 3.

### News and announcements

| Prompt | Answered from | Reply |
|---|---|---|
| "May brownout o water interruption ba ngayong linggo?" | `findNews` | The matching posts, with the dates and areas their content gives |
| "Kailan ang susunod na event?", "Any emergency announcements?" | `findNews` | The posts in that category |

It reads the 20 latest posts, pinned first. A post's date is when it was posted. The date of the event or interruption comes from its text.

### Transparency projects

| Prompt | Answered from | Reply |
|---|---|---|
| "Ano ang mga project ng barangay?" | `findTransparencyProjects` | The projects, newest first |
| "Magkano ang budget ng road project?" | `findTransparencyProjects` | That project's budget |
| "Magkano lahat ng budget sa infrastructure?" | `findTransparencyProjects` | The category's total, added up in code |

Amounts are called budgets, even when the user asks "magkano ang ginastos", because the portal doesn't record actual spending. A project isn't called ongoing or finished unless its description says so.

### Barangay concerns and general questions

| Prompt | Reply |
|---|---|
| "Para saan ang barangay clearance?", "Paano inaayos ang away sa barangay?" | General knowledge of how barangays in the Philippines work |
| "May sirang streetlight sa amin", "May asong gala sa kalye namin" | What the barangay can do about it. For residents, it can link the complaint form |

### Going to a page

"Go to the news page", "Open About Us", "Saan ko makikita ang notifications ko?" and the like get a link to the page. Each role can be linked to the pages it can open (`PORTAL_NAVIGATION_TARGETS` in `src/lib/ai-assistant/portal-navigation.ts`):

| Page | Resident | Admin | Super admin |
|---|---|---|---|
| Document Request, Complaint, Court Reservation, Community Hub, News & Announcements, Transparency, About Us | Yes | Yes | Yes |
| Notifications | Yes | No | No |
| Analytics, User Management, Barangay Settings | No | Yes | Yes |
| Audit Logs | No | No | Yes |

A user who asks for a page they can't open is told who can open it.

## Residents

### Opening a form

`getFormLink` links any of these forms, filling in what the user already said. It never asks for a form's details in the chat. Uploads, map locations and most dates are filled in on the form.

| Form | Example prompt | Fields it can fill in |
|---|---|---|
| File a Complaint | "Gusto kong mag-file ng complaint tungkol sa sirang streetlight." | Subject, description |
| Reserve the Court | "Pa-reserve ako bukas 3 to 5 PM." | Date, purpose, start time, hours |
| Request Barangay Clearance | "I need a clearance for my new job." (purpose: Clearance for Local Employment) | Purpose, how to receive it |
| Request Certificate of Residency | "Kailangan ko ng residency certificate." | Purpose, how to receive it |
| Request Certificate of No Objection | "Pa-request ng certificate of no objection." | Purpose, how to receive it |
| Request Certificate of Indigency | "Kailangan ko ng indigency para sa scholarship." | Purpose, the user's situation, how to receive it |
| Request Solo Parent Certification | "Pa-request ng solo parent certificate." | Purpose, the user's situation, how to receive it |
| Request Medical / Lab Assistance | "Kailangan ko ng tulong sa gastos sa laboratory." | Purpose, the user's situation, how to receive it |
| Submit a Business | "Gusto kong i-submit ang sari-sari store ko." | Name, description, category, contact number, social media link |

A resident without Resident Credentials still gets the link, but the Document Request, Complaint and Court Reservation pages show the "Complete your Resident Credentials" banner instead of the form.

### Their own submissions

| Prompt | Reply |
|---|---|
| "Ano na ang status ng mga document request ko?", "Is my document ready?" | Each request's status and reference number, such as `DR-12` |
| "Bakit na-reject yung reservation ko?" | The barangay's reason |
| "Na-verify na ba yung business ko?" | The business's status |
| "May update na ba sa complaint ko?" | Their complaints, with complaints they follow listed separately |
| "Ilan lahat ng complaints ko?" | How many they have in all |

`getMySubmissions` reads the 10 most recent of each kind: document requests, complaints, court reservations and businesses. Each named submission gets a link that opens its Submission Info, with the barangay's reply, attachments and any ready soft copy. When a user has more than 10 of a kind, the reply says how many they have and which page lists them all.

## Admins and super admins

Super admins get everything here. The only difference is the audit logs.

### Opening a form

| Form | Example prompt | Fields it can fill in |
|---|---|---|
| Create a News Post | "Gusto kong mag-post ng announcement tungkol sa brownout bukas." | Title, category, content |
| Add a Transparency Project | "Magdagdag ng project: concreting ng Purok 3, 500,000 ang budget." | Title, category, description, budget |
| Add a Barangay Official | "Add Juan dela Cruz as a kagawad." | Name, position |
| Add an SK Official | "Idagdag si Ana Reyes bilang SK kagawad." | Name, position |
| Reserve the Court | "Pa-reserve ng court sa Linggo, 8 to 10 AM." | Date, purpose, start time, hours. Approved automatically |
| Submit a Business | "I-add ang bagong bakery sa Community Hub." | Name, description, category, contact number, social media link. Verified automatically |

### The barangay's workload

| Prompt | Answered from | Reply |
|---|---|---|
| "Ano ang kailangan kong asikasuhin ngayon?" | `getSubmissionOverview` | The home page's Needs Attention list in order (urgent complaints first, then the ones waiting longest), with links |
| "Ilan ang pending na document requests?" | `getSubmissionOverview` | The count, and a link to the page |
| "Ilang high-priority complaints ang open?", "Ilan ang open na complaints?" | `getSubmissionOverview` | The open (Pending or In Progress) complaints, with High and Urgent counted together and given separately too |

### Submissions they're handling

| Prompt | Answered from | Reply |
|---|---|---|
| "Which requests am I handling?", "What's the status of my complaints?" | `getHandledSubmissions` | The residents' requests and complaints whose status the admin last changed |
| "I wanna see the document requests I'm handling." | `getHandledSubmissions` | The list in the chat |
| "Na-verify na ba yung business ko?" | `getHandledSubmissions` | The admin's own court reservations and businesses |
| "Pakita yung DR-12", "Open CP-3" | The reference number (no tool) | A link that opens that submission. `DR-` is a document request, `CP-` a complaint, `CR-` a court reservation and `CH-` a business |

Since admins don't file complaints or request documents, "my complaints" means the ones they're handling. Pending submissions no admin has acted on yet are in the workload counts, not here.

### Analytics

| Prompt | Answered from | Reply |
|---|---|---|
| "Ilang document requests ngayong buwan?" | `getAnalytics` | The month's count. The current month is labeled "so far" |
| "Dumami ba ang complaints kumpara noong nakaraang buwan?" | `getAnalytics` | The change from the month before, worked out in code |
| "Anong klase ng complaint ang pinakamarami noong October?" | `getAnalytics` | The month's breakdown by category |
| "Magkano ang kinita ng court noong September?" | `getAnalytics` | The approved reservations' hours and fees |
| "Ilan ang bagong users ngayong taon?", "Anong buwan ang may pinakamaraming request?" | `getAnalytics` | Totals over a span of up to 12 months, and each kind's busiest month |
| "Patingin ng analytics" | The pages list | A link to the Analytics page |

A record counts toward the month it was submitted in, and its status is its current one. So "ilang businesses ang na-verify noong October?" is answered as how many of October's submissions are Verified now. When something was reviewed comes from the audit logs.

### Audit logs

| Prompt | Admin | Super admin |
|---|---|---|
| "Ano ang mga binago ko kahapon?" | Their own changes | Their own changes |
| "Sino ang nag-reject ng DR-12?", "Who changed the clearance fees?" | Answered only if it was them | Any admin's changes |
| "Ano ang ginawa ni Maria?", "Ilang changes ang ginawa ni Juan?" | Told only super admins can see other admins' changes | That admin's changes |
| "Sino ang nag-post ng announcement tungkol sa brownout?" | Answered only if it was them | Any admin |
| "Ilang complaint ang na-resolve ngayong linggo?" | Counted from their own changes | Counted from every admin's changes |

`findAuditLogs` returns the 30 most recent matching entries, with how many match in all, counted in code. "Kahapon", "noong Lunes" and "ngayong linggo" are looked up in the past week's calendar that its description lists. When more entries match than it shows, the reply points to the Audit Logs page (or, for an admin, the Audit Logs tab on their profile).

## What it turns down

| Prompt | Reply |
|---|---|
| Anything outside the barangay and the portal: code, homework, math, essays, stories, recipes, trivia, news from elsewhere | In a sentence or two, that it can only help with Barangay Maduya concerns, and something it can help with. In a mixed message, it answers only the barangay part. It keeps to this when asked to ignore its instructions or play a character |
| "I-submit mo na yung request ko", "Approve CR-7" | It can't act in the portal. It links the form or the record |
| A resident asking about other residents' submissions | It has only the user's own submissions |
| A resident asking to post news, add a project or official, or open an admin page | Only barangay admins can do that |
| An admin asking to request a document or file a complaint | Residents submit those from their own accounts, with a link to the page where admins review them |
| An admin asking for Notifications | Only residents have Notifications |
| An admin (not a super admin) asking for the Audit Logs page or another admin's changes | Only super admins can see them. Their own changes are on their profile's Audit Logs tab |
| A barangay fact that isn't in the settings, the officials lists, the knowledge base or a tool's result | It says it doesn't have that information, and links the relevant page (residents also get the hotlines) |

## Known weak spots

Things to watch for when testing. Each one is explained in [AI assistant](ai-assistant.md).

- **Dates in a post's text.** Code can't check them, so the reply sometimes includes an event or interruption whose date has already passed.
- **Current statuses in Analytics.** "Ilang court reservations ang na-approve last month?" is sometimes answered as approved during that month, though the report only knows that last month's submissions are Approved now.
- **Percentages and averages.** Totals, differences and budget sums come from code, but the model works out percentages and averages itself.
- **List limits.** The tools read at most 10 submissions of each kind, 20 news posts, 50 businesses, 50 transparency projects (budget totals still cover all of them), 30 audit log entries and 7 dates of court availability.
- **Retrieval.** Knowledge base excerpts come from a similarity search with a low cutoff. A how-to answer is only as complete as the uploaded PDF.

The model runs at a low temperature, so a bad habit tends to show up nearly every time. Check a change by running the same prompt several times and making sure every link in the reply opens what it says.
