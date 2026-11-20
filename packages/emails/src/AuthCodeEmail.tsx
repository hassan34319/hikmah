import { Link, Section, Text } from "@react-email/components";
import { Layout, brand, h1, p, small } from "./Layout";

/**
 * Sign-in email for Supabase. `{{ .Token }}` and `{{ .ConfirmationURL }}` are Supabase template
 * placeholders, filled in by Supabase when it sends. Export with `pnpm --filter @hikmah/emails export:auth`.
 */
export function AuthCodeEmail({ firstTime, logoUrl }: { firstTime: boolean; logoUrl?: string }) {
  return (
    <Layout preview="Your Hikmah sign in code" logoUrl={logoUrl}>
      <Text style={h1}>{firstTime ? "Welcome to Hikmah Institute" : "Your sign in code"}</Text>
      <Text style={p}>
        {firstTime
          ? "Assalamu alaikum! Enter this code to finish creating your account."
          : "Assalamu alaikum! Enter this code to sign in."}
      </Text>
      <Section style={{ backgroundColor: brand.card, borderRadius: 14, padding: "22px 16px", textAlign: "center", margin: "4px 0 20px" }}>
        <Text style={{ margin: 0, fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace", fontSize: 34, letterSpacing: 10, fontWeight: 700, color: brand.ink }}>
          {"{{ .Token }}"}
        </Text>
      </Section>
      <Text style={p}>
        Or <Link href="{{ .ConfirmationURL }}" style={{ color: brand.accent, fontWeight: 600 }}>sign in with one click</Link> if you are on the same device.
      </Text>
      <Text style={small}>The code expires in 1 hour. If you did not ask for it, you can safely ignore this email.</Text>
    </Layout>
  );
}
