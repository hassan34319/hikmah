// Hand-written to match supabase/migrations. Once a Supabase project exists,
// regenerate with `pnpm db:types` and this file will be replaced.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "super_admin" | "admin" | "faculty" | "student" | "interviewer" | "volunteer";
export type OccupationType = "student" | "professional" | "both" | "other";
export type OfferingKind = "course" | "event";
export type OfferingStatus = "draft" | "published" | "closed" | "archived";
export type RegistrationStatus = "submitted" | "confirmed" | "waitlisted" | "cancelled" | "attended" | "no_show";
export type FieldType =
  | "short_text" | "long_text" | "email" | "phone" | "number" | "date"
  | "single_select" | "multi_select" | "checkbox" | "file" | "url";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  date_of_birth: string | null;
  occupation_type: OccupationType | null;
  university: string | null;
  degree: string | null;
  year_of_study: string | null;
  company: string | null;
  job_title: string | null;
  address_line: string | null;
  area: string | null;
  city: string | null;
  country: string | null;
  interests: string[];
  heard_from: string | null;
  email_opt_in: boolean;
  whatsapp_opt_in: boolean;
  profile_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRoleRow = { user_id: string; role: AppRole; granted_by: string | null; created_at: string };

export type VenueRow = {
  id: string; name: string; address: string | null; area: string | null; city: string; map_url: string | null; created_at: string;
};

export type OfferingTypeRow = {
  id: string; slug: string; name: string; kind: OfferingKind; description: string | null; sort_order: number;
};

export type OfferingRow = {
  id: string;
  type_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  description: string | null;
  poster_url: string | null;
  speaker: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue_id: string | null;
  location_text: string | null;
  is_online: boolean;
  capacity: number | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  status: OfferingStatus;
  pinned: boolean;
  sort_order: number;
  qr_tickets_enabled: boolean;
  send_confirmation_email: boolean;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseDetailsRow = {
  offering_id: string; code: string | null; duration_label: string | null; duration_months: number | null;
  level: string | null; schedule_text: string | null; fee_text: string | null; eligibility: string | null;
  intake_label: string | null; outcomes: string[];
};

export type CourseModuleRow = { id: string; offering_id: string; position: number; title: string; description: string | null };

export type FieldRow = {
  id: string; key: string; label: string; type: FieldType; options: Json; help_text: string | null;
  placeholder: string | null; profile_column: string | null; is_system: boolean; created_by: string | null; created_at: string;
};

export type FormFieldRow = {
  id: string; offering_id: string; field_id: string; position: number; required: boolean;
  label_override: string | null; help_override: string | null;
};

export type RegistrationRow = {
  id: string; offering_id: string; user_id: string; status: RegistrationStatus; answers: Json;
  ticket_code: string | null; checked_in_at: string | null; checked_in_by: string | null; admin_notes: string | null;
  submitted_at: string; updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id" | "email">;
      user_roles: Table<UserRoleRow, "user_id" | "role">;
      venues: Table<VenueRow, "name">;
      offering_types: Table<OfferingTypeRow, "slug" | "name" | "kind">;
      offerings: Table<OfferingRow, "type_id" | "slug" | "title">;
      course_details: Table<CourseDetailsRow, "offering_id">;
      course_modules: Table<CourseModuleRow, "offering_id" | "position" | "title">;
      fields: Table<FieldRow, "key" | "label" | "type">;
      form_fields: Table<FormFieldRow, "offering_id" | "field_id" | "position">;
      registrations: Table<RegistrationRow, "offering_id" | "user_id">;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      has_role: { Args: { check_role: AppRole }; Returns: boolean };
      registration_open: { Args: { oid: string }; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
      occupation_type: OccupationType;
      offering_kind: OfferingKind;
      offering_status: OfferingStatus;
      registration_status: RegistrationStatus;
      field_type: FieldType;
    };
    CompositeTypes: Record<string, never>;
  };
}
