import { Button, Section, Text } from "@react-email/components";
import { Layout, brand, button, h1, p, small } from "./Layout";

export type RequestEmailProps = {
  kindLabel: string;
  name: string;
  /** Label/value pairs, in the order they were asked. Groups (like each child) come as their own sections. */
  sections: { title?: string; rows: [string, string][] }[];
  adminUrl?: string;
  logoUrl?: string;
};

/** Sent to Hikmah when someone submits a public form. */
export function RequestNotificationEmail({ kindLabel, name, sections, adminUrl, logoUrl }: RequestEmailProps) {
  return (
    <Layout preview={`New ${kindLabel.toLowerCase()} request from ${name}`} logoUrl={logoUrl}>
      <Text style={{ ...small, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: brand.accent }}>New request</Text>
      <Text style={h1}>{kindLabel}: {name}</Text>
      {sections.map((s, i) => (
        <Section key={i} style={{ border: `1px solid ${brand.border}`, borderRadius: 14, padding: "14px 18px", margin: "0 0 14px" }}>
          {s.title && <Text style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: brand.ink }}>{s.title}</Text>}
          {s.rows.map(([label, value]) => (
            <Text key={label} style={{ margin: "6px 0 0", fontSize: 14, lineHeight: "20px", color: brand.ink }}>
              <span style={{ color: brand.muted, fontSize: 12 }}>{label}</span><br />{value || "-"}
            </Text>
          ))}
        </Section>
      ))}
      {adminUrl && <Section style={{ margin: "6px 0 16px" }}><Button href={adminUrl} style={button}>Open in admin dashboard</Button></Section>}
    </Layout>
  );
}

/** Sent to the person who submitted, so they know it arrived. */
export function RequestReceivedEmail({ kindLabel, name, logoUrl, next }: { kindLabel: string; name: string; logoUrl?: string; next: string }) {
  return (
    <Layout preview={`We received your ${kindLabel.toLowerCase()} request`} logoUrl={logoUrl}>
      <Text style={h1}>JazakAllah khair, {name.split(" ")[0]}</Text>
      <Text style={p}>We have received your {kindLabel.toLowerCase()} request. {next}</Text>
      <Text style={small}>If you need anything in the meantime, reply to this email or message us on WhatsApp at +92 333 0382121.</Text>
    </Layout>
  );
}
