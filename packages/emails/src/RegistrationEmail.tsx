import { Button, Link, Section, Text } from "@react-email/components";
import { Layout, brand, button, ghostButton, h1, p, small } from "./Layout";

export interface RegistrationEmailProps {
  firstName: string;
  kind: "course" | "event";
  status: "confirmed" | "waitlisted" | "submitted";
  title: string;
  subtitle?: string | null;
  when?: string | null;
  where?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  speaker?: string | null;
  ticketCode?: string | null;
  ticketUrl?: string | null;
  calendarUrl?: string | null;
  accountUrl: string;
  logoUrl?: string;
}

const HEADLINE = {
  confirmed: "You're registered",
  waitlisted: "You're on the waitlist",
  submitted: "Application received",
} as const;

export function RegistrationEmail(props: RegistrationEmailProps) {
  const { firstName, kind, status, title } = props;
  const intro =
    status === "submitted"
      ? `JazakAllah khair for applying to ${title}. Our admissions team will review your application and email you about the next step, in sha Allah.`
      : status === "waitlisted"
        ? `${title} is full right now, so we've added you to the waitlist. If a seat opens up you'll be moved up automatically and we'll let you know.`
        : `Your seat for ${title} is confirmed. We look forward to seeing you, in sha Allah.`;

  const rows: [string, string | null | undefined][] = [
    ["When", props.when],
    ["Speaker", props.speaker],
    ["Where", props.where],
  ];

  return (
    <Layout preview={`${HEADLINE[status]}: ${title}`} logoUrl={props.logoUrl}>
      <Text style={{ ...small, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: brand.accent }}>
        {kind === "course" ? "Course application" : "Event registration"}
      </Text>
      <Text style={h1}>{HEADLINE[status]}</Text>
      <Text style={p}>Assalamu alaikum {firstName},</Text>
      <Text style={p}>{intro}</Text>

      <Section style={{ border: `1px solid ${brand.border}`, borderRadius: 14, padding: "18px 20px", margin: "4px 0 22px" }}>
        <Text style={{ margin: "0 0 2px", fontFamily: brand.head, fontWeight: 800, fontSize: 18, color: brand.ink }}>{title}</Text>
        {props.subtitle && <Text style={{ ...small, margin: "0 0 10px" }}>{props.subtitle}</Text>}
        {rows.filter(([, v]) => v).map(([label, value]) => (
          <Text key={label} style={{ margin: "8px 0 0", fontSize: 14, lineHeight: "21px", color: brand.ink }}>
            <span style={{ color: brand.muted, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
            <br />
            {value}
            {label === "Where" && props.address && <><br /><span style={{ color: brand.muted }}>{props.address}</span></>}
          </Text>
        ))}
        {props.ticketCode && (
          <Text style={{ margin: "14px 0 0", fontSize: 14, color: brand.ink }}>
            <span style={{ color: brand.muted, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Ticket</span>
            <br />
            <strong style={{ fontFamily: "Menlo, Consolas, monospace", fontSize: 16 }}>{props.ticketCode}</strong>
          </Text>
        )}
      </Section>

      {props.ticketUrl && status === "confirmed" && (
        <Section style={{ margin: "0 0 14px" }}>
          <Button href={props.ticketUrl} style={button}>Show my QR ticket</Button>
        </Section>
      )}
      {!props.ticketUrl && (
        <Section style={{ margin: "0 0 14px" }}>
          <Button href={props.accountUrl} style={button}>{kind === "course" ? "View my application" : "View my registration"}</Button>
        </Section>
      )}

      {(props.calendarUrl || props.mapUrl) && status !== "submitted" && (
        <Section style={{ margin: "0 0 18px" }}>
          {props.calendarUrl && <Link href={props.calendarUrl} style={{ ...ghostButton, marginRight: 8 }}>Add to calendar</Link>}
          {props.mapUrl && <Link href={props.mapUrl} style={ghostButton}>Directions</Link>}
        </Section>
      )}

      <Text style={small}>
        {kind === "event"
          ? "Can't make it? Please cancel from your account so someone on the waitlist can take your seat."
          : "You can check the status of your application any time from your account."}
      </Text>
    </Layout>
  );
}
