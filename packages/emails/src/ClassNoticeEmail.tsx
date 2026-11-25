import { Button, Section, Text } from "@react-email/components";
import { Layout, brand, button, h1, p, small } from "./Layout";

export type ClassNoticeKind = "material" | "announcement" | "assignment" | "quiz" | "marked";

export interface ClassNoticeEmailProps {
  kind: ClassNoticeKind;
  firstName: string;
  course: string;
  subject?: string | null;
  title: string;
  /** First part of the message or instructions. */
  body?: string | null;
  /** Assignment due date or quiz closing time, already formatted. */
  when?: string | null;
  teacher?: string | null;
  url: string;
  logoUrl?: string;
}

const EYEBROW: Record<ClassNoticeKind, string> = {
  material: "New class material", announcement: "Announcement", assignment: "New assignment", quiz: "New quiz", marked: "Your work was marked",
};
const ACTION: Record<ClassNoticeKind, string> = {
  material: "Open the material", announcement: "Open My classes", assignment: "Open the assignment", quiz: "Open the quiz", marked: "See your marks",
};

export function classNoticeSubject(kind: ClassNoticeKind, title: string, subject?: string | null) {
  const where = subject ? `${subject}: ` : "";
  return {
    material: `New material: ${where}${title}`,
    announcement: `${where}${title}`,
    assignment: `New assignment: ${where}${title}`,
    quiz: `New quiz: ${where}${title}`,
    marked: `Marked: ${title}`,
  }[kind];
}

export function ClassNoticeEmail(props: ClassNoticeEmailProps) {
  const { kind, firstName, course, subject, title } = props;
  const body = props.body ? (props.body.length > 600 ? `${props.body.slice(0, 600).trimEnd()}…` : props.body) : null;
  return (
    <Layout preview={classNoticeSubject(kind, title, subject)} logoUrl={props.logoUrl}>
      <Text style={{ ...small, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: brand.accent }}>{EYEBROW[kind]} · {[course, subject].filter(Boolean).join(" · ")}</Text>
      <Text style={h1}>{title}</Text>
      <Text style={p}>Assalamu alaikum {firstName},</Text>
      {body && <Section style={{ background: brand.card, borderRadius: 14, padding: "14px 18px", margin: "4px 0 16px" }}>
        {body.split(/\n+/).map((line, i) => <Text key={i} style={{ ...p, margin: i ? "8px 0 0" : 0 }}>{line}</Text>)}
      </Section>}
      {props.when && <Text style={{ ...p, fontWeight: 700 }}>{kind === "quiz" ? "Closes" : "Due"}: {props.when}</Text>}
      {props.teacher && <Text style={small}>From {props.teacher}</Text>}
      <Section style={{ margin: "10px 0 18px" }}><Button href={props.url} style={button}>{ACTION[kind]}</Button></Section>
    </Layout>
  );
}
