import "server-only";
import { Resend } from "resend";
import { SITE_URL } from "./env";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Hikmah Institute <no-reply@hikmahinstitute.org.pk>";
/** The site's own logo once deployed. On localhost, emails fall back to a hosted logo (email apps cannot load localhost). */
export const emailLogoUrl = process.env.EMAIL_LOGO_URL || (/localhost|127\.0\.0\.1/.test(SITE_URL) ? undefined : `${SITE_URL}/logo.png`);

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

/** Sends many emails through Resend's batch API (100 per call). Returns how many were accepted. */
export async function sendEmailBatch(msgs: { to: string; subject: string; html: string; text: string }[]) {
  if (!apiKey) {
    console.info(`[email batch skipped: RESEND_API_KEY not set] ${msgs.length} emails`);
    return 0;
  }
  const resend = new Resend(apiKey);
  let sent = 0;
  for (let i = 0; i < msgs.length; i += 100) {
    const chunk = msgs.slice(i, i + 100).map((m) => ({ from, ...m }));
    try {
      const { error } = await resend.batch.send(chunk);
      if (error) console.error("[email batch failed]", error.message);
      else sent += chunk.length;
    } catch (e) {
      console.error("[email batch failed]", e);
    }
  }
  return sent;
}
