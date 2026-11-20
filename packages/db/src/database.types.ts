// Hand-written to match supabase/migrations. Once a Supabase project exists,
// regenerate with `pnpm db:types` and this file will be replaced.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "super_admin" | "admin" | "faculty" | "student" | "interviewer" | "volunteer";
export type Gender = "male" | "female";
export type RequestKind = "mentorship" | "corporate" | "hifz" | "contact";
export type RequestStatus = "new" | "in_progress" | "done" | "archived";
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
  /** WhatsApp number, the only phone we keep. */
  phone: string | null;
  gender: Gender | null;
  /** Optional CNIC or B-Form, 12345-1234567-1. */
  cnic: string | null;
  date_of_birth: string | null;
  occupation_type: OccupationType | null;
  university: string | null;
  degree: string | null;
  education_year: string | null;
  company: string | null;
  job_title: string | null;
  address_line: string | null;
  area: string | null;
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
  submitted_at: string; updated_at: string; feedback_token: string;
};

export type RequestRow = {
  id: string; kind: RequestKind; status: RequestStatus; name: string; email: string | null; phone: string | null;
  payload: Json; user_id: string | null; admin_notes: string | null; handled_by: string | null; created_at: string; updated_at: string;
};

export type SiteSettingRow = { key: string; value: Json; updated_by: string | null; updated_at: string };

export type FeedbackFormRow = {
  offering_id: string; questions: Json; intro: string | null; is_open: boolean; sent_at: string | null; sent_count: number; sent_by: string | null; updated_at: string;
};
export type FeedbackResponseRow = { id: string; offering_id: string; registration_id: string; answers: Json; anonymous: boolean; created_at: string; updated_at: string };

export type SegmentRow = { id: string; name: string; rules: Json; created_by: string | null; created_at: string; updated_at: string };
export type CampaignRow = {
  id: string; offering_id: string | null; segment_id: string | null; rules: Json; subject: string; message: string | null;
  recipient_count: number; sent_count: number; sent_by: string | null; created_at: string;
};
export type CampaignRecipientRow = { campaign_id: string; user_id: string; email: string };
export type PersonResult = {
  user_id: string; full_name: string | null; email: string; phone: string | null; area: string | null;
  occupation_type: OccupationType | null; gender: Gender | null; interests: string[]; email_opt_in: boolean;
  whatsapp_opt_in: boolean; joined_at: string; registrations: number; last_registered_at: string | null;
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
      requests: Table<RequestRow, "kind" | "name">;
      site_settings: Table<SiteSettingRow, "key">;
      feedback_forms: Table<FeedbackFormRow, "offering_id">;
      feedback_responses: Table<FeedbackResponseRow, "offering_id" | "registration_id">;
      segments: Table<SegmentRow, "name">;
      campaigns: Table<CampaignRow, "subject">;
      campaign_recipients: Table<CampaignRecipientRow, "campaign_id" | "user_id" | "email">;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      has_role: { Args: { check_role: AppRole }; Returns: boolean };
      registration_open: { Args: { oid: string }; Returns: boolean };
      register_for_offering: { Args: { p_slug: string; p_answers: Json }; Returns: RegistrationRow };
      cancel_registration: { Args: { p_registration_id: string }; Returns: RegistrationRow };
      seats_taken: { Args: { p_offering_id: string }; Returns: number };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      feedback_form_for: {
        Args: { p_token: string };
        Returns: { offering_title: string; offering_subtitle: string | null; starts_at: string | null; venue: string | null; first_name: string | null; intro: string | null; questions: Json; is_open: boolean; answers: Json | null; anonymous: boolean | null }[];
      };
      submit_feedback: { Args: { p_token: string; p_answers: Json; p_anonymous: boolean }; Returns: boolean };
      submit_request: { Args: { p_kind: RequestKind; p_name: string; p_email: string | null; p_phone: string | null; p_payload: Json }; Returns: string };
      checkin_lookup: {
        Args: { p_offering_id: string; p_query: string };
        Returns: { registration_id: string; full_name: string | null; phone: string | null; status: RegistrationStatus; ticket_code: string | null; checked_in_at: string | null }[];
      };
      people_search: { Args: { p_rules: Json }; Returns: PersonResult[] };
      staff_list: { Args: Record<string, never>; Returns: { user_id: string; email: string; full_name: string | null; roles: AppRole[] }[] };
      staff_set_role: { Args: { p_email: string; p_role: AppRole; p_grant: boolean }; Returns: string };
      checkin_counts: { Args: { p_offering_id: string }; Returns: { expected: number; arrived: number }[] };
      checkin_mark: {
        Args: { p_registration_id: string };
        Returns: { full_name: string | null; status: RegistrationStatus; checked_in_at: string; already: boolean }[];
      };
    };
    Enums: {
      app_role: AppRole;
      occupation_type: OccupationType;
      gender: Gender;
      request_kind: RequestKind;
      request_status: RequestStatus;
      offering_kind: OfferingKind;
      offering_status: OfferingStatus;
      registration_status: RegistrationStatus;
      field_type: FieldType;
    };
    CompositeTypes: Record<string, never>;
  };
}
