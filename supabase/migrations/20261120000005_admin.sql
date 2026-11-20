-- Admin dashboard support.
--   * registrations -> profiles link so admin screens can show each registration with the person's details
--   * door check-in functions usable by admins and volunteers (volunteers see nothing else)

-- Every auth user already has a profile row (created on sign up), so this link is always satisfied.
alter table public.registrations
  add constraint registrations_profile_fk foreign key (user_id) references public.profiles (id) on delete cascade;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('super_admin', 'admin', 'volunteer')
  );
$$;

-- Find people for one event by ticket code, name or phone. Returns only what the door needs.
create or replace function public.checkin_lookup(p_offering_id uuid, p_query text)
returns table (
  registration_id uuid, full_name text, phone text, status public.registration_status,
  ticket_code text, checked_in_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare
  q text := trim(coalesce(p_query, ''));
  -- "0300 1234" should match +923001234567: drop formatting and a leading 0 or 92.
  digits text := regexp_replace(regexp_replace(q, '\D', '', 'g'), '^(0|92)', '');
begin
  if not public.is_staff() then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  return query
    select r.id, p.full_name, p.phone, r.status, r.ticket_code, r.checked_in_at
    from public.registrations r
    join public.profiles p on p.id = r.user_id
    where r.offering_id = p_offering_id
      and r.status in ('confirmed', 'attended', 'waitlisted')
      and (
        q = ''
        or upper(r.ticket_code) = upper(q)
        or p.full_name ilike '%' || q || '%'
        or (length(digits) >= 4 and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') like '%' || digits || '%')
      )
    order by r.checked_in_at nulls first, p.full_name
    limit 25;
end $$;

-- Mark someone as arrived. Safe to call twice: the first check-in time is kept.
create or replace function public.checkin_mark(p_registration_id uuid)
returns table (full_name text, status public.registration_status, checked_in_at timestamptz, already boolean)
language plpgsql security definer set search_path = public as $$
declare
  r public.registrations;
  was_in boolean;
begin
  if not public.is_staff() then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  select * into r from public.registrations where id = p_registration_id for update;
  if not found or r.status not in ('confirmed', 'attended', 'waitlisted') then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  was_in := r.checked_in_at is not null;
  update public.registrations reg
    set status = 'attended',
        checked_in_at = coalesce(reg.checked_in_at, now()),
        checked_in_by = coalesce(reg.checked_in_by, auth.uid())
    where reg.id = r.id
    returning reg.* into r;
  return query select p.full_name, r.status, r.checked_in_at, was_in from public.profiles p where p.id = r.user_id;
end $$;

revoke execute on function public.checkin_lookup(uuid, text) from public, anon;
revoke execute on function public.checkin_mark(uuid) from public, anon;
grant execute on function public.checkin_lookup(uuid, text) to authenticated;
grant execute on function public.checkin_mark(uuid) to authenticated;
grant execute on function public.is_staff() to authenticated;

-- Arrival counter for the door screen (numbers only, no personal data).
create or replace function public.checkin_counts(p_offering_id uuid)
returns table (expected int, arrived int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  return query
    select count(*) filter (where status in ('confirmed', 'attended'))::int,
           count(*) filter (where checked_in_at is not null)::int
    from public.registrations where offering_id = p_offering_id;
end $$;

revoke execute on function public.checkin_counts(uuid) from public, anon;
grant execute on function public.checkin_counts(uuid) to authenticated;
