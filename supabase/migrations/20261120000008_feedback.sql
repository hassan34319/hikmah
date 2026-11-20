-- Event feedback forms. Sent manually by an admin for chosen events, to everyone who registered.
-- Each registration has a private token, so people answer from the email link without signing in.

alter table public.registrations add column feedback_token uuid not null default gen_random_uuid();
create unique index registrations_feedback_token_key on public.registrations (feedback_token);

create table public.feedback_forms (
  offering_id uuid primary key references public.offerings (id) on delete cascade,
  questions jsonb not null default '[]'::jsonb,
  intro text,
  is_open boolean not null default true,
  sent_at timestamptz,
  sent_count int not null default 0,
  sent_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  constraint feedback_questions_array check (jsonb_typeof(questions) = 'array')
);

create table public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  registration_id uuid not null unique references public.registrations (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_answers_object check (jsonb_typeof(answers) = 'object'),
  constraint feedback_answers_size check (octet_length(answers::text) < 20000)
);
create index feedback_responses_offering_idx on public.feedback_responses (offering_id);

create trigger feedback_forms_updated_at before update on public.feedback_forms for each row execute function public.set_updated_at();
create trigger feedback_responses_updated_at before update on public.feedback_responses for each row execute function public.set_updated_at();

alter table public.feedback_forms enable row level security;
alter table public.feedback_responses enable row level security;
create policy "feedback_forms: admin" on public.feedback_forms for all using (public.is_admin()) with check (public.is_admin());
create policy "feedback_responses: admin read" on public.feedback_responses for select using (public.is_admin());
create policy "feedback_responses: admin delete" on public.feedback_responses for delete using (public.is_admin());
grant select, insert, update, delete on public.feedback_forms, public.feedback_responses to authenticated;

-- What the feedback page needs for one token: the event, the questions, and any earlier answer.
create or replace function public.feedback_form_for(p_token uuid)
returns table (offering_title text, offering_subtitle text, starts_at timestamptz, venue text, first_name text,
               intro text, questions jsonb, is_open boolean, answers jsonb, anonymous boolean)
language sql stable security definer set search_path = public as $$
  select o.title, o.subtitle, o.starts_at,
         coalesce(v.name, o.location_text, case when o.is_online then 'Online' end),
         split_part(coalesce(p.full_name, ''), ' ', 1),
         f.intro, f.questions, f.is_open, fr.answers, fr.anonymous
  from public.registrations r
  join public.offerings o on o.id = r.offering_id
  join public.feedback_forms f on f.offering_id = r.offering_id
  left join public.venues v on v.id = o.venue_id
  left join public.profiles p on p.id = r.user_id
  left join public.feedback_responses fr on fr.registration_id = r.id
  where r.feedback_token = p_token;
$$;

-- Save (or update) the answer for one token. Only while the form is open.
create or replace function public.submit_feedback(p_token uuid, p_answers jsonb, p_anonymous boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  r public.registrations;
  open boolean;
begin
  select * into r from public.registrations where feedback_token = p_token;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select is_open into open from public.feedback_forms where offering_id = r.offering_id;
  if not coalesce(open, false) then raise exception 'closed' using errcode = 'P0001'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or octet_length(p_answers::text) >= 20000 then
    raise exception 'bad_answers' using errcode = 'P0001';
  end if;
  insert into public.feedback_responses (offering_id, registration_id, answers, anonymous)
  values (r.offering_id, r.id, p_answers, coalesce(p_anonymous, false))
  on conflict (registration_id) do update set answers = excluded.answers, anonymous = excluded.anonymous;
  return true;
end $$;

revoke execute on function public.feedback_form_for(uuid) from public;
revoke execute on function public.submit_feedback(uuid, jsonb, boolean) from public;
grant execute on function public.feedback_form_for(uuid) to anon, authenticated;
grant execute on function public.submit_feedback(uuid, jsonb, boolean) to anon, authenticated;
