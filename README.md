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
