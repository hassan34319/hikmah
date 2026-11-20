-- Hikmah platform: foundation schema
-- Profiles, roles, offerings (courses + events), field library, per-offering forms, registrations.
-- Every table has row level security on. Admin checks go through public.is_admin().

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('super_admin', 'admin', 'faculty', 'student', 'interviewer', 'volunteer');
create type public.occupation_type as enum ('student', 'professional', 'both', 'other');
create type public.offering_kind as enum ('course', 'event');
create type public.offering_status as enum ('draft', 'published', 'closed', 'archived');
create type public.registration_status as enum ('submitted', 'confirmed', 'waitlisted', 'cancelled', 'attended', 'no_show');
create type public.field_type as enum (
  'short_text', 'long_text', 'email', 'phone', 'number', 'date',
  'single_select', 'multi_select', 'checkbox', 'file', 'url'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user, created automatically on sign up)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  whatsapp text,
  date_of_birth date,
  occupation_type public.occupation_type,
  university text,
  degree text,
  year_of_study text,
  company text,
  job_title text,
  address_line text,
  area text,
  city text default 'Karachi',
  country text default 'Pakistan',
  interests text[] not null default '{}',
  heard_from text,
  email_opt_in boolean not null default true,
  whatsapp_opt_in boolean not null default false,
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_phone_format check (phone is null or phone ~ '^\+?[0-9]{10,15}$')
);

create unique index profiles_email_key on public.profiles (lower(email));
create unique index profiles_phone_key on public.profiles (phone) where phone is not null;
create index profiles_city_area_idx on public.profiles (city, area);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_role(check_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = check_role);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('super_admin', 'admin')
  );
$$;

-- Users must not be able to edit fields that only admins or the system set.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    new.id = old.id;
    new.email = old.email;
    new.created_at = old.created_at;
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- Venues and offering types
-- ---------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  area text,
  city text not null default 'Karachi',
  map_url text,
  created_at timestamptz not null default now()
);

create table public.offering_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind public.offering_kind not null,
  description text,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Offerings: one table for courses and events
-- ---------------------------------------------------------------------------
create table public.offerings (
  id uuid primary key default gen_random_uuid(),
  type_id uuid not null references public.offering_types (id),
  slug text not null unique,
  title text not null,
  subtitle text,
  summary text,
  description text,
  poster_url text,
  speaker text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue_id uuid references public.venues (id) on delete set null,
  location_text text,
  is_online boolean not null default false,
  capacity int check (capacity is null or capacity > 0),
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  status public.offering_status not null default 'draft',
  pinned boolean not null default false,
  sort_order int not null default 0,
  qr_tickets_enabled boolean not null default false,
  send_confirmation_email boolean not null default true,
  created_by uuid references auth.users (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offerings_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint offerings_dates check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index offerings_listing_idx on public.offerings (status, pinned desc, sort_order, created_at desc);
create index offerings_type_idx on public.offerings (type_id);
create index offerings_starts_idx on public.offerings (starts_at);

create trigger offerings_updated_at before update on public.offerings
  for each row execute function public.set_updated_at();

create or replace function public.offering_is_public(oid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.offerings where id = oid and status in ('published', 'closed'));
$$;

-- Course specific details (outline, duration, fees)
create table public.course_details (
  offering_id uuid primary key references public.offerings (id) on delete cascade,
  code text unique,
  duration_label text,
  duration_months int,
  level text,
  schedule_text text,
  fee_text text,
  eligibility text,
  intake_label text,
  outcomes text[] not null default '{}'
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  position int not null,
  title text not null,
  description text,
  unique (offering_id, position)
);

-- ---------------------------------------------------------------------------
-- Field library and per-offering forms
-- ---------------------------------------------------------------------------
create table public.fields (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  type public.field_type not null,
  options jsonb not null default '[]'::jsonb,
  help_text text,
  placeholder text,
  -- When set, the form prefills from this profiles column and can write back to it.
  profile_column text,
  is_system boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  constraint fields_key_format check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint fields_options_array check (jsonb_typeof(options) = 'array')
);

create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  field_id uuid not null references public.fields (id) on delete restrict,
  position int not null,
  required boolean not null default false,
  label_override text,
  help_override text,
  unique (offering_id, field_id)
);

create index form_fields_offering_idx on public.form_fields (offering_id, position);

-- ---------------------------------------------------------------------------
-- Registrations
-- ---------------------------------------------------------------------------
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.registration_status not null default 'submitted',
  answers jsonb not null default '{}'::jsonb,
  ticket_code text unique,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users (id),
  admin_notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offering_id, user_id),
  constraint registrations_answers_object check (jsonb_typeof(answers) = 'object')
);

