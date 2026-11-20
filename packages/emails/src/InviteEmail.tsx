import { Button, Img, Section, Text } from "@react-email/components";
import { Layout, brand, button, h1, p, small } from "./Layout";

export interface InviteEmailProps {
  firstName: string;
  title: string;
  subtitle?: string | null;
  when?: string | null;
  where?: string | null;
  speaker?: string | null;
  posterUrl?: string | null;
  message?: string | null;
  url: string;
  logoUrl?: string;
  kind: "course" | "event";
}

export function InviteEmail(props: InviteEmailProps) {
  const rows: [string, string | null | undefined][] = [["When", props.when], ["Speaker", props.speaker], ["Where", props.where]];
  const paragraphs = (props.message ?? "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return (
    <Layout preview={`You're invited: ${props.title}`} logoUrl={props.logoUrl}>
      <Text style={{ ...small, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: brand.accent }}>
        {props.kind === "course" ? "Admissions are open" : "You're invited"}
      </Text>
      <Text style={h1}>{props.title}</Text>
      <Text style={p}>Assalamu alaikum {props.firstName},</Text>
      {paragraphs.length ? paragraphs.map((t, i) => <Text key={i} style={{ ...p, whiteSpace: "pre-line" }}>{t}</Text>) : (
        <Text style={p}>We thought you would enjoy this one. Seats are limited, so register early if you can make it.</Text>
      )}
      <Section style={{ border: `1px solid ${brand.border}`, borderRadius: 14, overflow: "hidden", margin: "4px 0 22px" }}>
        {props.posterUrl && <Img src={props.posterUrl} alt="" width="100%" style={{ display: "block", width: "100%", maxHeight: 300, objectFit: "cover" }} />}
        <Section style={{ padding: "16px 20px" }}>
          <Text style={{ margin: "0 0 2px", fontFamily: brand.head, fontWeight: 800, fontSize: 18, color: brand.ink }}>{props.title}</Text>
          {props.subtitle && <Text style={{ ...small, margin: "0 0 6px" }}>{props.subtitle}</Text>}
          {rows.filter(([, v]) => v).map(([label, value]) => (
            <Text key={label} style={{ margin: "8px 0 0", fontSize: 14, lineHeight: "21px", color: brand.ink }}>
              <span style={{ color: brand.muted, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span><br />{value}
            </Text>
          ))}
        </Section>
      </Section>
      <Section style={{ margin: "0 0 18px" }}><Button href={props.url} style={button}>{props.kind === "course" ? "See the course and apply" : "Register now"}</Button></Section>
      <Text style={small}>You are receiving this because you chose to get emails from Hikmah Institute. You can turn this off any time by editing your profile on the website.</Text>
    </Layout>
  );
}
