import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { OfferingEditor } from "../OfferingEditor";
import { blankEditor, editorOptions } from "../data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New" };

export default async function NewOffering({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { supabase } = await requireAdmin();
  const kind = (await searchParams).kind === "course" ? "course" : "event";
  const { types, venues } = await editorOptions(supabase, kind);
  const data = blankEditor(kind, types[0]?.id ?? "", venues[0]?.id ?? "");
  return (
    <AdminShell isAdmin current="/admin/offerings">
      <AdminHeader title={kind === "course" ? "New course" : "New event"} crumb={<><Link href="/admin/offerings">Courses and events</Link> / New</>} />
      <OfferingEditor data={data} types={types} venues={venues} />
    </AdminShell>
  );
}