create index registrations_user_idx on public.registrations (user_id);
create index registrations_offering_status_idx on public.registrations (offering_id, status);

create trigger registrations_updated_at before update on public.registrations
  for each row execute function public.set_updated_at();

-- Registration is allowed only while the offering is published and its window is open.
create or replace function public.registration_open(oid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.offerings
    where id = oid
      and status = 'published'
      and (registration_opens_at is null or registration_opens_at <= now())
      and (registration_closes_at is null or registration_closes_at > now())
  );
$$;

-- Non-admins can only cancel their own registration; everything else is admin only.
create or replace function public.protect_registration_columns()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
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

create trigger registrations_protect before update on public.registrations
  for each row execute function public.protect_registration_columns();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.venues enable row level security;
alter table public.offering_types enable row level security;
alter table public.offerings enable row level security;
alter table public.course_details enable row level security;
alter table public.course_modules enable row level security;
alter table public.fields enable row level security;
alter table public.form_fields enable row level security;
alter table public.registrations enable row level security;

-- profiles
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles: update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy "profiles: admin delete" on public.profiles
  for delete using (public.is_admin());

-- user_roles
create policy "roles: read own or admin" on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());
create policy "roles: super admin manages" on public.user_roles
  for all using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- public catalogue tables
create policy "venues: public read" on public.venues for select using (true);
create policy "venues: admin write" on public.venues for all using (public.is_admin()) with check (public.is_admin());

create policy "offering_types: public read" on public.offering_types for select using (true);
create policy "offering_types: admin write" on public.offering_types for all using (public.is_admin()) with check (public.is_admin());

create policy "offerings: public read published" on public.offerings
  for select using (status in ('published', 'closed') or public.is_admin());
create policy "offerings: admin write" on public.offerings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "course_details: read with offering" on public.course_details
  for select using (public.offering_is_public(offering_id) or public.is_admin());
create policy "course_details: admin write" on public.course_details
  for all using (public.is_admin()) with check (public.is_admin());

create policy "course_modules: read with offering" on public.course_modules
  for select using (public.offering_is_public(offering_id) or public.is_admin());
create policy "course_modules: admin write" on public.course_modules
  for all using (public.is_admin()) with check (public.is_admin());

create policy "fields: public read" on public.fields for select using (true);
create policy "fields: admin write" on public.fields for all using (public.is_admin()) with check (public.is_admin());

create policy "form_fields: read with offering" on public.form_fields
  for select using (public.offering_is_public(offering_id) or public.is_admin());
create policy "form_fields: admin write" on public.form_fields
  for all using (public.is_admin()) with check (public.is_admin());

-- registrations
create policy "registrations: read own or admin" on public.registrations
  for select using (user_id = auth.uid() or public.is_admin());
create policy "registrations: register self while open" on public.registrations
  for insert with check (
    (user_id = auth.uid() and status = 'submitted' and public.registration_open(offering_id))
    or public.is_admin()
  );
create policy "registrations: update own or admin" on public.registrations
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "registrations: admin delete" on public.registrations
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants (Supabase roles)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.venues, public.offering_types, public.offerings, public.course_details,
  public.course_modules, public.fields, public.form_fields to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
