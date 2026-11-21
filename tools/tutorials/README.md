# Tutorial recorder

Records tutorials as 1920x1080 videos with a smooth visible cursor, plus a marks file
(chapters, step captions, zoom points) used to edit the final video.

## Before recording (once)
1. Open `supabase/demo/demo-seed.sql` and change the two placeholders at the top:
   - `admin_email`: the email you sign in to the website with (becomes super admin)
   - `inbox`: a Gmail you can check. Every demo person gets a plus-address of it,
     so every email the recordings send really arrives there.
2. Paste the whole file into the Supabase SQL editor and run it.
3. `cd tools/tutorials && npm install`

## Record
```
BASE_URL=https://your-site DEMO_INBOX=you@gmail.com node record.mjs admin
BASE_URL=https://your-site DEMO_INBOX=you@gmail.com node record.mjs student
```
- `admin` (about 10 min): dashboard, create event, registration form, create course, question library,
  applications, door check-in, feedback, requests, homepage, people and invites, admins.
  The first run opens Chrome so you can sign in; after that it records on its own.
- `student` (about 4 min): browse, sign up, profile, register, QR ticket, then a parent's Hifz form.
  It pauses once and asks you in the terminal for the sign-in code from your inbox.

If a chapter fails, the rest still record. Re-record only those chapters with `CHAPTERS=3,7`.
Send `out/<name>.webm` and `out/<name>.marks.json` (and any `-error.png`) for editing.

## Afterwards
Run `supabase/demo/demo-cleanup.sql` in the SQL editor to remove all demo data, the student
and parent accounts, and anything the recordings created.

## Edit
```
python3 edit.py out/admin.webm --title "Hikmah Admin Guide" --sub "Everything you can do in the dashboard"
```
Writes out/final/admin.mp4 plus one short clip per chapter.
