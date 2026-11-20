import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Hikmah Admin" }, robots: { index: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
