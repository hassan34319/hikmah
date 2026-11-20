import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Hikmah Institute <no-reply@mail.hikmahinstitute.org.pk>";
export const emailLogoUrl = process.env.EMAIL_LOGO_URL || undefined;

/** Sends through Resend. Never throws: a failed email must not undo a registration. */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }) {
  if (!apiKey) {
    console.info(`[email skipped: RESEND_API_KEY not set] to=${msg.to} subject="${msg.subject}"`);
    return { ok: false as const, skipped: true };
  }
  try {
    const { error } = await new Resend(apiKey).emails.send({ from, ...msg });
    if (error) {
      console.error("[email failed]", error.message);
      return { ok: false as const };
    }
    return { ok: true as const };
  } catch (e) {
    console.error("[email failed]", e);
    return { ok: false as const };
  }
}
