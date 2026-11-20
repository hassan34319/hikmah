-- People and targeting.
--   people_search(rules)  -> everyone matching profile filters and event-history rules (admins only)
--   segments              -> saved groups (rules stored, so they update as new people match)
--   campaigns             -> invites sent to a group for an event, with who received them
--   staff management      -> list staff and grant or remove roles by email (super admins only)

create table public.segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rules jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint segments_rules_object check (jsonb_typeof(rules) = 'object')
);
create trigger segments_updated_at before update on public.segments for each row execute function public.set_updated_at();

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid references public.offerings (id) on delete set null,
  segment_id uuid references public.segments (id) on delete set null,
  rules jsonb not null default '{}'::jsonb,
  subject text not null,
  message text,
  recipient_count int not null default 0,
  sent_count int not null default 0,
  sent_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.campaign_recipients (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  primary key (campaign_id, user_id)
);
create index campaign_recipients_user_idx on public.campaign_recipients (user_id);

alter table public.segments enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_recipients enable row level security;
create policy "segments: admin" on public.segments for all using (public.is_admin()) with check (public.is_admin());
create policy "campaigns: admin" on public.campaigns for all using (public.is_admin()) with check (public.is_admin());
create policy "campaign_recipients: admin" on public.campaign_recipients for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.segments, public.campaigns, public.campaign_recipients to authenticated;

