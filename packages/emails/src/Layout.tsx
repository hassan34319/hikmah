import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

export const brand = {
  navy: "#0A1628",
  ink: "#14213D",
  muted: "#5A6478",
  accent: "#2E6BB0",
  accentDark: "#6CB8F5",
  card: "#F4F6FA",
  border: "#E3E8EF",
  font: "'Inter', 'Segoe UI', Helvetica, Arial, sans-serif",
  head: "'Plus Jakarta Sans', 'Segoe UI', Helvetica, Arial, sans-serif",
};

/** Public logo URL. Email clients cannot load images from localhost. */
export const DEFAULT_LOGO =
  "https://hikmahinstitute.org.pk/wp-content/uploads/2026/06/cropped-Hikmah-Institue-Logo-01-270x270.png";

export function Layout({ preview, children, logoUrl = DEFAULT_LOGO, siteUrl = "https://hikmahinstitute.org.pk" }: {
  preview: string; children: ReactNode; logoUrl?: string; siteUrl?: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: "24px 0", backgroundColor: "#EEF1F5", fontFamily: brand.font }}>
        <Container style={{ width: "100%", maxWidth: 560, margin: "0 auto", backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" }}>
          <Section style={{ backgroundColor: brand.navy, padding: "22px 32px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle", paddingRight: 12 }}>
                    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 10, padding: 3, lineHeight: 0 }}>
                      <Img src={logoUrl} width="36" height="36" alt="Hikmah Institute" style={{ borderRadius: 8, display: "block" }} />
                    </div>
                  </td>
                  <td style={{ verticalAlign: "middle", color: "#FFFFFF", fontFamily: brand.head, fontWeight: 800, fontSize: 17 }}>
                    Hikmah Institute
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
          <Section style={{ padding: "32px 32px 8px" }}>{children}</Section>
          <Section style={{ padding: "8px 32px 28px" }}>
            <Hr style={{ borderColor: brand.border, margin: "16px 0" }} />
            <Text style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: brand.muted }}>
              Hikmah Institute · Main Campus, 150-A Sindhi Muslim Society, Block A, Karachi
              <br />
              <Link href={siteUrl} style={{ color: brand.muted }}>hikmahinstitute.org.pk</Link> · +92 333 0382121
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const h1: CSSProperties = { margin: "0 0 12px", fontFamily: brand.head, fontSize: 24, lineHeight: "30px", fontWeight: 800, color: brand.ink };
export const p: CSSProperties = { margin: "0 0 16px", fontSize: 15, lineHeight: "24px", color: brand.ink };
export const small: CSSProperties = { margin: "0 0 12px", fontSize: 13, lineHeight: "20px", color: brand.muted };
export const button: CSSProperties = {
  display: "inline-block", backgroundColor: brand.accent, color: "#FFFFFF", fontWeight: 600, fontSize: 15,
  textDecoration: "none", padding: "13px 26px", borderRadius: 999,
};
export const ghostButton: CSSProperties = {
  display: "inline-block", backgroundColor: "#FFFFFF", color: brand.ink, fontWeight: 600, fontSize: 14,
  textDecoration: "none", padding: "10px 18px", borderRadius: 999, border: `1px solid ${brand.border}`,
};
