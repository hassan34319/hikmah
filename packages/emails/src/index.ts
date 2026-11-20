import { render } from "@react-email/render";
import { createElement } from "react";
import { RegistrationEmail, type RegistrationEmailProps } from "./RegistrationEmail";

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
