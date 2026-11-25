import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: { default: "Teaching", template: "%s · Hikmah" }, robots: { index: false } };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
