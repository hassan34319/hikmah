import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getMyRegistration(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("registrations")
    .select("id, status, ticket_code, submitted_at, offerings(slug, title, subtitle, speaker, starts_at, ends_at, is_online, location_text, qr_tickets_enabled, offering_types(kind, name), venues(name, address, map_url))")
    .eq("id", id).maybeSingle();
  if (!data) return null;
  return data as unknown as {
    id: string; status: string; ticket_code: string | null; submitted_at: string;
    offerings: {
      slug: string; title: string; subtitle: string | null; speaker: string | null; starts_at: string | null; ends_at: string | null;
      is_online: boolean; location_text: string | null; qr_tickets_enabled: boolean;
      offering_types: { kind: "course" | "event"; name: string } | null;
      venues: { name: string; address: string | null; map_url: string | null } | null;
    };
  };
}