-- Rules (all optional):
--   q, areas[], interests[], occupations[], genders[], age_min, age_max, email_opt_in, whatsapp_opt_in,
--   applied_course ('yes' | 'no'),
--   events: [{ mode: 'registered' | 'checked_in' | 'feedback' | 'not_registered',
--              offering_ids[], type_slugs[], series, venue_ids[], since, until, min_count }]
create or replace function public.people_search(p_rules jsonb)
returns table (
  user_id uuid, full_name text, email text, phone text, area text, occupation_type public.occupation_type,
  gender public.gender, interests text[], email_opt_in boolean, whatsapp_opt_in boolean, joined_at timestamptz,
  registrations int, last_registered_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb := coalesce(p_rules, '{}'::jsonb);
  arr_areas text[] := array(select lower(trim(x)) from jsonb_array_elements_text(coalesce(r->'areas', '[]')) x where trim(x) <> '');
  arr_interests text[] := array(select jsonb_array_elements_text(coalesce(r->'interests', '[]')));
  arr_occ text[] := array(select jsonb_array_elements_text(coalesce(r->'occupations', '[]')));
  arr_gender text[] := array(select jsonb_array_elements_text(coalesce(r->'genders', '[]')));
  q text := nullif(trim(coalesce(r->>'q', '')), '');
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;

  return query
  with stats as (
    select rg.user_id as uid, count(*)::int as n, max(rg.submitted_at) as last_at
    from public.registrations rg where rg.status <> 'cancelled' group by rg.user_id
  )
  select p.id, p.full_name, p.email, p.phone, p.area, p.occupation_type, p.gender, p.interests,
         p.email_opt_in, p.whatsapp_opt_in, p.created_at, coalesce(s.n, 0), s.last_at
  from public.profiles p
  left join stats s on s.uid = p.id
  where p.profile_completed_at is not null
    and (q is null or p.full_name ilike '%' || q || '%' or p.email ilike '%' || q || '%' or p.phone like '%' || regexp_replace(q, '\D', '', 'g') || '%')
    and (cardinality(arr_areas) = 0 or exists (select 1 from unnest(arr_areas) a where lower(coalesce(p.area, '')) like '%' || a || '%'))
    and (cardinality(arr_interests) = 0 or p.interests && arr_interests)
    and (cardinality(arr_occ) = 0 or p.occupation_type::text = any (arr_occ))
    and (cardinality(arr_gender) = 0 or p.gender::text = any (arr_gender))
    and (r->>'age_min' is null or p.date_of_birth <= (current_date - make_interval(years => (r->>'age_min')::int)))
    and (r->>'age_max' is null or p.date_of_birth > (current_date - make_interval(years => (r->>'age_max')::int + 1)))
    and (r->>'email_opt_in' is null or p.email_opt_in = (r->>'email_opt_in')::boolean)
    and (r->>'whatsapp_opt_in' is null or p.whatsapp_opt_in = (r->>'whatsapp_opt_in')::boolean)
    and (coalesce(r->>'applied_course', '') = '' or
         (exists (select 1 from public.registrations rc join public.offerings oc on oc.id = rc.offering_id
                  join public.offering_types tc on tc.id = oc.type_id
                  where rc.user_id = p.id and tc.kind = 'course' and rc.status <> 'cancelled')) = (r->>'applied_course' = 'yes'))
    -- Every event rule must hold.
    and not exists (
      select 1 from jsonb_array_elements(coalesce(r->'events', '[]')) e
      where (
        select count(*) from public.registrations re
        join public.offerings o on o.id = re.offering_id
        join public.offering_types t on t.id = o.type_id
        where re.user_id = p.id and re.status <> 'cancelled'
          and (jsonb_array_length(coalesce(e->'offering_ids', '[]')) = 0 or o.id::text in (select jsonb_array_elements_text(e->'offering_ids')))
          and (jsonb_array_length(coalesce(e->'type_slugs', '[]')) = 0 or t.slug in (select jsonb_array_elements_text(e->'type_slugs')))
          and (jsonb_array_length(coalesce(e->'venue_ids', '[]')) = 0 or o.venue_id::text in (select jsonb_array_elements_text(e->'venue_ids')))
          and (coalesce(e->>'series', '') = '' or o.subtitle ilike '%' || (e->>'series') || '%' or o.title ilike '%' || (e->>'series') || '%')
          and (coalesce(e->>'since', '') = '' or coalesce(o.starts_at, re.submitted_at) >= (e->>'since')::date)
          and (coalesce(e->>'until', '') = '' or coalesce(o.starts_at, re.submitted_at) < (e->>'until')::date + 1)
          and (e->>'mode' <> 'checked_in' or re.checked_in_at is not null)
          and (e->>'mode' <> 'feedback' or exists (select 1 from public.feedback_responses fr where fr.registration_id = re.id))
      ) < case when e->>'mode' = 'not_registered' then 0 else greatest(coalesce((e->>'min_count')::int, 1), 1) end
      or (e->>'mode' = 'not_registered' and exists (
        select 1 from public.registrations rn join public.offerings o2 on o2.id = rn.offering_id
        where rn.user_id = p.id and rn.status <> 'cancelled'
          and o2.id::text in (select jsonb_array_elements_text(coalesce(e->'offering_ids', '[]')))))
    )
  order by s.last_at desc nulls last, p.created_at desc;
end $$;

-- Staff list for the Admins page (admins can view; super admins can change).
create or replace function public.staff_list()
returns table (user_id uuid, email text, full_name text, roles text[])
language sql stable security definer set search_path = public as $$
  select u.id, u.email::text, p.full_name, array_agg(ur.role::text order by ur.role)
  from public.user_roles ur
  join auth.users u on u.id = ur.user_id
  left join public.profiles p on p.id = u.id
  where public.is_admin()
  group by u.id, u.email, p.full_name
  order by p.full_name nulls last;
$$;

create or replace function public.staff_set_role(p_email text, p_role public.app_role, p_grant boolean)
returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  if not public.has_role('super_admin') then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'no_account' using errcode = 'P0001';
  end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (uid, p_role, auth.uid()) on conflict do nothing;
  else
    if uid = auth.uid() and p_role = 'super_admin' then
      raise exception 'cannot_remove_self' using errcode = 'P0001';
    end if;
    delete from public.user_roles where user_id = uid and role = p_role;
  end if;
  return 'ok';
end $$;

revoke execute on function public.people_search(jsonb) from public, anon;
revoke execute on function public.staff_list() from public, anon;
revoke execute on function public.staff_set_role(text, public.app_role, boolean) from public, anon;
grant execute on function public.people_search(jsonb) to authenticated;
grant execute on function public.staff_list() to authenticated;
grant execute on function public.staff_set_role(text, public.app_role, boolean) to authenticated;
