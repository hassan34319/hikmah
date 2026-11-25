-- LMS: sections, subjects, teachers, enrolments, timetable, materials and announcements,
-- assignments with submissions, and quizzes.
--
-- Who sees what:
--   students  see content posted to the section they are currently enrolled in
--   teachers  see and post content for the subjects they teach, in the sections they teach
--   admins    see and do everything
-- Files live in the private "lms" storage bucket:
--   c/<offering_id>/<subject_id or none>/<file>      class content (materials, attachments)
--   s/<assignment_id>/<user_id>/<file>               student submissions

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------
create table public.lms_sections (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  intake_year int not null,
  name text not null,                       -- e.g. "Weekdays", "Weekend Morning"
  venue_id uuid references public.venues (id) on delete set null,
  notes text,
  sort int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (offering_id, intake_year, name)
);
create index lms_sections_offering_idx on public.lms_sections (offering_id, intake_year);

create table public.lms_subjects (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  name text not null,                       -- e.g. "Quranic Arabic", "Tajweed"
  sort int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (offering_id, name)
);

-- Who teaches which subject in which section.
create table public.lms_teaching (
  section_id uuid not null references public.lms_sections (id) on delete cascade,
  subject_id uuid not null references public.lms_subjects (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (section_id, subject_id, teacher_id)
);
create index lms_teaching_teacher_idx on public.lms_teaching (teacher_id);

-- A student's place in a section. Moving ends the old row and starts a new one, so history stays.
create table public.lms_enrolments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.lms_sections (id) on delete cascade,
  offering_id uuid not null references public.offerings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  admission_id uuid references public.admissions (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  changed_by uuid references auth.users (id)
);
create unique index lms_enrolments_current_idx on public.lms_enrolments (user_id, offering_id) where ended_at is null;
create index lms_enrolments_section_idx on public.lms_enrolments (section_id) where ended_at is null;

create table public.lms_timetable (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.lms_sections (id) on delete cascade,
  subject_id uuid references public.lms_subjects (id) on delete set null,
  weekday smallint not null check (weekday between 0 and 6),   -- 0 Sunday
  starts time not null,
  ends time not null check (ends > starts),
  room text,
  teacher_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index lms_timetable_section_idx on public.lms_timetable (section_id, weekday, starts);

alter table public.admissions add column section_id uuid references public.lms_sections (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table public.lms_posts (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  subject_id uuid references public.lms_subjects (id) on delete set null,
  kind text not null check (kind in ('material', 'announcement')),
  title text not null,
  body text,
  topic text,                               -- week or topic label, e.g. "Week 3" or "Surah Al-Fatiha"
  files jsonb not null default '[]'::jsonb, -- [{ path, name, size }]
  links jsonb not null default '[]'::jsonb, -- [{ url, label }]
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lms_posts_offering_idx on public.lms_posts (offering_id, created_at desc);
create trigger lms_posts_updated_at before update on public.lms_posts for each row execute function public.set_updated_at();

create table public.lms_post_sections (
  post_id uuid not null references public.lms_posts (id) on delete cascade,
  section_id uuid not null references public.lms_sections (id) on delete cascade,
  primary key (post_id, section_id)
);
create index lms_post_sections_section_idx on public.lms_post_sections (section_id);

create table public.lms_assignments (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  subject_id uuid references public.lms_subjects (id) on delete set null,
  title text not null,
  instructions text,
  files jsonb not null default '[]'::jsonb,
  due_at timestamptz not null,
  max_marks numeric(6,1) not null default 10 check (max_marks > 0),
  allow_late boolean not null default true,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger lms_assignments_updated_at before update on public.lms_assignments for each row execute function public.set_updated_at();

create table public.lms_assignment_sections (
  assignment_id uuid not null references public.lms_assignments (id) on delete cascade,
  section_id uuid not null references public.lms_sections (id) on delete cascade,
  primary key (assignment_id, section_id)
);
create index lms_assignment_sections_section_idx on public.lms_assignment_sections (section_id);

create table public.lms_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.lms_assignments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body text,
  files jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  marks numeric(6,1),
  feedback text,
  marked_by uuid references auth.users (id),
  marked_at timestamptz,
  unique (assignment_id, user_id)
);

create table public.lms_quizzes (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  subject_id uuid references public.lms_subjects (id) on delete set null,
  title text not null,
  instructions text,
  opens_at timestamptz,                     -- null: open as soon as published
  closes_at timestamptz,                    -- null: no closing time
  time_limit_min int check (time_limit_min between 1 and 600),
  shuffle boolean not null default false,
  show_answers boolean not null default true, -- show correct answers once the quiz has closed (or right away if it never closes)
  published boolean not null default false,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger lms_quizzes_updated_at before update on public.lms_quizzes for each row execute function public.set_updated_at();

create table public.lms_quiz_sections (
  quiz_id uuid not null references public.lms_quizzes (id) on delete cascade,
  section_id uuid not null references public.lms_sections (id) on delete cascade,
  primary key (quiz_id, section_id)
);
create index lms_quiz_sections_section_idx on public.lms_quiz_sections (section_id);

create table public.lms_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.lms_quizzes (id) on delete cascade,
  pos int not null,
  kind text not null check (kind in ('mcq', 'short')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,   -- mcq: ["option a", "option b", ...]
  points numeric(5,1) not null default 1 check (points > 0)
);
create index lms_quiz_questions_quiz_idx on public.lms_quiz_questions (quiz_id, pos);

-- Answers sit in their own table that students cannot read.
create table public.lms_quiz_keys (
  question_id uuid primary key references public.lms_quiz_questions (id) on delete cascade,
  correct int,                              -- mcq: index into options
  model_answer text                         -- short: guidance for the teacher
);

create table public.lms_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.lms_quizzes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline timestamptz,
  submitted_at timestamptz,
  score numeric(6,1),                       -- total so far
  max_score numeric(6,1),
  needs_marking boolean not null default false,
  feedback text,
  unique (quiz_id, user_id)
);

create table public.lms_quiz_responses (
  attempt_id uuid not null references public.lms_quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.lms_quiz_questions (id) on delete cascade,
  choice int,
  answer text,
  points numeric(5,1),                      -- null until marked
  saved_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Access helpers (security definer so policies don't recurse)
-- ---------------------------------------------------------------------------
create or replace function public.lms_in_section(p_section uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lms_enrolments where section_id = p_section and user_id = auth.uid() and ended_at is null);
$$;

-- Teaches this subject in this section (or any subject there when p_subject is null).
create or replace function public.lms_teaches(p_section uuid, p_subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.lms_teaching
    where section_id = p_section and teacher_id = auth.uid() and (p_subject is null or subject_id = p_subject));
$$;

-- Teaches this subject anywhere in the course (or anything in it when p_subject is null).
create or replace function public.lms_teaches_in(p_offering uuid, p_subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.lms_teaching t join public.lms_sections s on s.id = t.section_id
    where s.offering_id = p_offering and t.teacher_id = auth.uid() and (p_subject is null or t.subject_id = p_subject));
$$;

create or replace function public.lms_is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lms_teaching where teacher_id = auth.uid())
      or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'faculty');
$$;

create or replace function public.lms_enrolled_in(p_offering uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lms_enrolments where offering_id = p_offering and user_id = auth.uid() and ended_at is null);
$$;

create or replace function public.lms_post_visible(p_post uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.lms_post_sections ps join public.lms_posts p on p.id = ps.post_id
    where ps.post_id = p_post and (public.lms_in_section(ps.section_id) or public.lms_teaches(ps.section_id, p.subject_id)))
  or exists (select 1 from public.lms_posts p where p.id = p_post and (p.created_by = auth.uid() or public.lms_teaches_in(p.offering_id, p.subject_id)));
$$;

-- Teacher side: can mark and edit this assignment.
create or replace function public.lms_assignment_markable(p_assignment uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lms_assignments a where a.id = p_assignment
    and (public.is_admin() or a.created_by = auth.uid() or public.lms_teaches_in(a.offering_id, a.subject_id)));
$$;

create or replace function public.lms_assignment_visible(p_assignment uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.lms_assignment_markable(p_assignment) or exists (
    select 1 from public.lms_assignment_sections x where x.assignment_id = p_assignment and public.lms_in_section(x.section_id));
$$;

create or replace function public.lms_quiz_editable(p_quiz uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lms_quizzes q where q.id = p_quiz
    and (public.is_admin() or q.created_by = auth.uid() or public.lms_teaches_in(q.offering_id, q.subject_id)));
$$;

create or replace function public.lms_quiz_visible(p_quiz uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.lms_quiz_editable(p_quiz) or exists (
    select 1 from public.lms_quiz_sections x join public.lms_quizzes q on q.id = x.quiz_id
    where x.quiz_id = p_quiz and q.published and public.lms_in_section(x.section_id));
$$;

-- A student in one of the caller's sections (teachers need names and emails of their students).
create or replace function public.lms_my_student(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lms_enrolments e join public.lms_teaching t on t.section_id = e.section_id
    where e.user_id = p_user and e.ended_at is null and t.teacher_id = auth.uid());
$$;

-- A teacher of one of the caller's sections (students see their teachers' names).
create or replace function public.lms_my_teacher(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lms_teaching t join public.lms_enrolments e on e.section_id = t.section_id
    where t.teacher_id = p_user and e.user_id = auth.uid() and e.ended_at is null);
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.lms_sections enable row level security;
alter table public.lms_subjects enable row level security;
alter table public.lms_teaching enable row level security;
alter table public.lms_enrolments enable row level security;
alter table public.lms_timetable enable row level security;
alter table public.lms_posts enable row level security;
alter table public.lms_post_sections enable row level security;
alter table public.lms_assignments enable row level security;
alter table public.lms_assignment_sections enable row level security;
alter table public.lms_submissions enable row level security;
alter table public.lms_quizzes enable row level security;
alter table public.lms_quiz_sections enable row level security;
alter table public.lms_quiz_questions enable row level security;
alter table public.lms_quiz_keys enable row level security;
alter table public.lms_quiz_attempts enable row level security;
alter table public.lms_quiz_responses enable row level security;

-- Structure: names are harmless, so any signed-in user can read; only admins change.
create policy "lms_sections: read" on public.lms_sections for select to authenticated using (true);
create policy "lms_sections: admin" on public.lms_sections for all using (public.is_admin()) with check (public.is_admin());
create policy "lms_subjects: read" on public.lms_subjects for select to authenticated using (true);
create policy "lms_subjects: admin" on public.lms_subjects for all using (public.is_admin()) with check (public.is_admin());
create policy "lms_teaching: read" on public.lms_teaching for select to authenticated using (true);
create policy "lms_teaching: admin" on public.lms_teaching for all using (public.is_admin()) with check (public.is_admin());

create policy "lms_enrolments: read" on public.lms_enrolments for select
  using (user_id = auth.uid() or public.is_admin() or (ended_at is null and public.lms_teaches(section_id, null)));
create policy "lms_enrolments: admin" on public.lms_enrolments for all using (public.is_admin()) with check (public.is_admin());

create policy "lms_timetable: read" on public.lms_timetable for select
  using (public.lms_in_section(section_id) or public.lms_teaches(section_id, null));
create policy "lms_timetable: admin" on public.lms_timetable for all using (public.is_admin()) with check (public.is_admin());

-- Posts
create policy "lms_posts: read" on public.lms_posts for select using (public.lms_post_visible(id));
create policy "lms_posts: insert" on public.lms_posts for insert with check (public.lms_teaches_in(offering_id, subject_id));
create policy "lms_posts: update" on public.lms_posts for update
  using (created_by = auth.uid() or public.is_admin() or public.lms_teaches_in(offering_id, subject_id))
  with check (public.lms_teaches_in(offering_id, subject_id));
create policy "lms_posts: delete" on public.lms_posts for delete
  using (created_by = auth.uid() or public.is_admin() or public.lms_teaches_in(offering_id, subject_id));
create policy "lms_post_sections: read" on public.lms_post_sections for select
  using (public.lms_in_section(section_id) or public.lms_post_visible(post_id));
create policy "lms_post_sections: write" on public.lms_post_sections for all
  using (exists (select 1 from public.lms_posts p where p.id = post_id and public.lms_teaches(section_id, p.subject_id)))
  with check (exists (select 1 from public.lms_posts p where p.id = post_id and public.lms_teaches(section_id, p.subject_id)));

-- Assignments
create policy "lms_assignments: read" on public.lms_assignments for select using (public.lms_assignment_visible(id));
create policy "lms_assignments: insert" on public.lms_assignments for insert with check (public.lms_teaches_in(offering_id, subject_id));
create policy "lms_assignments: update" on public.lms_assignments for update
  using (public.lms_assignment_markable(id)) with check (public.lms_teaches_in(offering_id, subject_id));
create policy "lms_assignments: delete" on public.lms_assignments for delete using (public.lms_assignment_markable(id));
create policy "lms_assignment_sections: read" on public.lms_assignment_sections for select
  using (public.lms_in_section(section_id) or public.lms_assignment_markable(assignment_id));
create policy "lms_assignment_sections: write" on public.lms_assignment_sections for all
  using (exists (select 1 from public.lms_assignments a where a.id = assignment_id and public.lms_teaches(section_id, a.subject_id)))
  with check (exists (select 1 from public.lms_assignments a where a.id = assignment_id and public.lms_teaches(section_id, a.subject_id)));

-- Submissions: students write their own until it is marked; teachers mark.
create policy "lms_submissions: read" on public.lms_submissions for select
  using (user_id = auth.uid() or public.lms_assignment_markable(assignment_id));
create policy "lms_submissions: student insert" on public.lms_submissions for insert
  with check (user_id = auth.uid() and public.lms_assignment_visible(assignment_id) and marks is null and marked_at is null);
create policy "lms_submissions: student update" on public.lms_submissions for update
  using (user_id = auth.uid() and marked_at is null) with check (user_id = auth.uid() and marks is null and marked_at is null);
create policy "lms_submissions: teacher update" on public.lms_submissions for update
  using (public.lms_assignment_markable(assignment_id)) with check (public.lms_assignment_markable(assignment_id));
create policy "lms_submissions: student delete" on public.lms_submissions for delete using (user_id = auth.uid() and marked_at is null);

-- Students cannot backdate, teachers cannot rewrite a student's work.
create or replace function public.lms_submissions_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.submitted_at := now();
    if not public.lms_assignment_markable(new.assignment_id) then
      new.marks := null; new.feedback := null; new.marked_by := null; new.marked_at := null;
      if exists (select 1 from public.lms_assignments a where a.id = new.assignment_id and not a.allow_late and now() > a.due_at) then
        raise exception 'past_due' using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;
  if new.user_id = auth.uid() and not public.lms_assignment_markable(new.assignment_id) then
    if exists (select 1 from public.lms_assignments a where a.id = new.assignment_id and not a.allow_late and now() > a.due_at) then
      raise exception 'past_due' using errcode = 'P0001';
    end if;
    new.submitted_at := now();
    new.marks := old.marks; new.feedback := old.feedback; new.marked_by := old.marked_by; new.marked_at := old.marked_at;
  else
    new.body := old.body; new.files := old.files; new.submitted_at := old.submitted_at;
    new.user_id := old.user_id; new.assignment_id := old.assignment_id;
    if new.marks is distinct from old.marks or new.feedback is distinct from old.feedback then
      new.marked_by := auth.uid(); new.marked_at := now();
    end if;
    if new.marks is not null and new.marks > (select max_marks from public.lms_assignments where id = new.assignment_id) then
      raise exception 'marks_above_max' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger lms_submissions_guard before insert or update on public.lms_submissions
  for each row execute function public.lms_submissions_guard();

-- Quizzes
create policy "lms_quizzes: read" on public.lms_quizzes for select using (public.lms_quiz_visible(id));
create policy "lms_quizzes: insert" on public.lms_quizzes for insert with check (public.lms_teaches_in(offering_id, subject_id));
create policy "lms_quizzes: update" on public.lms_quizzes for update using (public.lms_quiz_editable(id)) with check (public.lms_teaches_in(offering_id, subject_id));
create policy "lms_quizzes: delete" on public.lms_quizzes for delete using (public.lms_quiz_editable(id));
create policy "lms_quiz_sections: read" on public.lms_quiz_sections for select
  using (public.lms_in_section(section_id) or public.lms_quiz_editable(quiz_id));
create policy "lms_quiz_sections: write" on public.lms_quiz_sections for all
  using (exists (select 1 from public.lms_quizzes q where q.id = quiz_id and public.lms_teaches(section_id, q.subject_id)))
  with check (exists (select 1 from public.lms_quizzes q where q.id = quiz_id and public.lms_teaches(section_id, q.subject_id)));
-- Students only see questions once they have started (so the clock is running).
create policy "lms_quiz_questions: read" on public.lms_quiz_questions for select
  using (public.lms_quiz_editable(quiz_id) or exists (select 1 from public.lms_quiz_attempts a where a.quiz_id = lms_quiz_questions.quiz_id and a.user_id = auth.uid()));
create policy "lms_quiz_questions: write" on public.lms_quiz_questions for all
  using (public.lms_quiz_editable(quiz_id)) with check (public.lms_quiz_editable(quiz_id));
create policy "lms_quiz_keys: teacher" on public.lms_quiz_keys for all
  using (exists (select 1 from public.lms_quiz_questions q where q.id = question_id and public.lms_quiz_editable(q.quiz_id)))
  with check (exists (select 1 from public.lms_quiz_questions q where q.id = question_id and public.lms_quiz_editable(q.quiz_id)));
-- Attempts and responses are written only through the RPCs below; teachers mark through lms_quiz_mark.
create policy "lms_quiz_attempts: read" on public.lms_quiz_attempts for select
  using (user_id = auth.uid() or public.lms_quiz_editable(quiz_id));
create policy "lms_quiz_responses: read" on public.lms_quiz_responses for select
  using (exists (select 1 from public.lms_quiz_attempts a where a.id = attempt_id and (a.user_id = auth.uid() or public.lms_quiz_editable(a.quiz_id))));

-- People: teachers see their students, students see their teachers.
create policy "profiles: teacher reads students" on public.profiles for select using (public.lms_my_student(id));
create policy "profiles: student reads teachers" on public.profiles for select using (public.lms_my_teacher(id));

-- ---------------------------------------------------------------------------
-- Enrolment (admins): place or move students, grant the student role
-- ---------------------------------------------------------------------------
create or replace function public.lms_place(p_users uuid[], p_section uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  sec public.lms_sections;
  uid uuid;
  n int := 0;
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  select * into sec from public.lms_sections where id = p_section;
  if sec.id is null then raise exception 'no_section' using errcode = 'P0001'; end if;
  foreach uid in array p_users loop
    if exists (select 1 from public.lms_enrolments where user_id = uid and offering_id = sec.offering_id and ended_at is null and section_id = p_section) then
      continue;
    end if;
    update public.lms_enrolments set ended_at = now(), changed_by = auth.uid()
      where user_id = uid and offering_id = sec.offering_id and ended_at is null;
    insert into public.lms_enrolments (section_id, offering_id, user_id, admission_id, changed_by)
      values (p_section, sec.offering_id, uid,
              (select id from public.admissions where user_id = uid and offering_id = sec.offering_id order by created_at desc limit 1),
              auth.uid());
    insert into public.user_roles (user_id, role, granted_by) values (uid, 'student', auth.uid()) on conflict do nothing;
    update public.admissions set section_id = p_section where user_id = uid and offering_id = sec.offering_id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Remove from a course (keeps history). The student role stays if they are in another course.
create or replace function public.lms_unplace(p_users uuid[], p_offering uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  update public.lms_enrolments set ended_at = now(), changed_by = auth.uid()
    where user_id = any (p_users) and offering_id = p_offering and ended_at is null;
  get diagnostics n = row_count;
  delete from public.user_roles r where r.role = 'student' and r.user_id = any (p_users)
    and not exists (select 1 from public.lms_enrolments e where e.user_id = r.user_id and e.ended_at is null);
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Quiz taking (students)
-- ---------------------------------------------------------------------------
create or replace function public.lms_quiz_open(q public.lms_quizzes)
returns boolean language sql stable as $$
  select q.published and (q.opens_at is null or q.opens_at <= now()) and (q.closes_at is null or q.closes_at > now());
$$;

create or replace function public.lms_quiz_start(p_quiz uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  q public.lms_quizzes;
  att public.lms_quiz_attempts;
begin
  select * into q from public.lms_quizzes where id = p_quiz;
  if q.id is null or not exists (select 1 from public.lms_quiz_sections x where x.quiz_id = p_quiz and public.lms_in_section(x.section_id)) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  select * into att from public.lms_quiz_attempts where quiz_id = p_quiz and user_id = auth.uid();
  if att.id is not null then return att.id; end if;
  if not public.lms_quiz_open(q) then raise exception 'closed' using errcode = 'P0001'; end if;
  insert into public.lms_quiz_attempts (quiz_id, user_id, deadline, max_score)
  values (p_quiz, auth.uid(),
          least(case when q.time_limit_min is not null then now() + make_interval(mins => q.time_limit_min) end, q.closes_at),
          (select coalesce(sum(points), 0) from public.lms_quiz_questions where quiz_id = p_quiz))
  returning * into att;
  return att.id;
end $$;

-- Saves one answer. 30 seconds of grace for slow connections.
create or replace function public.lms_quiz_save(p_attempt uuid, p_question uuid, p_choice int, p_answer text)
returns boolean language plpgsql security definer set search_path = public as $$
declare att public.lms_quiz_attempts;
begin
  select * into att from public.lms_quiz_attempts where id = p_attempt and user_id = auth.uid();
  if att.id is null then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  if att.submitted_at is not null then raise exception 'submitted' using errcode = 'P0001'; end if;
  if att.deadline is not null and now() > att.deadline + interval '30 seconds' then raise exception 'time_up' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.lms_quiz_questions where id = p_question and quiz_id = att.quiz_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  insert into public.lms_quiz_responses (attempt_id, question_id, choice, answer)
  values (p_attempt, p_question, p_choice, left(p_answer, 5000))
  on conflict (attempt_id, question_id) do update set choice = excluded.choice, answer = excluded.answer, saved_at = now();
  return true;
end $$;

-- Marks the multiple-choice answers and totals. Short answers wait for the teacher.
create or replace function public.lms_quiz_total(p_attempt uuid)
returns void language plpgsql security definer set search_path = public as $$
declare att public.lms_quiz_attempts;
begin
  select * into att from public.lms_quiz_attempts where id = p_attempt;
  -- Every question gets a response row so unanswered ones count as zero.
  insert into public.lms_quiz_responses (attempt_id, question_id)
  select p_attempt, q.id from public.lms_quiz_questions q where q.quiz_id = att.quiz_id
  on conflict do nothing;
  update public.lms_quiz_responses r set points = case when r.choice is not null and r.choice = k.correct then q.points else 0 end
  from public.lms_quiz_questions q left join public.lms_quiz_keys k on k.question_id = q.id
  where r.attempt_id = p_attempt and r.question_id = q.id and q.kind = 'mcq';
  update public.lms_quiz_responses r set points = 0
  from public.lms_quiz_questions q
  where r.attempt_id = p_attempt and r.question_id = q.id and q.kind = 'short' and r.points is null and coalesce(trim(r.answer), '') = '';
  update public.lms_quiz_attempts set
    score = (select coalesce(sum(points), 0) from public.lms_quiz_responses where attempt_id = p_attempt),
    max_score = (select coalesce(sum(points), 0) from public.lms_quiz_questions where quiz_id = att.quiz_id),
    needs_marking = exists (select 1 from public.lms_quiz_responses where attempt_id = p_attempt and points is null)
  where id = p_attempt;
end $$;

create or replace function public.lms_quiz_submit(p_attempt uuid)
returns void language plpgsql security definer set search_path = public as $$
declare att public.lms_quiz_attempts;
begin
  select * into att from public.lms_quiz_attempts where id = p_attempt and user_id = auth.uid();
  if att.id is null then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  if att.submitted_at is not null then return; end if;
  update public.lms_quiz_attempts set submitted_at = least(now(), coalesce(deadline + interval '30 seconds', now())) where id = p_attempt;
  perform public.lms_quiz_total(p_attempt);
end $$;

-- Attempts whose time ran out are closed off when anyone looks at the quiz.
create or replace function public.lms_quiz_close_expired(p_quiz uuid)
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from public.lms_quiz_attempts
           where quiz_id = p_quiz and submitted_at is null and deadline is not null and now() > deadline + interval '30 seconds'
  loop
    update public.lms_quiz_attempts set submitted_at = deadline where id = r.id;
    perform public.lms_quiz_total(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Question count and total points, for the quiz lists and start page.
create or replace function public.lms_quiz_summary(p_quizzes uuid[])
returns table (quiz_id uuid, questions int, points numeric)
language sql stable security definer set search_path = public as $$
  select q.quiz_id, count(*)::int, sum(q.points)
  from public.lms_quiz_questions q
  where q.quiz_id = any (p_quizzes) and public.lms_quiz_visible(q.quiz_id)
  group by q.quiz_id;
$$;

-- Teacher marks one short answer (or overrides any answer).
create or replace function public.lms_quiz_mark(p_attempt uuid, p_question uuid, p_points numeric)
returns void language plpgsql security definer set search_path = public as $$
declare att public.lms_quiz_attempts; maxp numeric;
begin
  select * into att from public.lms_quiz_attempts where id = p_attempt;
  if att.id is null or not public.lms_quiz_editable(att.quiz_id) then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  select points into maxp from public.lms_quiz_questions where id = p_question and quiz_id = att.quiz_id;
  if maxp is null then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  if p_points < 0 or p_points > maxp then raise exception 'points_out_of_range' using errcode = 'P0001'; end if;
  insert into public.lms_quiz_responses (attempt_id, question_id, points) values (p_attempt, p_question, p_points)
  on conflict (attempt_id, question_id) do update set points = excluded.points;
  update public.lms_quiz_attempts set
    score = (select coalesce(sum(points), 0) from public.lms_quiz_responses where attempt_id = p_attempt),
    needs_marking = exists (select 1 from public.lms_quiz_responses where attempt_id = p_attempt and points is null)
  where id = p_attempt;
end $$;

create or replace function public.lms_quiz_feedback(p_attempt uuid, p_feedback text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.lms_quiz_attempts a where a.id = p_attempt and public.lms_quiz_editable(a.quiz_id)) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  update public.lms_quiz_attempts set feedback = p_feedback where id = p_attempt;
end $$;

-- After a quiz closes (or straight away for quizzes that never close, once submitted), students may see the answers.
create or replace function public.lms_quiz_review(p_attempt uuid)
returns table (question_id uuid, correct int, model_answer text)
language plpgsql security definer set search_path = public as $$
declare att public.lms_quiz_attempts; q public.lms_quizzes;
begin
  select * into att from public.lms_quiz_attempts where id = p_attempt and (user_id = auth.uid() or public.lms_quiz_editable(quiz_id));
  if att.id is null or att.submitted_at is null then return; end if;
  select * into q from public.lms_quizzes where id = att.quiz_id;
  if not public.lms_quiz_editable(q.id) and (not q.show_answers or (q.closes_at is not null and q.closes_at > now())) then return; end if;
  return query select k.question_id, k.correct, k.model_answer
    from public.lms_quiz_keys k join public.lms_quiz_questions qq on qq.id = k.question_id where qq.quiz_id = q.id;
end $$;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('lms', 'lms', false, 52428800)
on conflict (id) do nothing;

create or replace function public.lms_uuid(p text)
returns uuid language sql immutable as $$
  select case when p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end;
$$;

create or replace function public.lms_file_readable(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare parts text[] := string_to_array(p_name, '/');
begin
  if parts[1] = 'c' then
    return public.is_admin() or public.lms_enrolled_in(public.lms_uuid(parts[2])) or public.lms_teaches_in(public.lms_uuid(parts[2]), null);
  elsif parts[1] = 's' then
    return public.lms_uuid(parts[3]) = auth.uid() or public.lms_assignment_markable(public.lms_uuid(parts[2]));
  end if;
  return false;
end $$;

create or replace function public.lms_file_writable(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare parts text[] := string_to_array(p_name, '/');
begin
  if parts[1] = 'c' then
    return public.lms_teaches_in(public.lms_uuid(parts[2]), case when parts[3] = 'none' then null else public.lms_uuid(parts[3]) end);
  elsif parts[1] = 's' then
    return public.lms_uuid(parts[3]) = auth.uid() and public.lms_assignment_visible(public.lms_uuid(parts[2]));
  end if;
  return false;
end $$;

create policy "lms files: read" on storage.objects for select using (bucket_id = 'lms' and public.lms_file_readable(name));
create policy "lms files: insert" on storage.objects for insert with check (bucket_id = 'lms' and public.lms_file_writable(name));
create policy "lms files: update" on storage.objects for update using (bucket_id = 'lms' and public.lms_file_writable(name));
create policy "lms files: delete" on storage.objects for delete using (bucket_id = 'lms' and public.lms_file_writable(name));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke execute on function public.lms_place(uuid[], uuid) from public, anon;
revoke execute on function public.lms_unplace(uuid[], uuid) from public, anon;
revoke execute on function public.lms_quiz_start(uuid) from public, anon;
revoke execute on function public.lms_quiz_save(uuid, uuid, int, text) from public, anon;
revoke execute on function public.lms_quiz_submit(uuid) from public, anon;
revoke execute on function public.lms_quiz_total(uuid) from public, anon, authenticated;
revoke execute on function public.lms_quiz_close_expired(uuid) from public, anon;
revoke execute on function public.lms_quiz_mark(uuid, uuid, numeric) from public, anon;
revoke execute on function public.lms_quiz_feedback(uuid, text) from public, anon;
revoke execute on function public.lms_quiz_review(uuid) from public, anon;
revoke execute on function public.lms_quiz_summary(uuid[]) from public, anon;
grant execute on function public.lms_place(uuid[], uuid) to authenticated;
grant execute on function public.lms_unplace(uuid[], uuid) to authenticated;
grant execute on function public.lms_quiz_start(uuid) to authenticated;
grant execute on function public.lms_quiz_save(uuid, uuid, int, text) to authenticated;
grant execute on function public.lms_quiz_submit(uuid) to authenticated;
grant execute on function public.lms_quiz_close_expired(uuid) to authenticated;
grant execute on function public.lms_quiz_mark(uuid, uuid, numeric) to authenticated;
grant execute on function public.lms_quiz_feedback(uuid, text) to authenticated;
grant execute on function public.lms_quiz_review(uuid) to authenticated;
grant execute on function public.lms_quiz_summary(uuid[]) to authenticated;
