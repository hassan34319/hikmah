import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { OfferingEditor } from "../OfferingEditor";
import { editorOptions, loadEditor } from "../data";
import { OfferingTabs } from "./tabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit" };

export default async function EditOffering({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { supabase } = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const data = await loadEditor(supabase, id);
  if (!data) notFound();
  const { types, venues } = await editorOptions(supabase, data.kind);
  return (
    <AdminShell isAdmin current="/admin/offerings">
      <AdminHeader title={data.title} crumb={<><Link href="/admin/offerings">Courses and events</Link> / Edit</>} />
      <OfferingTabs id={id} current="details" kind={data.kind} />
      <OfferingEditor key={id} data={data} types={types} venues={venues} saved={sp.saved === "new"} />
    </AdminShell>
  );
}
