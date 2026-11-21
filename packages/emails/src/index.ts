import { render } from "@react-email/render";
import { createElement } from "react";
import { RegistrationEmail, type RegistrationEmailProps } from "./RegistrationEmail";
import { FeedbackEmail } from "./FeedbackEmail";
import { RequestNotificationEmail, RequestReceivedEmail, type RequestEmailProps } from "./RequestEmails";

export { AuthCodeEmail } from "./AuthCodeEmail";
export { RegistrationEmail, type RegistrationEmailProps } from "./RegistrationEmail";

export async function renderRegistrationEmail(props: RegistrationEmailProps) {
  const element = createElement(RegistrationEmail, props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  const subject =
    props.status === "submitted" ? `Application received: ${props.title}`
      : props.status === "waitlisted" ? `You're on the waitlist: ${props.title}`
        : `You're registered: ${props.title}`;
  return { subject, html, text };
}

export { type RequestEmailProps } from "./RequestEmails";

export async function renderRequestEmails(props: RequestEmailProps & { next: string }) {
  const admin = createElement(RequestNotificationEmail, props);
  const ack = createElement(RequestReceivedEmail, { kindLabel: props.kindLabel, name: props.name, logoUrl: props.logoUrl, next: props.next });
  const [adminHtml, adminText, ackHtml, ackText] = await Promise.all([
    render(admin), render(admin, { plainText: true }), render(ack), render(ack, { plainText: true }),
  ]);
  return {
    notification: { subject: `New ${props.kindLabel} request: ${props.name}`, html: adminHtml, text: adminText },
    receipt: { subject: `We received your ${props.kindLabel} request`, html: ackHtml, text: ackText },
  };
}

export async function renderFeedbackEmail(props: { firstName: string; title: string; when?: string | null; url: string; logoUrl?: string }) {
  const el = createElement(FeedbackEmail, props);
  const [html, text] = await Promise.all([render(el), render(el, { plainText: true })]);
  return { subject: `How was ${props.title}?`, html, text };
}

export { type InviteEmailProps } from "./InviteEmail";
import { InviteEmail, type InviteEmailProps } from "./InviteEmail";

export async function renderInviteEmail(props: InviteEmailProps & { subject?: string }) {
  const el = createElement(InviteEmail, props);
  const [html, text] = await Promise.all([render(el), render(el, { plainText: true })]);
  return { subject: props.subject?.trim() || `You're invited: ${props.title}`, html, text };
}

export { type AdmissionEmailKind, type AdmissionEmailProps, admissionSubject } from "./AdmissionEmails";
import { AdmissionEmail, admissionSubject as admSubject, type AdmissionEmailProps as AdmProps } from "./AdmissionEmails";

export async function renderAdmissionEmail(props: AdmProps) {
  const el = createElement(AdmissionEmail, props);
  const [html, text] = await Promise.all([render(el), render(el, { plainText: true })]);
  return { subject: admSubject(props.kind, props.course), html, text };
}
