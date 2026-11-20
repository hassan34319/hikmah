import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@hikmah/ui/styles.css";

export const metadata: Metadata = { title: "Hikmah LMS", icons: { icon: "/logo.png" } };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
