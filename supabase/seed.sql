-- Seed data for local development and first launch.
-- PLACEHOLDERS: course codes, fees, schedules, descriptions and the two sample events are
-- stand-ins until the Hikmah team confirms the real wording. Search for "[" to find them.

insert into public.offering_types (slug, name, kind, description, sort_order) values
  ('course',     'Course',     'course', 'Structured programs with admissions', 0),
  ('seminar',    'Seminar',    'event',  'Talks and lectures',                   1),
  ('workshop',   'Workshop',   'event',  'Hands-on sessions',                    2),
  ('halaqah',    'Halaqah',    'event',  'Study circles',                        3),
  ('conference', 'Conference', 'event',  'Multi-speaker events',                 4),
  ('khidmah',    'Khidmah',    'event',  'Service and community drives',         5)
on conflict (slug) do nothing;

insert into public.venues (id, name, area, city, address) values
  ('00000000-0000-4000-8000-000000000001', 'Hikmah Institute, Main campus', '[Area]', 'Karachi', '[Campus address]')
on conflict (id) do nothing;

-- Courses ------------------------------------------------------------------
with t as (select id from public.offering_types where slug = 'course')
insert into public.offerings (id, type_id, slug, title, subtitle, summary, status, pinned, sort_order, venue_id, published_at)
select v.id::uuid, t.id, v.slug, v.title, v.subtitle, v.summary, 'published', v.pinned, v.sort_order,
       '00000000-0000-4000-8000-000000000001', now()
from t, (values
  ('10000000-0000-4000-8000-000000000001', 'quranic-sciences',       'Quranic Sciences',          '1 year',  '[Short description of the Quranic Sciences program]',          false, 1),
  ('10000000-0000-4000-8000-000000000002', 'quranic-reflections',    'Quranic Reflections',       '2 years', '[Short description of the Quranic Reflections program]',       false, 2),
  ('10000000-0000-4000-8000-000000000003', 'quran-and-hadith',       'Quran and Hadith Diploma',  '4 years', '[Short description of the Quran and Hadith Diploma]',          false, 3),
  ('10000000-0000-4000-8000-000000000004', 'darse-nizami',           'Darse Nizami',              '8 years', '[Short description of the Darse Nizami program]',             true,  0)
) as v(id, slug, title, subtitle, summary, pinned, sort_order)
on conflict (slug) do nothing;

insert into public.course_details (offering_id, code, duration_label, duration_months, schedule_text, fee_text, intake_label) values
  ('10000000-0000-4000-8000-000000000001', '[QS]', '1 year',  12, '[Schedule]', '[Fee]', '[Next intake]'),
  ('10000000-0000-4000-8000-000000000002', '[QR]', '2 years', 24, '[Schedule]', '[Fee]', '[Next intake]'),
  ('10000000-0000-4000-8000-000000000003', '[QH]', '4 years', 48, '[Schedule]', '[Fee]', '[Next intake]'),
  ('10000000-0000-4000-8000-000000000004', '[DN]', '8 years', 96, '[Schedule]', '[Fee]', '[Next intake]')
on conflict (offering_id) do nothing;

insert into public.course_modules (offering_id, position, title) values
  ('10000000-0000-4000-8000-000000000004', 1, '[Module 1 title]'),
  ('10000000-0000-4000-8000-000000000004', 2, '[Module 2 title]'),
  ('10000000-0000-4000-8000-000000000004', 3, '[Module 3 title]')
on conflict do nothing;

-- Sample events ------------------------------------------------------------
insert into public.offerings (id, type_id, slug, title, summary, speaker, starts_at, ends_at, venue_id, status, sort_order, published_at)
select v.id::uuid, (select id from public.offering_types where slug = v.type_slug), v.slug, v.title, v.summary, v.speaker,
       now() + v.offset_days * interval '1 day', now() + v.offset_days * interval '1 day' + interval '2 hours',
       '00000000-0000-4000-8000-000000000001', 'published', 0, now()
from (values
  ('20000000-0000-4000-8000-000000000001', 'seminar',  'blessed-yet-unhappy',  'Blessed, Yet Unhappy?', '[Event summary]', '[Speaker]', 10),
  ('20000000-0000-4000-8000-000000000002', 'workshop', 'the-distraction-loop', 'The Distraction Loop',  '[Event summary]', '[Speaker]', 17)
) as v(id, type_slug, slug, title, summary, speaker, offset_days)
on conflict (slug) do nothing;

-- Field library -------------------------------------------------------------
-- System fields prefill from the profile (profile_column). Custom fields are reused across forms.
insert into public.fields (key, label, type, options, profile_column, is_system) values
  ('full_name',       'Full name',            'short_text', '[]', 'full_name',       true),
  ('email',           'Email',                'email',      '[]', 'email',           true),
  ('phone',           'Phone number',         'phone',      '[]', 'phone',           true),
  ('whatsapp',        'WhatsApp number',      'phone',      '[]', 'whatsapp',        true),
  ('date_of_birth',   'Date of birth',        'date',       '[]', 'date_of_birth',   true),
  ('occupation_type', 'I am a',               'single_select', '["student","professional","both","other"]', 'occupation_type', true),
  ('university',      'University',           'short_text', '[]', 'university',      true),
  ('company',         'Company',              'short_text', '[]', 'company',         true),
  ('area',            'Area',                 'short_text', '[]', 'area',            true),
  ('city',            'City',                 'short_text', '[]', 'city',            true),
  ('prior_study',     'Have you studied at Hikmah before?', 'single_select', '["No","Yes, a course","Yes, events only"]', null, false),
  ('why_join',        'Why do you want to join?',           'long_text',     '[]', null, false),
  ('heard_from',      'How did you hear about this?',       'single_select', '["WhatsApp","Instagram","Friend or family","University","Other"]', null, false)
on conflict (key) do nothing;

-- Attach a default form to each sample event.
insert into public.form_fields (offering_id, field_id, position, required)
select o.id, f.id, f.pos, f.req
from public.offerings o
cross join (
  select id, case key when 'full_name' then 1 when 'email' then 2 when 'phone' then 3 when 'occupation_type' then 4 when 'heard_from' then 5 end as pos,
         key in ('full_name', 'email', 'phone') as req
  from public.fields where key in ('full_name', 'email', 'phone', 'occupation_type', 'heard_from')
) f
where o.slug in ('blessed-yet-unhappy', 'the-distraction-loop')
on conflict (offering_id, field_id) do nothing;

-- Course application form.
insert into public.form_fields (offering_id, field_id, position, required)
select o.id, f.id, f.pos, true
from public.offerings o
cross join (
  select id, case key when 'full_name' then 1 when 'email' then 2 when 'phone' then 3 when 'date_of_birth' then 4 when 'prior_study' then 5 when 'why_join' then 6 end as pos
  from public.fields where key in ('full_name', 'email', 'phone', 'date_of_birth', 'prior_study', 'why_join')
) f
where o.type_id = (select id from public.offering_types where slug = 'course')
on conflict (offering_id, field_id) do nothing;
