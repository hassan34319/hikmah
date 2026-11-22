// Renders the emails a recording sent, from the same templates and with the same content, for the edit.
// Run from packages/emails:  npx tsx src/render-tutorial-emails.tsx ../../tools/tutorials/out/emails
import { render } from "@react-email/render";
import { createElement as h } from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RegistrationEmail } from "./RegistrationEmail";
import { RequestNotificationEmail, RequestReceivedEmail } from "./RequestEmails";
import { FeedbackEmail } from "./FeedbackEmail";
import { InviteEmail } from "./InviteEmail";
import { AdmissionEmail, admissionSubject } from "./AdmissionEmails";

const SITE = "https://hikmah-navy.vercel.app";
const logoUrl = `${SITE}/logo.png`;
const out = process.argv[2] ?? "out/emails";
mkdirSync(out, { recursive: true });
const MUNEEB = "hassaniqbal19343+hk.muneeb.raza@gmail.com";
const ADM = `${SITE}/admissions/5fa8f2b4-e236-4b19-9d8d-41274f68cff1`;
const D = (v: string) => (v === "-" ? "" : v);
const child = (name: string, r: [string, string][]) => ({ title: `Child: ${name}`, rows: r.map(([k, v]) => [k, D(v)] as [string, string]).filter(([, v]) => v) });

const emails: Record<string, { to: string; subject: string; el: ReturnType<typeof h> }> = {
  "registration": {
    to: "hassaniqbal19343+hk.studentvb20@gmail.com", subject: "You're registered: Enslaved: Youth Conference",
    el: h(RegistrationEmail, { firstName: "Abdullah", kind: "event", status: "confirmed", title: "Enslaved: Youth Conference", subtitle: "Youth Conference 4.0",
      when: "Sun, 20 Dec, 5:00 pm", speaker: "Multiple speakers", where: "[Conference venue]", ticketCode: "HKM-MRSVMX",
      ticketUrl: `${SITE}/account/registrations/8d331f10-27eb-456a-9082-6b0897b9874a`, calendarUrl: "https://calendar.google.com", accountUrl: `${SITE}/account`, logoUrl }),
  },
  "application": {
    to: "hassaniqbal19343+hk.studentvb20@gmail.com", subject: "Application received: Darse Nizami",
    el: h(RegistrationEmail, { firstName: "Abdullah", kind: "course", status: "submitted", title: "Darse Nizami", subtitle: "8 years", accountUrl: `${SITE}/account`, logoUrl }),
  },
  "hifz-team": {
    to: "hassaniqbal19343@gmail.com (the Hikmah team)", subject: "New Hifz Program request: Kamran Khan",
    el: h(RequestNotificationEmail, { kindLabel: "Hifz Program", name: "Kamran Khan", adminUrl: `${SITE}/admin/requests?kind=hifz`, logoUrl, sections: [
      child("Abdul Rahman", [["Track", "Hifz"], ["Age", "8"], ["School", "The City School"], ["Studied Quran before", "Yes"], ["Level completed", "Nazra"]]),
      child("Yusuf", [["Track", "Nazra"], ["Age", "7"], ["School", "The City School"], ["Studied Quran before", "No"]]),
      { title: "Father / guardian", rows: [["Name", "Kamran Khan"], ["Phone", "+923217654321"], ["Email", "hassaniqbal19343+hk.parent@gmail.com"]] },
      { title: "Address", rows: [["Address", "House 12, Block 13-D, Gulshan-e-Iqbal, Karachi"]] },
    ] }),
  },
  "hifz-parent": {
    to: "hassaniqbal19343+hk.parent@gmail.com", subject: "We received your Hifz Program request",
    el: h(RequestReceivedEmail, { kindLabel: "Hifz Program", name: "Kamran Khan", logoUrl, next: "Our team will contact you about the next steps, including an assessment and a campus visit." }),
  },
  "work-receipt": {
    to: "hassaniqbal19343+hk.nida.hussain@gmail.com", subject: "We received your Hikmah at Work request",
    el: h(RequestReceivedEmail, { kindLabel: "Hikmah at Work", name: "Nida Hussain", logoUrl, next: "Our team will contact you to understand your audience and agree on a topic, format and date." }),
  },
  "feedback": {
    to: "hassaniqbal19343+hk.ayesha.noor@gmail.com", subject: "How was Our Parents in Old Age?",
    el: h(FeedbackEmail, { firstName: "Ayesha", title: "Our Parents in Old Age", url: `${SITE}/feedback/x`, logoUrl }),
  },
  "invite": {
    to: "hassaniqbal19343+hk.hamza.qureshi@gmail.com", subject: "You're invited: The Economics of Time",
    el: h(InviteEmail, { firstName: "Hamza", title: "The Economics of Time", subtitle: "Feel Good Fridays", speaker: "Maulana Dr. Muhammad Areeb Nafey",
      when: "Friday, 27 November, 7:30 pm", where: "Main Campus", posterUrl: `${SITE}/seed/event-economics-of-time.jpg`,
      message: "We saved you a seat for this one. See you there, in sha Allah!", url: `${SITE}/events/the-economics-of-time`, kind: "event", logoUrl }),
  },
  "adm-test": {
    to: MUNEEB, subject: admissionSubject("test", "Darse Nizami"),
    el: h(AdmissionEmail, { kind: "test", firstName: "Muneeb", course: "Darse Nizami", url: ADM, logoUrl }),
  },
  "adm-interview": {
    to: MUNEEB, subject: admissionSubject("interview", "Darse Nizami"),
    el: h(AdmissionEmail, { kind: "interview", firstName: "Muneeb", course: "Darse Nizami", url: ADM, logoUrl }),
  },
  "adm-booked": {
    to: MUNEEB, subject: admissionSubject("booked", "Darse Nizami"),
    el: h(AdmissionEmail, { kind: "booked", firstName: "Muneeb", course: "Darse Nizami", url: ADM, when: "Saturday, 28 November at 10:20 am", where: "Main Campus", logoUrl }),
  },
  "adm-selected": {
    to: MUNEEB, subject: admissionSubject("selected", "Darse Nizami"),
    el: h(AdmissionEmail, { kind: "selected", firstName: "Muneeb", course: "Darse Nizami", url: ADM, studentId: "HKM-27-DN-0003", batch: "Weekend morning", campus: "Main Campus", logoUrl }),
  },
};
const meta: Record<string, { to: string; subject: string }> = {};
for (const [k, e] of Object.entries(emails)) {
  writeFileSync(join(out, `${k}.html`), await render(e.el));
  meta[k] = { to: e.to, subject: e.subject };
}
writeFileSync(join(out, "meta.json"), JSON.stringify(meta, null, 2));
console.log("rendered", Object.keys(emails).length, "emails to", out);
