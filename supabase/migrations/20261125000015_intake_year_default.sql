-- When a course has no intake year set, student IDs used this year while the Classes and Admissions
-- pages assumed next year's intake. Use next year everywhere (admissions run the year before classes start).
create or replace function public.admission_assign_student_id(p_admission uuid) returns text
language plpgsql security definer set search_path = public as $$
declare a public.admissions; code text; yy text; prefix text; n int; sid text;
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  select * into a from public.admissions where id = p_admission for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.student_id is not null then return a.student_id; end if;
  select upper(regexp_replace(coalesce(cd.code, ''), '[^A-Za-z0-9]', '', 'g')),
         lpad((coalesce(cd.intake_year, extract(year from now())::int + 1) % 100)::text, 2, '0')
    into code, yy from public.course_details cd where cd.offering_id = a.offering_id;
  if coalesce(code, '') = '' then
    select upper(left(regexp_replace(o.title, '[^A-Za-z]', '', 'g'), 2)) into code from public.offerings o where o.id = a.offering_id;
  end if;
  yy := coalesce(yy, lpad(((extract(year from now())::int + 1) % 100)::text, 2, '0'));
  prefix := 'HKM-' || yy || '-' || code || '-';
  perform pg_advisory_xact_lock(hashtext(prefix));
  select coalesce(max(substring(student_id from length(prefix) + 1)::int), 0) + 1 into n
    from public.admissions where student_id like prefix || '%';
  sid := prefix || lpad(n::text, 4, '0');
  update public.admissions set student_id = sid where id = a.id;
  return sid;
end $$;

-- Deleting a teacher's account was blocked by the content they created or marked. Keep the content, clear the link.
alter table public.lms_posts drop constraint if exists lms_posts_created_by_fkey,
  add constraint lms_posts_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;
alter table public.lms_assignments drop constraint if exists lms_assignments_created_by_fkey,
  add constraint lms_assignments_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;
alter table public.lms_quizzes drop constraint if exists lms_quizzes_created_by_fkey,
  add constraint lms_quizzes_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;
alter table public.lms_submissions drop constraint if exists lms_submissions_marked_by_fkey,
  add constraint lms_submissions_marked_by_fkey foreign key (marked_by) references auth.users (id) on delete set null;
alter table public.lms_enrolments drop constraint if exists lms_enrolments_changed_by_fkey,
  add constraint lms_enrolments_changed_by_fkey foreign key (changed_by) references auth.users (id) on delete set null;
