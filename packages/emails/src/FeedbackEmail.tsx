import { Button, Section, Text } from "@react-email/components";
import { Layout, brand, button, h1, p, small } from "./Layout";

export function FeedbackEmail({ firstName, title, when, url, logoUrl }: { firstName: string; title: string; when?: string | null; url: string; logoUrl?: string }) {
  return (
    <Layout preview={`How was ${title}? Tell us in a minute.`} logoUrl={logoUrl}>
      <Text style={{ ...small, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: brand.accent }}>Thank you for coming</Text>
      <Text style={h1}>How was {title}?</Text>
      <Text style={p}>Assalamu alaikum {firstName},</Text>
      <Text style={p}>JazakAllah khair for joining us{when ? ` on ${when}` : ""}. Your feedback helps us plan better sessions. It takes about a minute.</Text>
      <Section style={{ margin: "6px 0 18px" }}><Button href={url} style={button}>Share feedback</Button></Section>
      <Text style={small}>You can submit anonymously if you prefer.</Text>
    </Layout>
  );
}
