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
  intake_label: string | null; outcomes: string[]; intake_year: number | null; essay_prompt: string;
};

export type AdmissionStage = "applied" | "test_invited" | "test_done" | "interview_invited" | "interviewed" | "selected" | "waitlisted" | "not_selected";
export type GameDetail = Record<string, { correct: number; total: number; points: number; max: number }>;
export type AdmissionRow = {
  id: string; registration_id: string; offering_id: string; user_id: string; stage: AdmissionStage; test_token: string;
  test_invited_at: string | null; test_started_at: string | null; test_submitted_at: string | null; test_score: number | null;
  test_detail: Json; tab_switches: number; essay: string | null; pledge: boolean; interview_invited_at: string | null;
  slot_id: string | null; interview_score: number | null; interview_notes: string | null; interviewer_id: string | null;
  interviewed_at: string | null; batch: string | null; campus: string | null; student_id: string | null; decided_at: string | null;
  decision_sent_at: string | null; admin_notes: string | null; section_id: string | null; created_at: string; updated_at: string;
};
export type InterviewSlotRow = { id: string; offering_id: string; starts_at: string; minutes: number; venue_id: string | null; capacity: number; created_at: string };
export type TestItem = { item_id: string; game: string; level: number; limit_s: number; payload: Json; pos: number; total: number; score: number };

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

