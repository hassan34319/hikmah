# Hikmah platform

Public website, admin dashboard and (later) LMS for Hikmah Institute, Karachi.

| Folder | What it is |
| --- | --- |
| `apps/web` | Public website + admin (Next.js, port 3000) |
| `apps/lms` | LMS shell for accepted students (Next.js, port 3001) |
| `packages/ui` | Shared theme (hybrid navy + white) and components |
| `packages/db` | Database TypeScript types and shared constants |
| `supabase/migrations` | Database schema and security rules (SQL) |
| `supabase/seed.sql` | Starter data: 4 courses, event types, field library, 2 sample events |

## First time setup

1. Install: `pnpm install` (Node 20+, pnpm 10).
2. Create a Supabase project at supabase.com (free plan is fine).
3. Apply the database with the Supabase CLI:
   ```bash
   supabase login
   supabase init            # once; answer N to editor questions
   supabase link --project-ref <project-id>
   supabase db push --include-seed
   ```
   `seed.sql` is safe to run again: it updates the courses, events and posters instead of failing.
   To re-run only the seed, paste `supabase/seed.sql` into the dashboard SQL editor.
4. Auth settings in the Supabase dashboard:
   - Authentication > Providers > Email: enabled. "Confirm email" can stay on.
   - Authentication > Email Templates > **Magic Link**: replace the body so it sends the code, for example:
     `<h2>Your Hikmah sign in code</h2><p>Enter this code: <strong>{{ .Token }}</strong></p>`
     Without `{{ .Token }}` users get a link instead of a 6 digit code.
   - Authentication > URL Configuration: site URL `http://localhost:3000`, and add `http://localhost:3000/**`
     under Redirect URLs (needed for the sign in link). Use the live domain later.
   - Until custom SMTP is connected, Supabase only sends to members of your Supabase organization and does not
     let you edit templates. The site accepts the default sign in link as well as the 6 digit code.
   - For real launches set up custom SMTP (Resend) under Authentication > SMTP. The built in sender is rate limited.
5. `cp apps/web/.env.example apps/web/.env.local` and fill in the project URL and publishable key (Project settings > API Keys).
6. `pnpm dev:web` and open http://localhost:3000.

## Emails

- **Sign-in emails** are sent by Supabase. Once custom SMTP (Resend) is connected, paste
  `supabase/templates/confirm-signup.html` into the "Confirm signup" template and
  `supabase/templates/magic-link.html` into "Magic Link" (Authentication > Emails > Templates).
  They show the 6 digit code and a one-click link. Regenerate them with `pnpm --filter @hikmah/emails export:auth`.
- **Registration emails** (confirmed, waitlisted, application received) are sent by the website through Resend.
  Set `RESEND_API_KEY` and `EMAIL_FROM` in `apps/web/.env.local`. Without a key, emails are skipped and logged.
- Templates live in `packages/emails` (React Email), so every email shares the same design.

## Registering

`/register/<slug>` shows the person's saved details plus the offering's own questions. Submitting calls the
`register_for_offering` database function, which decides the status (courses: submitted; events: confirmed
until seats run out, then waitlisted), creates a QR ticket code when the event has QR tickets on, and blocks
double registration. Cancelling (`cancel_registration`) frees the seat and moves the first waitlisted person up.
The confirmation page `/account/registrations/<id>` doubles as the QR ticket.

## Admin dashboard (`/admin`)

- **Overview**: open registrations with seats filled, new this week, things that need attention.
- **Courses and events**: create, edit, publish or unpublish; poster upload; course fee, batches, outline.
- **Registration form** per course or event: pick questions from the library, reorder, required or optional,
  or write a new question. Questions marked "From profile" fill in automatically.
- **Responses**: everyone who registered with full details and answers, bulk status changes (attended,
  confirmed, waitlist, cancel), admin notes, and Export to Excel (CSV).
- **Requests**: Hifz registrations (one parent, several children), Mentorship Circle applications and
  Hikmah at Work invitations. These public forms need no account. Each submission emails
  `REQUESTS_NOTIFY_EMAIL` (default info@hikmahinstitute.org.pk), sends the person a receipt, and shows here
  with status (new, in progress, done), notes and CSV export.
- **Feedback** (tab on each event): edit the questions (default: ratings, next topics, comments, come again),
  then **Send** to everyone who registered or only to those who haven't answered. People answer from a
  personal email link without signing in, optionally anonymously. Results show averages, bar charts and
  comments; export to CSV. Sending is manual, for the events you choose.
- **Homepage**: hero text and photo, stats, ribbon, partners, testimonials, YouTube talks, footer contact
  and social links, and switches to show or hide each homepage section. Saved in `site_settings`.
- **Door check-in** (`/admin/check-in`, phone friendly): scan QR tickets (Android Chrome) or search by
  ticket code, name or phone. Volunteers can use it without seeing anything else.
- **People** (`/admin/people`): everyone with a completed profile. Filter by:
  - what they attended: registered for, checked in at (QR events only) or gave feedback on, specific events,
    event types, a series name ("Feel Good Fridays"), a date range, and "at least N times";
  - leave out: people already registered for an event, and applied for a course yes or no;
  - who they are: search, area (partial names, comma separated), occupation, gender, age range, interests,
    email and WhatsApp opt-ins.
  Filters live in the URL. **Save as a group** stores the filters (not a fixed list), so new people who match
  join automatically. **Invite this group** emails an event or course card with a Register button to everyone
  in the group who opted in to emails, skipping anyone already registered; every invite is logged.
  **Export** downloads the group as CSV. Click a name for their full history (registrations, check-ins,
  feedback, invites received).
- **Admins** (`/admin/admins`): see who has access. Super admins give or remove access by email
  (volunteer, admin, super admin). The person must have signed up on the website first.

## Make yourself super admin

After signing in once, run in the SQL editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'you@example.com';
```

## Scripts

- `pnpm dev` all apps, `pnpm dev:web` website only
- `pnpm typecheck`, `pnpm lint`, `pnpm build`
- `pnpm db:types` regenerates `packages/db/src/database.types.ts` from a local Supabase (needs the Supabase CLI)

## Security model

Every table has row level security. Visitors can read published courses and events only. A signed in user can
read and edit their own profile, register themselves while registration is open, and cancel their own
registration. Only admins change statuses, see other people, or manage content. Only super admins grant roles.
Database triggers stop users from changing protected columns (email, status, check-in data) even through the API.

## Placeholders still to fill

Course details, schedules, outlines and campuses come from hikmahinstitute.org.pk. Still in [brackets] in
`supabase/seed.sql`: course codes, fees and next intake dates. Event dates, seat limits and event summaries are
sample data. Posters are photos from Hikmah's site, bundled in `apps/web/public/seed`.
