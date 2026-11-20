-- Phase 2: registering for courses and events.
-- All registration goes through two functions so the rules live in one place:
--   register_for_offering(slug, answers) -> creates or re-activates the caller's registration
--   cancel_registration(registration_id)  -> cancels the caller's own registration
-- Status is decided here, never by the browser:
--   courses -> 'submitted' (an application, reviewed by admins)
--   events  -> 'confirmed' while seats remain, otherwise 'waitlisted'

-- The column guard from migration 1 blocks non-admins from changing status. Our own security definer
-- functions below run as the database owner, not as the signed-in user, so let those through.
create or replace function public.protect_registration_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.status is distinct from old.status and new.status <> 'cancelled' then
      raise exception 'Only admins can change registration status';
    end if;
    new.offering_id = old.offering_id;
    new.user_id = old.user_id;
    new.ticket_code = old.ticket_code;
    new.checked_in_at = old.checked_in_at;
    new.checked_in_by = old.checked_in_by;
    new.admin_notes = old.admin_notes;
    new.submitted_at = old.submitted_at;
  end if;
  return new;
end $$;

-- Short human ticket codes like HKM-7Q4K2X (no 0/O/1/I to avoid confusion at the door).
create or replace function public.generate_ticket_code()
returns text language plpgsql as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text;
begin
  loop
    code := 'HKM-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.registrations where ticket_code = code);
  end loop;
  return code;
end $$;

create or replace function public.register_for_offering(p_slug text, p_answers jsonb)
returns public.registrations
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  o public.offerings;
  k public.offering_kind;
  existing public.registrations;
  taken int;
  new_status public.registration_status;
  result public.registrations;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'bad_answers' using errcode = 'P0001';
  end if;

  -- Lock the offering row so two people can't take the last seat at the same time.
  select * into o from public.offerings where slug = p_slug for update;
  if not found or o.status <> 'published' then
    raise exception 'not_open' using errcode = 'P0001';
  end if;
  if (o.registration_opens_at is not null and o.registration_opens_at > now())
     or (o.registration_closes_at is not null and o.registration_closes_at <= now())
     or (o.ends_at is not null and o.ends_at < now()) then
    raise exception 'not_open' using errcode = 'P0001';
  end if;

  select kind into k from public.offering_types where id = o.type_id;

  select * into existing from public.registrations where offering_id = o.id and user_id = uid;
  if found and existing.status <> 'cancelled' then
    raise exception 'already_registered' using errcode = 'P0001';
  end if;

  if k = 'course' then
    new_status := 'submitted';
  else
    select count(*) into taken from public.registrations
      where offering_id = o.id and status in ('confirmed', 'attended');
    new_status := case when o.capacity is null or taken < o.capacity then 'confirmed' else 'waitlisted' end;
  end if;

  if existing.id is not null then
    update public.registrations
      set status = new_status, answers = p_answers, submitted_at = now(),
          ticket_code = case when o.qr_tickets_enabled then coalesce(ticket_code, public.generate_ticket_code()) else ticket_code end,
          checked_in_at = null, checked_in_by = null
      where id = existing.id
      returning * into result;
  else
    insert into public.registrations (offering_id, user_id, status, answers, ticket_code)
      values (o.id, uid, new_status, p_answers,
              case when o.qr_tickets_enabled then public.generate_ticket_code() end)
      returning * into result;
  end if;

  return result;
end $$;

create or replace function public.cancel_registration(p_registration_id uuid)
returns public.registrations
language plpgsql security definer set search_path = public as $$
declare
  r public.registrations;
  o public.offerings;
  next_in_line uuid;
begin
  update public.registrations set status = 'cancelled'
    where id = p_registration_id and user_id = auth.uid() and status in ('submitted', 'confirmed', 'waitlisted')
    returning * into r;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  -- A seat opened up: move the earliest waitlisted person up.
  select * into o from public.offerings where id = r.offering_id for update;
  if o.capacity is not null then
    select id into next_in_line from public.registrations
      where offering_id = o.id and status = 'waitlisted'
      order by submitted_at limit 1;
    if next_in_line is not null and
       (select count(*) from public.registrations where offering_id = o.id and status in ('confirmed', 'attended')) < o.capacity then
      update public.registrations set status = 'confirmed' where id = next_in_line;
    end if;
  end if;

  return r;
end $$;

-- Seats left, readable by anyone viewing a published event (counts only, no personal data).
create or replace function public.seats_taken(p_offering_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.registrations
  where offering_id = p_offering_id and status in ('confirmed', 'attended')
    and public.offering_is_public(p_offering_id);
$$;

-- Users no longer insert registrations directly: everything goes through register_for_offering.
drop policy if exists "registrations: register self while open" on public.registrations;
create policy "registrations: admin insert" on public.registrations
  for insert with check (public.is_admin());

revoke execute on function public.register_for_offering(text, jsonb) from public, anon;
revoke execute on function public.cancel_registration(uuid) from public, anon;
revoke execute on function public.generate_ticket_code() from public, anon, authenticated;
grant execute on function public.register_for_offering(text, jsonb) to authenticated;
grant execute on function public.cancel_registration(uuid) to authenticated;
grant execute on function public.seats_taken(uuid) to anon, authenticated;
