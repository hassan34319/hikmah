-- Public request forms that do not need an account:
--   mentorship  -> Mentorship Circle applications
--   corporate   -> Hikmah at Work session invitations
--   hifz        -> Hifz Program registrations (one parent, one or more children)
-- Anyone can submit through submit_request(); only admins can read or manage them.

create type public.request_kind as enum ('mentorship', 'corporate', 'hifz', 'contact');
create type public.request_status as enum ('new', 'in_progress', 'done', 'archived');

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  kind public.request_kind not null,
  status public.request_status not null default 'new',
  name text not null,
  email text,
  phone text,
  payload jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users (id) on delete set null,
  admin_notes text,
  handled_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requests_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint requests_payload_size check (octet_length(payload::text) < 20000)
);

create index requests_kind_status_idx on public.requests (kind, status, created_at desc);

create trigger requests_updated_at before update on public.requests
  for each row execute function public.set_updated_at();

alter table public.requests enable row level security;
create policy "requests: admin read" on public.requests for select using (public.is_admin());
create policy "requests: admin update" on public.requests for update using (public.is_admin()) with check (public.is_admin());
create policy "requests: admin delete" on public.requests for delete using (public.is_admin());

-- The only way in. Light spam guard: at most 5 requests per email or phone per hour.
create or replace function public.submit_request(
  p_kind public.request_kind, p_name text, p_email text, p_phone text, p_payload jsonb
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  recent int;
begin
  if coalesce(length(trim(p_name)), 0) < 2 or length(p_name) > 120 then
    raise exception 'bad_name' using errcode = 'P0001';
  end if;
  if p_email is not null and (length(p_email) > 200 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'bad_email' using errcode = 'P0001';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) >= 20000 then
    raise exception 'bad_payload' using errcode = 'P0001';
  end if;

  select count(*) into recent from public.requests
  where created_at > now() - interval '1 hour'
    and ((p_email is not null and lower(email) = lower(p_email)) or (p_phone is not null and phone = p_phone));
  if recent >= 5 then
    raise exception 'too_many' using errcode = 'P0001';
  end if;

  insert into public.requests (kind, name, email, phone, payload, user_id)
  values (p_kind, trim(p_name), nullif(lower(trim(p_email)), ''), nullif(trim(p_phone), ''), p_payload, auth.uid())
  returning id into new_id;
  return new_id;
end $$;

revoke execute on function public.submit_request(public.request_kind, text, text, text, jsonb) from public;
grant execute on function public.submit_request(public.request_kind, text, text, text, jsonb) to anon, authenticated;
grant select, update, delete on public.requests to authenticated;
