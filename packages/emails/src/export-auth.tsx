// Writes the sign-in email HTML for Supabase to supabase/templates/. Paste each file into
// Supabase > Authentication > Emails > Templates ("Confirm signup" and "Magic Link").
import { render } from "@react-email/render";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AuthCodeEmail } from "./AuthCodeEmail";

const out = join(dirname(fileURLToPath(import.meta.url)), "../../../supabase/templates");
mkdirSync(out, { recursive: true });
const files = { "confirm-signup.html": true, "magic-link.html": false } as const;
for (const [name, firstTime] of Object.entries(files)) {
  const html = await render(<AuthCodeEmail firstTime={firstTime} logoUrl={process.env.EMAIL_LOGO_URL ?? "https://hikmah-navy.vercel.app/logo.png"} />, { pretty: true });
  writeFileSync(join(out, name), html);
  console.log("wrote", join("supabase/templates", name));
}