// LMS
export type LmsFile = { path: string; name: string; size: number };
export type LmsLink = { url: string; label: string };
export type LmsSectionRow = { id: string; offering_id: string; intake_year: number; name: string; venue_id: string | null; notes: string | null; sort: number; archived: boolean; created_at: string };
export type LmsSubjectRow = { id: string; offering_id: string; name: string; sort: number; archived: boolean; created_at: string };
export type LmsTeachingRow = { section_id: string; subject_id: string; teacher_id: string; created_at: string };
export type LmsEnrolmentRow = { id: string; section_id: string; offering_id: string; user_id: string; admission_id: string | null; started_at: string; ended_at: string | null; changed_by: string | null };
export type LmsTimetableRow = { id: string; section_id: string; subject_id: string | null; weekday: number; starts: string; ends: string; room: string | null; teacher_id: string | null; created_at: string };
export type LmsPostKind = "material" | "announcement";
export type LmsPostRow = { id: string; offering_id: string; subject_id: string | null; kind: LmsPostKind; title: string; body: string | null; topic: string | null; files: Json; links: Json; created_by: string | null; created_at: string; updated_at: string };
export type LmsPostSectionRow = { post_id: string; section_id: string };
export type LmsAssignmentRow = { id: string; offering_id: string; subject_id: string | null; title: string; instructions: string | null; files: Json; due_at: string; max_marks: number; allow_late: boolean; created_by: string | null; created_at: string; updated_at: string };
export type LmsAssignmentSectionRow = { assignment_id: string; section_id: string };
export type LmsSubmissionRow = { id: string; assignment_id: string; user_id: string; body: string | null; files: Json; submitted_at: string; marks: number | null; feedback: string | null; marked_by: string | null; marked_at: string | null };
export type LmsQuizRow = { id: string; offering_id: string; subject_id: string | null; title: string; instructions: string | null; opens_at: string | null; closes_at: string | null; time_limit_min: number | null; shuffle: boolean; show_answers: boolean; published: boolean; created_by: string | null; created_at: string; updated_at: string };
export type LmsQuizSectionRow = { quiz_id: string; section_id: string };
export type LmsQuestionKind = "mcq" | "short";
export type LmsQuizQuestionRow = { id: string; quiz_id: string; pos: number; kind: LmsQuestionKind; prompt: string; options: Json; points: number };
export type LmsQuizKeyRow = { question_id: string; correct: number | null; model_answer: string | null };
export type LmsQuizAttemptRow = { id: string; quiz_id: string; user_id: string; started_at: string; deadline: string | null; submitted_at: string | null; score: number | null; max_score: number | null; needs_marking: boolean; feedback: string | null };
export type LmsQuizResponseRow = { attempt_id: string; question_id: string; choice: number | null; answer: string | null; points: number | null; saved_at: string };

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
      admissions: Table<AdmissionRow, "registration_id" | "offering_id" | "user_id">;
      interview_slots: Table<InterviewSlotRow, "offering_id" | "starts_at">;
      campaigns: Table<CampaignRow, "subject">;
      campaign_recipients: Table<CampaignRecipientRow, "campaign_id" | "user_id" | "email">;
      lms_sections: Table<LmsSectionRow, "offering_id" | "intake_year" | "name">;
      lms_subjects: Table<LmsSubjectRow, "offering_id" | "name">;
      lms_teaching: Table<LmsTeachingRow, "section_id" | "subject_id" | "teacher_id">;
      lms_enrolments: Table<LmsEnrolmentRow, "section_id" | "offering_id" | "user_id">;
      lms_timetable: Table<LmsTimetableRow, "section_id" | "weekday" | "starts" | "ends">;
      lms_posts: Table<LmsPostRow, "offering_id" | "kind" | "title">;
      lms_post_sections: Table<LmsPostSectionRow, "post_id" | "section_id">;
      lms_assignments: Table<LmsAssignmentRow, "offering_id" | "title" | "due_at">;
      lms_assignment_sections: Table<LmsAssignmentSectionRow, "assignment_id" | "section_id">;
      lms_submissions: Table<LmsSubmissionRow, "assignment_id">;
      lms_quizzes: Table<LmsQuizRow, "offering_id" | "title">;
      lms_quiz_sections: Table<LmsQuizSectionRow, "quiz_id" | "section_id">;
      lms_quiz_questions: Table<LmsQuizQuestionRow, "quiz_id" | "pos" | "kind" | "prompt">;
      lms_quiz_keys: Table<LmsQuizKeyRow, "question_id">;
      lms_quiz_attempts: Table<LmsQuizAttemptRow, "quiz_id" | "user_id">;
      lms_quiz_responses: Table<LmsQuizResponseRow, "attempt_id" | "question_id">;
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
      admission_test_info: { Args: { p_token: string }; Returns: { course: string; stage: AdmissionStage; started: boolean; submitted: boolean; total: number; answered: number; essay_prompt: string; first_name: string | null }[] };
      admission_test_start: { Args: { p_token: string }; Returns: number };
      admission_test_next: { Args: { p_token: string }; Returns: TestItem[] };
      admission_test_answer: { Args: { p_token: string; p_item: string; p_response: Json }; Returns: { correct: boolean; points: number }[] };
      admission_test_flag: { Args: { p_token: string }; Returns: undefined };
      admission_test_submit: { Args: { p_token: string; p_essay: string; p_pledge: boolean }; Returns: number };
      interview_slots_for: { Args: { p_token: string }; Returns: { slot_id: string; starts_at: string; minutes: number; venue: string | null; seats_left: number; mine: boolean }[] };
      interview_book: { Args: { p_token: string; p_slot: string }; Returns: string };
      interview_record: { Args: { p_admission: string; p_score: number; p_notes: string }; Returns: undefined };
      admission_assign_student_id: { Args: { p_admission: string }; Returns: string };
      is_interviewer: { Args: Record<string, never>; Returns: boolean };
      people_search: { Args: { p_rules: Json }; Returns: PersonResult[] };
      staff_list: { Args: Record<string, never>; Returns: { user_id: string; email: string; full_name: string | null; roles: AppRole[] }[] };
      staff_set_role: { Args: { p_email: string; p_role: AppRole; p_grant: boolean }; Returns: string };
      lms_place: { Args: { p_users: string[]; p_section: string }; Returns: number };
      lms_unplace: { Args: { p_users: string[]; p_offering: string }; Returns: number };
      lms_is_teacher: { Args: Record<string, never>; Returns: boolean };
      lms_quiz_start: { Args: { p_quiz: string }; Returns: string };
      lms_quiz_save: { Args: { p_attempt: string; p_question: string; p_choice: number | null; p_answer: string | null }; Returns: boolean };
      lms_quiz_submit: { Args: { p_attempt: string }; Returns: undefined };
      lms_quiz_close_expired: { Args: { p_quiz: string }; Returns: number };
      lms_quiz_mark: { Args: { p_attempt: string; p_question: string; p_points: number }; Returns: undefined };
      lms_quiz_feedback: { Args: { p_attempt: string; p_feedback: string }; Returns: undefined };
      lms_quiz_summary: { Args: { p_quizzes: string[] }; Returns: { quiz_id: string; questions: number; points: number }[] };
      lms_quiz_review: { Args: { p_attempt: string }; Returns: { question_id: string; correct: number | null; model_answer: string | null }[] };
      checkin_counts: { Args: { p_offering_id: string }; Returns: { expected: number; arrived: number }[] };
      checkin_mark: {
        Args: { p_registration_id: string };
        Returns: { full_name: string | null; status: RegistrationStatus; checked_in_at: string; already: boolean }[];
      };
    };
    Enums: {
      app_role: AppRole;
      admission_stage: AdmissionStage;
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
