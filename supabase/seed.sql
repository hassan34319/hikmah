-- Seed data so the site looks real during development.
-- Course descriptions, schedules, outlines, campuses and talk titles come from hikmahinstitute.org.pk.
-- Safe to run more than once: it updates existing rows instead of failing.
--
-- PLACEHOLDERS (marked with [brackets]): course codes, fees, next intake dates.
-- SAMPLE DATA: event dates, seat limits and event summaries are made up for the demo.
-- Posters point to images bundled in apps/web/public/seed (photos from Hikmah's own site).

-- Event types ---------------------------------------------------------------
insert into public.offering_types (slug, name, kind, description, sort_order) values
  ('course',     'Course',     'course', 'Structured programs with admissions', 0),
  ('seminar',    'Seminar',    'event',  'Talks and lectures',                   1),
  ('workshop',   'Workshop',   'event',  'Hands-on sessions',                    2),
  ('halaqah',    'Halaqah',    'event',  'Study circles',                        3),
  ('conference', 'Conference', 'event',  'Multi-speaker events',                 4),
  ('khidmah',    'Khidmah',    'event',  'Service and community drives',         5)
on conflict (slug) do update set name = excluded.name, kind = excluded.kind,
  description = excluded.description, sort_order = excluded.sort_order;

-- Campuses ------------------------------------------------------------------
insert into public.venues (id, name, address, area, city, map_url) values
  ('00000000-0000-4000-8000-000000000001', 'Main Campus', '150-A, Sindhi Muslim Society, Block A', 'Sindhi Muslim Society', 'Karachi', 'https://maps.app.goo.gl/p6NVEjvU899cKguW6'),
  ('00000000-0000-4000-8000-000000000002', 'DHA Campus',  '66-A Faisal Street 2, D.H.A. Phase 8',  'DHA Phase 8',           'Karachi', 'https://maps.app.goo.gl/CoFGGhRfKWkHJ88Q7')
on conflict (id) do update set name = excluded.name, address = excluded.address, area = excluded.area,
  city = excluded.city, map_url = excluded.map_url;

-- Courses -------------------------------------------------------------------
insert into public.offerings (id, type_id, slug, title, subtitle, summary, description, poster_url, venue_id, status, pinned, sort_order, published_at)
select v.id::uuid, (select id from public.offering_types where slug = 'course'), v.slug, v.title, v.subtitle, v.summary, v.description,
       v.poster, '00000000-0000-4000-8000-000000000001', 'published', v.pinned, v.sort_order, now()
from (values
  ('10000000-0000-4000-8000-000000000004', 'darse-nizami', 'Darse Nizami', '8 years',
   'Our flagship programme on the traditional Dars-e-Nizami syllabus, built for students and working professionals.',
   E'A flagship programme at Hikmah Institute based on the traditional Dars-e-Nizami syllabus. It is designed for college and university students and professionals who want in-depth Islamic knowledge alongside their academic or professional work.\n\nThe programme connects traditional Islamic scholarship with contemporary life, preparing scholars who can address current issues and serve the ummah. Classes are bilingual (Urdu and English) and run at both campuses.',
   '/seed/course-darse-nizami.jpg', true, 0),
  ('10000000-0000-4000-8000-000000000001', 'quranic-sciences', 'Quranic Sciences', '1 year',
   'Quranic Arabic, Tajweed, Tafseer and Seerah in two semesters, with mentoring along the way.',
   E'A two-semester course covering Quranic Arabic, Tajweed, Tafseer and the Seerah of the Prophet Muhammad ﷺ. It aims to deepen your understanding of the Quran, strengthen core Islamic beliefs, and support personal development through mentoring and individual counseling.\n\nBy the end of the first semester you will understand 40 to 50% of Quranic words, and 70 to 80% by the end of the second.',
   '/seed/course-quranic-sciences.jpg', false, 1),
  ('10000000-0000-4000-8000-000000000002', 'quranic-reflections', 'Quranic Reflections', '2 years',
   'A weekly, reflective study of the Quran and Sunnah for men aged 40 and above.',
   E'A practical, reflective study of the Quran and Sunnah, focusing on what matters most in later life: Tafsir, Hadith, and the Fiqh of financial transactions.\n\nDesigned for professionals, business owners and retirees aged 40 and above. Classes are held once a week on Saturday evenings.',
   '/seed/course-quranic-reflections.jpg', false, 2),
  ('10000000-0000-4000-8000-000000000003', 'quran-and-hadith', 'Quran and Hadith Diploma', '4 years',
   'A structured, principled understanding of Islam, and the tools to engage modern ideas with clarity.',
   E'The Quran and Hadith Diploma (QHD) is a four-year, comprehensive programme designed to give learners a structured and principled understanding of Islam.\n\nThrough the Quran, Hadith and classical Islamic disciplines, it builds intellectual depth and analytical clarity, and prepares students to engage the intellectual challenges of the modern and post-modern world.',
   '/seed/course-quran-hadith.jpg', false, 3)
) as v(id, slug, title, subtitle, summary, description, poster, pinned, sort_order)
on conflict (slug) do update set title = excluded.title, subtitle = excluded.subtitle, summary = excluded.summary,
  description = excluded.description, poster_url = excluded.poster_url, venue_id = excluded.venue_id,
  pinned = excluded.pinned, sort_order = excluded.sort_order, status = 'published';

insert into public.course_details (offering_id, code, duration_label, duration_months, level, schedule_text, fee_text, eligibility, intake_label, outcomes) values
  ('10000000-0000-4000-8000-000000000004', '[DN]', '8 years', 96, 'Advanced',
   E'Weekday: Tue and Wed, 7:00pm to 9:30pm\nWeekend batch 1: Sat and Sun, 7:00am to 9:30am\nWeekend batch 2: Sat and Sun, 2:00pm to 4:30pm',
   '[Fee]', 'Men. Students and working professionals.', '[Next intake]',
   array['Understanding of Tafsir and Hadith across multiple levels', 'Knowledge of Fiqh and its application',
         'Arabic grammar: syntax, morphology and rhetoric', 'Foundations in Usul al-Fiqh and Usul al-Hadith',
         'Islamic philosophy, theology and logic', 'Advanced Arabic literature and creative writing',
         'Inheritance laws and astronomy within an Islamic framework', 'Preparation for Daura-e-Hadith']),
  ('10000000-0000-4000-8000-000000000001', '[QS]', '1 year', 12, 'Foundation',
   E'Weekday: Mon and Wed, 7:00pm to 9:30pm\nWeekend batch 1: Sat and Sun, 7:00am to 9:30am\nWeekend batch 2: Sat and Sun, 2:00pm to 4:30pm',
   '[Fee]', 'Men.', '[Next intake]',
   array['Proficiency in Quranic Arabic', 'Tajweed for accurate recitation', 'In-depth understanding and application of Tafseer',
         'Comprehensive knowledge of the Seerah', 'Core Islamic beliefs and their practical implementation',
         'Personal development through mentoring and individual counseling']),
  ('10000000-0000-4000-8000-000000000002', '[QR]', '2 years', 24, 'Foundation',
   'Saturdays, 7:00pm to 9:30pm', '[Fee]', 'Men aged 40 and above: professionals, business owners and retirees.', '[Next intake]',
   array['Foundational understanding of Quranic Arabic', 'The meanings and wisdom of the Quran through practical Tafsir',
         'A deeper appreciation of the life and character of the Prophet ﷺ', 'Proper Quran recitation and improved Salah',
         'Islamic financial principles for Shariah-compliant dealings', 'Inspiration from Islamic history for modern life']),
  ('10000000-0000-4000-8000-000000000003', '[QHD]', '4 years', 48, 'Intermediate',
   'Tue to Thu, 7:00pm to 10:00pm', '[Fee]', 'Men.', '[Next intake]',
   array['A structured, coherent understanding of the Quran and Hadith', 'Classical Islamic thought and critical engagement with modern ideologies',
         'Confidence answering modern debates, doubts and misconceptions', 'Spiritual discipline, ethical clarity and personal responsibility',
         'A foundation for advanced Islamic scholarship and research'])
on conflict (offering_id) do update set code = excluded.code, duration_label = excluded.duration_label,
  duration_months = excluded.duration_months, level = excluded.level, schedule_text = excluded.schedule_text,
  fee_text = excluded.fee_text, eligibility = excluded.eligibility, intake_label = excluded.intake_label, outcomes = excluded.outcomes;

-- Course outlines (replaced on every run)
delete from public.course_modules where offering_id in (
  '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004');

insert into public.course_modules (offering_id, position, title, description) values
  ('10000000-0000-4000-8000-000000000004', 1, 'Year 1', 'Tafsir I, Hadith I, Fiqh I, Arabic Language I, Arabic Syntax I, Arabic Morphology I'),
  ('10000000-0000-4000-8000-000000000004', 2, 'Year 2', 'Tafsir II, Hadith II, Tajweed, Arabic Creative Writing, Arabic Syntax II, Arabic Morphology II, Logic I'),
  ('10000000-0000-4000-8000-000000000004', 3, 'Year 3', 'Tafsir III, Hadith III, Fiqh II, Arabic Language II, Arabic Syntax III, Usul al-Fiqh I, Logic II, Arabic Creative Writing'),
  ('10000000-0000-4000-8000-000000000004', 4, 'Year 4', 'Tafsir IV, Hadith IV, Fiqh III, Arabic Language III, Arabic Syntax IV, Usul al-Fiqh II, Logic III, Arabic Literature I, Arabic Rhetoric'),
  ('10000000-0000-4000-8000-000000000004', 5, 'Year 5', 'Tafsir V, Philosophy and Theology, Fiqh IV, Arabic Rhetoric, Arabic Literature II, Usul al-Fiqh III'),
  ('10000000-0000-4000-8000-000000000004', 6, 'Year 6', 'Tafsir VI, Hadith V, Fiqh V, Usul al-Hadith I, Arabic Literature III, Usul al-Fiqh IV, Usul al-Tafsir, Inheritance Laws, Theology I, Astronomy'),
  ('10000000-0000-4000-8000-000000000004', 7, 'Year 7', 'Tafsir VII, Hadith VI, Fiqh VI, Usul al-Hadith II, Uloom al-Quran, Theology II'),
  ('10000000-0000-4000-8000-000000000004', 8, 'Year 8', 'Daura-e-Hadith'),

  ('10000000-0000-4000-8000-000000000001', 1, 'Semester 1: Quranic Arabic I', 'Core Arabic morphology, covering 40 to 50% of Quranic words'),
  ('10000000-0000-4000-8000-000000000001', 2, 'Semester 1: Tafsir', 'Surah Yusuf and Surah Kahf'),
  ('10000000-0000-4000-8000-000000000001', 3, 'Semester 1: Hadith I', 'Selected ahadith from Zad ut-Talibeen'),
  ('10000000-0000-4000-8000-000000000001', 4, 'Semester 1: Tajweed I', 'Tajweed concepts, rules and letter articulation'),
  ('10000000-0000-4000-8000-000000000001', 5, 'Semester 1: Spoken Arabic', 'Conversational Modern Standard Arabic and basic colloquial vocabulary'),
  ('10000000-0000-4000-8000-000000000001', 6, 'Semester 1: Deen Essentials I', 'Fundamentals of Islam, with a focus on self-purification and self-reformation'),
  ('10000000-0000-4000-8000-000000000001', 7, 'Semester 1: Navigation Through History', 'Lives of the prophets before Muhammad ﷺ'),
  ('10000000-0000-4000-8000-000000000001', 8, 'Semester 2: Quranic Arabic II', 'Deeper Arabic grammar, covering 70 to 80% of Quranic words'),
  ('10000000-0000-4000-8000-000000000001', 9, 'Semester 2: Tafsir', 'Surah Yasin, Surah Waqia, Surah Mulk and Surah Alif Laam Meem Sajda'),
  ('10000000-0000-4000-8000-000000000001', 10, 'Semester 2: Hadith II', 'Selected ahadith from Arba''een An-Nawawi'),
  ('10000000-0000-4000-8000-000000000001', 11, 'Semester 2: Tajweed II', 'Roots of letters and group recitation practice'),
  ('10000000-0000-4000-8000-000000000001', 12, 'Semester 2: Seerah', 'The Meccan period'),
  ('10000000-0000-4000-8000-000000000001', 13, 'Semester 2: Deen Essentials II', 'Core beliefs and self-development, continued'),

  ('10000000-0000-4000-8000-000000000002', 1, 'Quranic Arabic', 'Foundational grammar and vocabulary to engage with the Quran in its original language'),
  ('10000000-0000-4000-8000-000000000002', 2, 'Tafsir', 'The meanings of the Quran and how its message applies to daily life'),
  ('10000000-0000-4000-8000-000000000002', 3, 'Hadith and Seerah', 'The sayings, actions and approvals of the Prophet ﷺ, and his life and legacy'),
  ('10000000-0000-4000-8000-000000000002', 4, 'Tajweed and Salah', 'Recitation by the rules of Tajweed, and the form and spirit of prayer'),
  ('10000000-0000-4000-8000-000000000002', 5, 'Fiqh of Financial Transactions', 'Islamic rulings on commerce, trade and financial dealings'),
  ('10000000-0000-4000-8000-000000000002', 6, 'Deen Essentials I', 'Fundamentals of Islam, core beliefs and self-purification'),
  ('10000000-0000-4000-8000-000000000002', 7, 'Islamic History', 'Key events, figures and periods, with lessons for today'),

  ('10000000-0000-4000-8000-000000000003', 1, 'Quran, Hadith and Fiqh', 'The foundational Islamic sciences, with sound methodology and contextual understanding'),
  ('10000000-0000-4000-8000-000000000003', 2, 'Personal Development and Leadership', 'Inner reform, character, self-discipline, emotional intelligence and communication'),
  ('10000000-0000-4000-8000-000000000003', 3, 'Islamic History, Civilization and Politics', 'The lives of the Prophets, Islamic civilization and political thought'),
  ('10000000-0000-4000-8000-000000000003', 4, 'Modern Ideologies and Contemporary Issues', 'Critical engagement with secularism, materialism, liberalism and everyday ethical questions');

-- Events (SAMPLE: titles and speakers are real Hikmah talks, dates and details are made up) --------
delete from public.offerings where slug in ('blessed-yet-unhappy', 'the-distraction-loop');

insert into public.offerings (id, type_id, slug, title, subtitle, summary, description, speaker, poster_url,
  starts_at, ends_at, venue_id, capacity, status, sort_order, qr_tickets_enabled, published_at)
select v.id::uuid, (select id from public.offering_types where slug = v.type_slug), v.slug, v.title, v.subtitle, v.summary, v.description,
       v.speaker, v.poster,
       date_trunc('day', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi' + v.offset_days * interval '1 day' + v.start_time,
       date_trunc('day', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi' + v.offset_days * interval '1 day' + v.start_time + v.length,
       v.venue::uuid, v.capacity, 'published', 0, v.qr, now()
from (values
  ('20000000-0000-4000-8000-000000000001', 'seminar', 'the-economics-of-time', 'The Economics of Time', 'Feel Good Fridays',
   'Why time is the one investment we can never get back, and how to spend it like it matters.',
   E'Part of our Feel Good Fridays series. A talk on how we spend our hours, what the Quran and Sunnah teach about the value of time, and practical ways to stop losing our days to distraction.\n\nOpen to everyone. Brothers and sisters welcome.',
   'Maulana Dr. Muhammad Areeb Nafey', '/seed/event-economics-of-time.jpg', 7, interval '19 hours 30 minutes', interval '2 hours',
   '00000000-0000-4000-8000-000000000001', 400, false),
  ('20000000-0000-4000-8000-000000000002', 'seminar', 'extramarital-affairs', 'Extramarital Affairs: The Creeping Sin', 'Feel Good Fridays',
   'An honest conversation about a sin that is quietly spreading in our society, and how to guard our homes.',
   E'Part of our Feel Good Fridays series. How small compromises open the door, what Islam says about protecting the gaze and the marriage, and how families can rebuild trust.\n\nOpen to everyone.',
   'Maulana Shahzaib Aijaz', '/seed/event-extramarital-affairs.jpg', 14, interval '19 hours 30 minutes', interval '2 hours',
   '00000000-0000-4000-8000-000000000001', 400, false),
  ('20000000-0000-4000-8000-000000000003', 'halaqah', 'faith-on-our-own-terms', 'Faith on Our Own Terms?', 'Journey Through the Quran',
   'Do we follow the deen, or do we make the deen follow us? A Journey Through the Quran session.',
   E'A Journey Through the Quran session on picking and choosing from the deen, and what real submission to Allah looks like in a world that tells us to live on our own terms.',
   'Maulana Jawwad Mehmood', '/seed/event-faith-on-our-terms.jpg', 4, interval '20 hours', interval '1 hour 30 minutes',
   '00000000-0000-4000-8000-000000000002', 150, false),
  ('20000000-0000-4000-8000-000000000004', 'seminar', 'striving-in-deen', 'Striving in Deen', 'Strengthening our connection with Allah',
   'Practical steps to keep going when your iman feels low and your routine falls apart.',
   E'A session on mujahadah: what it means to strive in the deen, why the struggle itself is worship, and small consistent habits that strengthen our connection with Allah.',
   'Shaykh Hashim', '/seed/event-striving-in-deen.jpg', 10, interval '19 hours', interval '2 hours',
   '00000000-0000-4000-8000-000000000001', 250, false),
  ('20000000-0000-4000-8000-000000000005', 'seminar', 'the-strength-to-be-gentle', 'The Strength to Be Gentle', 'Lessons in mercy from the Seerah',
   'How the Prophet ﷺ showed that gentleness is strength, not weakness.',
   E'Stories from the Seerah on mercy, patience and gentleness with family, students and even opponents, and what they ask of us today.',
   'Maulana Khizer Khalid', '/seed/event-strength-to-be-gentle.jpg', 21, interval '19 hours 30 minutes', interval '2 hours',
   '00000000-0000-4000-8000-000000000002', 200, false),
  ('20000000-0000-4000-8000-000000000006', 'conference', 'enslaved-youth-conference', 'Enslaved: Youth Conference', 'Youth Conference 4.0',
   'Our annual youth conference on breaking free from what controls us: screens, desires and the opinions of others.',
   E'A full evening of talks for young people on the habits and pressures that quietly enslave us, and how the Quran frees us from them. Multiple speakers, Q&A and dinner.\n\nRegistration required. Entry with QR ticket.',
   'Multiple speakers', '/seed/event-enslaved-conference.jpg', 30, interval '17 hours', interval '5 hours',
   null, 1200, true)
) as v(id, type_slug, slug, title, subtitle, summary, description, speaker, poster, offset_days, start_time, length, venue, capacity, qr)
on conflict (slug) do update set title = excluded.title, subtitle = excluded.subtitle, summary = excluded.summary,
  description = excluded.description, speaker = excluded.speaker, poster_url = excluded.poster_url,
  starts_at = excluded.starts_at, ends_at = excluded.ends_at, venue_id = excluded.venue_id, capacity = excluded.capacity,
  qr_tickets_enabled = excluded.qr_tickets_enabled, status = 'published';

update public.offerings set location_text = '[Conference venue]' where slug = 'enslaved-youth-conference';

-- Field library -------------------------------------------------------------
-- System fields prefill from the profile (profile_column). Custom fields are reused across forms.
insert into public.fields (key, label, type, options, profile_column, is_system) values
  ('full_name',       'Full name',            'short_text', '[]', 'full_name',       true),
  ('email',           'Email',                'email',      '[]', 'email',           true),
  ('phone',           'WhatsApp number',      'phone',      '[]', 'phone',           true),
  ('date_of_birth',   'Date of birth',        'date',       '[]', 'date_of_birth',   true),
  ('occupation_type', 'I am a',               'single_select', '["student","professional","both","other"]', 'occupation_type', true),
  ('university',      'University',           'short_text', '[]', 'university',      true),
  ('company',         'Company',              'short_text', '[]', 'company',         true),
  ('area',            'Area',                 'short_text', '[]', 'area',            true),
  ('gender',          'Gender',               'single_select', '["male","female"]', 'gender', true),
  ('cnic',            'CNIC or B-Form',       'short_text', '[]', 'cnic',            true),
  ('prior_study',     'Have you studied at Hikmah before?', 'single_select', '["No","Yes, a course","Yes, events only"]', null, false),
  ('why_join',        'Why do you want to join?',           'long_text',     '[]', null, false),
  ('preferred_batch', 'Preferred batch',                    'single_select', '["Weekday","Weekend morning","Weekend afternoon"]', null, false),
  ('preferred_campus','Preferred campus',                   'single_select', '["Main Campus","DHA Campus"]', null, false),
  ('heard_from',      'How did you hear about this?',       'single_select', '["WhatsApp","Instagram","Friend or family","University","Other"]', null, false)
on conflict (key) do update set label = excluded.label, type = excluded.type, options = excluded.options,
  profile_column = excluded.profile_column, is_system = excluded.is_system;

-- Default event form: name, email, phone, occupation, how they heard.
insert into public.form_fields (offering_id, field_id, position, required)
select o.id, f.id, f.pos, f.req
from public.offerings o
join public.offering_types t on t.id = o.type_id and t.kind = 'event'
cross join (
  select id, case key when 'full_name' then 1 when 'email' then 2 when 'phone' then 3 when 'occupation_type' then 4 when 'heard_from' then 5 end as pos,
         key in ('full_name', 'email', 'phone') as req
  from public.fields where key in ('full_name', 'email', 'phone', 'occupation_type', 'heard_from')
) f
on conflict (offering_id, field_id) do update set position = excluded.position, required = excluded.required;

-- Course application form.
insert into public.form_fields (offering_id, field_id, position, required)
select o.id, f.id, f.pos, true
from public.offerings o
join public.offering_types t on t.id = o.type_id and t.kind = 'course'
cross join (
  select id, case key when 'full_name' then 1 when 'email' then 2 when 'phone' then 3 when 'date_of_birth' then 4
                      when 'preferred_campus' then 5 when 'preferred_batch' then 6 when 'prior_study' then 7 when 'why_join' then 8 end as pos
  from public.fields where key in ('full_name', 'email', 'phone', 'date_of_birth', 'preferred_campus', 'preferred_batch', 'prior_study', 'why_join')
) f
on conflict (offering_id, field_id) do update set position = excluded.position, required = excluded.required;
