import { Button, Section, Text } from "@react-email/components";
import { Layout, brand, button, h1, p, small } from "./Layout";

export type AdmissionEmailKind = "test" | "interview" | "booked" | "selected" | "waitlisted" | "not_selected";

export interface AdmissionEmailProps {
  kind: AdmissionEmailKind;
  firstName: string;
  course: string;
  url?: string;
  /** Interview booked: when and where. */
  when?: string | null;
  where?: string | null;
  /** Selected: student ID, batch and campus. */
  studentId?: string | null;
  batch?: string | null;
  campus?: string | null;
  logoUrl?: string;
}

const EYEBROW: Record<AdmissionEmailKind, string> = {
  test: "Admissions · Step 2", interview: "Admissions · Step 3", booked: "Admissions · Interview booked",
  selected: "Admissions · Decision", waitlisted: "Admissions · Decision", not_selected: "Admissions · Decision",
};

export function admissionSubject(kind: AdmissionEmailKind, course: string) {
  return {
    test: `Your admission test for ${course}`,
    interview: `Book your interview for ${course}`,
    booked: `Interview booked: ${course}`,
    selected: `Welcome to ${course}`,
    waitlisted: `Your application to ${course}: waitlist`,
    not_selected: `Your application to ${course}`,
  }[kind];
}

export function AdmissionEmail(props: AdmissionEmailProps) {
  const { kind, firstName, course } = props;
  return (
    <Layout preview={admissionSubject(kind, course)} logoUrl={props.logoUrl}>
      <Text style={{ ...small, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: brand.accent }}>{EYEBROW[kind]}</Text>
      {kind === "test" && <>
        <Text style={h1}>Your admission test is ready</Text>
        <Text style={p}>Assalamu alaikum {firstName},</Text>
        <Text style={p}>JazakAllah khair for applying to {course}. You have been shortlisted for the next step: a short online admission test.</Text>
        <Section style={{ border: `1px solid ${brand.border}`, borderRadius: 14, padding: "16px 20px", margin: "4px 0 20px" }}>
          <Text style={{ ...p, margin: 0 }}>• About 15 minutes, in one sitting<br />• Quick puzzles: patterns, numbers, memory and logic<br />• A short note on why you want to study at Hikmah<br />• Use a laptop or phone with a steady connection</Text>
        </Section>
        <Text style={p}>Please do it on your own and without AI tools. There are no trick questions, just do your best.</Text>
        {props.url && <Section style={{ margin: "6px 0 18px" }}><Button href={props.url} style={button}>Start the test</Button></Section>}
      </>}
      {kind === "interview" && <>
        <Text style={h1}>You're invited to an interview</Text>
        <Text style={p}>Assalamu alaikum {firstName},</Text>
        <Text style={p}>MashaAllah, you did well in the admission test for {course}. The final step is a short, friendly interview at campus. Please pick a time that suits you.</Text>
        {props.url && <Section style={{ margin: "6px 0 18px" }}><Button href={props.url} style={button}>Choose an interview time</Button></Section>}
        <Text style={small}>Slots are limited, so please book soon.</Text>
      </>}
      {kind === "booked" && <>
        <Text style={h1}>Your interview is booked</Text>
        <Text style={p}>Assalamu alaikum {firstName},</Text>
        <Text style={p}>Your interview for {course} is confirmed:</Text>
        <Section style={{ border: `1px solid ${brand.border}`, borderRadius: 14, padding: "16px 20px", margin: "4px 0 20px" }}>
          <Text style={{ margin: 0, fontSize: 16, fontWeight: 700, color: brand.ink }}>{props.when}</Text>
          {props.where && <Text style={{ ...small, margin: "4px 0 0" }}>{props.where}</Text>}
        </Section>
        <Text style={p}>Please arrive 10 minutes early and bring your CNIC or B-Form. If you need to change the time, use the same link.</Text>
        {props.url && <Section style={{ margin: "6px 0 18px" }}><Button href={props.url} style={button}>View or change</Button></Section>}
      </>}
      {kind === "selected" && <>
        <Text style={h1}>Welcome to Hikmah, {firstName}!</Text>
        <Text style={p}>Assalamu alaikum {firstName},</Text>
        <Text style={p}>Alhamdulillah, we are delighted to offer you a place in {course}. May Allah make it a means of benefit for you and those around you.</Text>
        <Section style={{ background: brand.card, borderRadius: 14, padding: "18px 20px", margin: "4px 0 20px", textAlign: "center" }}>
          <Text style={{ ...small, margin: 0, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Your student ID</Text>
          <Text style={{ margin: "6px 0 0", fontFamily: "Menlo, Consolas, monospace", fontSize: 26, fontWeight: 700, letterSpacing: 2, color: brand.ink }}>{props.studentId}</Text>
          {(props.batch || props.campus) && <Text style={{ ...small, margin: "8px 0 0" }}>{[props.batch, props.campus].filter(Boolean).join(" · ")}</Text>}
        </Section>
        <Text style={p}>We will email your class schedule and access to the learning portal before classes begin, in sha Allah.</Text>
      </>}
      {kind === "waitlisted" && <>
        <Text style={h1}>You're on the waitlist</Text>
        <Text style={p}>Assalamu alaikum {firstName},</Text>
        <Text style={p}>JazakAllah khair for your effort through the admission process for {course}. The batch is currently full, so we have placed you on the waitlist. If a seat opens, we will contact you straight away, in sha Allah.</Text>
      </>}
      {kind === "not_selected" && <>
        <Text style={h1}>About your application</Text>
        <Text style={p}>Assalamu alaikum {firstName},</Text>
        <Text style={p}>JazakAllah khair for applying to {course} and for the time you gave to the test and interview. We had far more applicants than seats, and we are not able to offer you a place in this intake.</Text>
        <Text style={p}>This is not the end of the road. Our events and shorter courses are open to you, and you are very welcome to apply again next intake.</Text>
        {props.url && <Section style={{ margin: "6px 0 18px" }}><Button href={props.url} style={button}>See upcoming events</Button></Section>}
      </>}
    </Layout>
  );
}
