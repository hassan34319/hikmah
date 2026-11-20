import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@hikmah/ui/styles.css";

export const metadata: Metadata = {
  title: { default: "Hikmah Institute", template: "%s · Hikmah Institute" },
  description: "Authentic Islamic knowledge for contemporary challenges. Courses and events in Karachi.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Amiri:wght@400;700&family=Cormorant+Garamond:ital,wght@1,500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
