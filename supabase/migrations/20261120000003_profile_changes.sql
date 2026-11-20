-- Profile changes requested by the team (Faheem bhai):
--   * one phone number only, which is the WhatsApp number (stored in `phone`)
--   * gender and CNIC (optional; a B-Form number has the same format)
--   * university, degree and year asked of everyone, not only students
--   * up to 5 interests
--   * city and country dropped: everyone is in Karachi

create type public.gender as enum ('male', 'female');

alter table public.profiles
  add column gender public.gender,
  add column cnic text,
  drop column whatsapp,
  drop column country,
  drop column city;

alter table public.profiles rename column year_of_study to education_year;

comment on column public.profiles.phone is 'WhatsApp number, normalised to +92XXXXXXXXXX. The only phone number we keep.';
comment on column public.profiles.cnic is 'Optional. CNIC or B-Form, stored as 12345-1234567-1. One account per CNIC.';
comment on column public.profiles.education_year is 'Current year for students, graduation year for everyone else.';

alter table public.profiles
  add constraint profiles_cnic_format check (cnic is null or cnic ~ '^[0-9]{5}-[0-9]{7}-[0-9]$'),
  add constraint profiles_interests_max_5 check (cardinality(interests) <= 5);

create unique index profiles_cnic_key on public.profiles (cnic) where cnic is not null;
create index profiles_area_idx on public.profiles (area);

-- Field library: the phone field is now the WhatsApp number; drop fields for removed columns.
update public.fields set label = 'WhatsApp number' where key = 'phone';
delete from public.form_fields where field_id in (select id from public.fields where key in ('whatsapp', 'city'));
delete from public.fields where key in ('whatsapp', 'city');

-- Existing accounts have no gender yet: send them through the profile form once more.
update public.profiles set profile_completed_at = null where gender is null;
