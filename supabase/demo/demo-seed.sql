-- DEMO DATA for recording tutorials. Remove it all with demo-cleanup.sql.
-- Paste into the Supabase SQL editor and run. Re-running is safe.
--
-- PLACEHOLDERS: change both lines below before running.
--   admin_email: the email you sign in to the website with (becomes super admin)
--   inbox:       a Gmail you can check. Every demo person gets a plus-address of it
--                (you+hk.ahmed.raza@gmail.com), so every email the demo sends lands there.
create temp table if not exists demo_cfg (admin_email text, inbox text);
truncate demo_cfg;
insert into demo_cfg values ('you@example.com', 'you@gmail.com');

do $$ begin
  if exists (select 1 from demo_cfg where admin_email = 'you@example.com' or inbox = 'you@gmail.com') then
    raise exception 'Change admin_email and inbox at the top of demo-seed.sql first.';
  end if;
end $$;

create or replace function pg_temp.demo_email(tag text) returns text language sql stable as $f$
  select split_part(inbox, '@', 1) || '+' || tag || '@' || split_part(inbox, '@', 2) from demo_cfg
$f$;

-- 1) Make yourself super admin
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where lower(email) = lower((select admin_email from demo_cfg))
on conflict do nothing;

-- 2) Past events (closed, so they do not show on the public site)
insert into public.offerings (id, type_id, slug, title, subtitle, summary, speaker, starts_at, ends_at, venue_id, capacity, status, qr_tickets_enabled, published_at)
select v.id::uuid, (select id from public.offering_types where slug = v.t), v.slug, v.title, v.sub, 'Demo event for tutorials.', v.speaker,
       date_trunc('day', now()) - v.ago * interval '1 day' + interval '14 hours', date_trunc('day', now()) - v.ago * interval '1 day' + interval '16 hours',
       '00000000-0000-4000-8000-000000000001', 300, 'closed', v.qr, now() - v.ago * interval '1 day'
from (values
  ('de0e0000-0000-4000-8000-000000000001', 'demo-the-purpose-of-life', 'The Purpose of Life', 'Feel Good Fridays', 'seminar', 63, false, 'Mufti Abdul Wahab'),
  ('de0e0000-0000-4000-8000-000000000002', 'demo-guarding-the-tongue', 'Guarding the Tongue', 'Feel Good Fridays', 'seminar', 42, false, 'Maulana Khizer Khalid'),
  ('de0e0000-0000-4000-8000-000000000003', 'demo-anxiety-and-tawakkul', 'Anxiety and Tawakkul', 'Feel Good Fridays', 'seminar', 28, false, 'Shaykh Hashim'),
  ('de0e0000-0000-4000-8000-000000000004', 'demo-parents-in-old-age', 'Our Parents in Old Age', 'Feel Good Fridays', 'seminar', 14, false, 'Mufti Abdul Wahab'),
  ('de0e0000-0000-4000-8000-000000000005', 'demo-youth-conference-3', 'Lost and Found: Youth Conference', 'Youth Conference 3.0', 'conference', 210, true, 'Multiple speakers'),
  ('de0e0000-0000-4000-8000-000000000006', 'demo-zakat-workshop', 'Calculating Your Zakat', 'Practical fiqh workshop', 'workshop', 90, false, 'Mufti Faisal')
) as v(id, slug, title, sub, t, ago, qr, speaker)
on conflict (slug) do nothing;

-- 3) Demo people (a profile row is created automatically for each)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', v.id::uuid, 'authenticated', 'authenticated', v.email, '', now(),
       '{"provider":"email","providers":["email"]}', '{}', now() - v.age * interval '1 day', now(), '', '', '', ''
from (values
  ('de0d0000-0000-4000-8000-000000000001', pg_temp.demo_email('hk.ahmed.raza'), 275),
  ('de0d0000-0000-4000-8000-000000000002', pg_temp.demo_email('hk.fatima.siddiqui'), 171),
  ('de0d0000-0000-4000-8000-000000000003', pg_temp.demo_email('hk.bilal.khan'), 176),
  ('de0d0000-0000-4000-8000-000000000004', pg_temp.demo_email('hk.ayesha.noor'), 130),
  ('de0d0000-0000-4000-8000-000000000005', pg_temp.demo_email('hk.hamza.qureshi'), 67),
  ('de0d0000-0000-4000-8000-000000000006', pg_temp.demo_email('hk.maryam.shaikh'), 63),
  ('de0d0000-0000-4000-8000-000000000007', pg_temp.demo_email('hk.usman.ali'), 160),
  ('de0d0000-0000-4000-8000-000000000008', pg_temp.demo_email('hk.zainab.hussain'), 200),
  ('de0d0000-0000-4000-8000-000000000009', pg_temp.demo_email('hk.omar.farooq'), 159),
  ('de0d0000-0000-4000-8000-000000000010', pg_temp.demo_email('hk.hira.baig'), 220),
  ('de0d0000-0000-4000-8000-000000000011', pg_temp.demo_email('hk.saad.iqbal'), 236),
  ('de0d0000-0000-4000-8000-000000000012', pg_temp.demo_email('hk.sana.tariq'), 123),
  ('de0d0000-0000-4000-8000-000000000013', pg_temp.demo_email('hk.talha.mirza'), 156),
  ('de0d0000-0000-4000-8000-000000000014', pg_temp.demo_email('hk.amna.javed'), 152),
  ('de0d0000-0000-4000-8000-000000000015', pg_temp.demo_email('hk.daniyal.ahmed'), 281),
  ('de0d0000-0000-4000-8000-000000000016', pg_temp.demo_email('hk.rabia.anwar'), 66),
  ('de0d0000-0000-4000-8000-000000000017', pg_temp.demo_email('hk.faraz.hassan'), 70),
  ('de0d0000-0000-4000-8000-000000000018', pg_temp.demo_email('hk.mahnoor.ali'), 247),
  ('de0d0000-0000-4000-8000-000000000019', pg_temp.demo_email('hk.shoaib.akhtar'), 243),
  ('de0d0000-0000-4000-8000-000000000020', pg_temp.demo_email('hk.iqra.saleem'), 56),
  ('de0d0000-0000-4000-8000-000000000021', pg_temp.demo_email('hk.haris.siddiqui'), 255),
  ('de0d0000-0000-4000-8000-000000000022', pg_temp.demo_email('hk.noor.fatima'), 209),
  ('de0d0000-0000-4000-8000-000000000023', pg_temp.demo_email('hk.waleed.khan'), 36),
  ('de0d0000-0000-4000-8000-000000000024', pg_temp.demo_email('hk.areeba.khalid'), 274),
  ('de0d0000-0000-4000-8000-000000000025', pg_temp.demo_email('hk.junaid.sheikh'), 159),
  ('de0d0000-0000-4000-8000-000000000026', pg_temp.demo_email('hk.sadia.rehman'), 100),
  ('de0d0000-0000-4000-8000-000000000027', pg_temp.demo_email('hk.muneeb.raza'), 202),
  ('de0d0000-0000-4000-8000-000000000028', pg_temp.demo_email('hk.khadija.imran'), 146),
  ('de0d0000-0000-4000-8000-000000000029', pg_temp.demo_email('hk.ali.haider'), 298),
  ('de0d0000-0000-4000-8000-000000000030', pg_temp.demo_email('hk.zoya.asif'), 102),
  ('de0d0000-0000-4000-8000-000000000031', pg_temp.demo_email('hk.ibrahim.malik'), 80),
  ('de0d0000-0000-4000-8000-000000000032', pg_temp.demo_email('hk.hafsa.yousuf'), 230),
  ('de0d0000-0000-4000-8000-000000000033', pg_temp.demo_email('hk.tahir.mehmood'), 184),
  ('de0d0000-0000-4000-8000-000000000034', pg_temp.demo_email('hk.sumaiya.naveed'), 49),
  ('de0d0000-0000-4000-8000-000000000035', pg_temp.demo_email('hk.abdullah.shah'), 73),
  ('de0d0000-0000-4000-8000-000000000036', pg_temp.demo_email('hk.laiba.farhan'), 117),
  ('de0d0000-0000-4000-8000-000000000037', pg_temp.demo_email('hk.rizwan.akram'), 265),
  ('de0d0000-0000-4000-8000-000000000038', pg_temp.demo_email('hk.mehwish.kamal'), 107),
  ('de0d0000-0000-4000-8000-000000000039', pg_temp.demo_email('hk.yasir.nadeem'), 165),
  ('de0d0000-0000-4000-8000-000000000040', pg_temp.demo_email('hk.anum.zafar'), 56)
) as v(id, email, age)
on conflict (id) do nothing;

update public.profiles set full_name='Ahmed Raza', phone='+923001252479', gender='male', date_of_birth='1994-08-12', occupation_type='professional', university=null, company='K-Electric', area='Gulshan-e-Iqbal Block 13', interests=array['Family and marriage','Seerah','Quran'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000001';
update public.profiles set full_name='Fatima Siddiqui', phone='+923007976167', gender='female', date_of_birth='1996-02-14', occupation_type='professional', university=null, company='Engro', area='Gulshan-e-Iqbal Block 6', interests=array['Tazkiyah','Family and marriage'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000002';
update public.profiles set full_name='Bilal Khan', phone='+923008845292', gender='male', date_of_birth='2003-06-10', occupation_type='student', university='NED University', company=null, area='Gulshan-e-Iqbal Block 2', interests=array['Quran','Hadith'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000003';
update public.profiles set full_name='Ayesha Noor', phone='+923005452733', gender='female', date_of_birth='2001-03-17', occupation_type='both', university=null, company='Engro', area='Gulshan-e-Iqbal', interests=array['Seerah','Tazkiyah','Fiqh'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000004';
update public.profiles set full_name='Hamza Qureshi', phone='+923002031469', gender='male', date_of_birth='1991-09-13', occupation_type='professional', university=null, company='Engro', area='Gulshan-e-Iqbal Block 10', interests=array['Islamic finance','Fiqh'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000005';
update public.profiles set full_name='Maryam Shaikh', phone='+923009206339', gender='female', date_of_birth='2004-09-11', occupation_type='student', university='NED University', company=null, area='Gulshan-e-Iqbal Block 7', interests=array['Quran','Family and marriage'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000006';
update public.profiles set full_name='Usman Ali', phone='+923001959644', gender='male', date_of_birth='1989-07-15', occupation_type='professional', university=null, company='Engro', area='Gulshan-e-Iqbal', interests=array['Family and marriage','Tazkiyah'], heard_from='Instagram', email_opt_in=false, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000007';
update public.profiles set full_name='Zainab Hussain', phone='+923005267311', gender='female', date_of_birth='1993-09-11', occupation_type='professional', university=null, company='Careem', area='Gulshan-e-Iqbal Block 13', interests=array['Hadith','Seerah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000008';
update public.profiles set full_name='Omar Farooq', phone='+923005777572', gender='male', date_of_birth='1999-09-11', occupation_type='both', university=null, company='Engro', area='Gulshan-e-Iqbal Block 4', interests=array['Fiqh','Islamic finance'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000009';
update public.profiles set full_name='Hira Baig', phone='+923005780975', gender='female', date_of_birth='2002-04-17', occupation_type='student', university='NED University', company=null, area='Gulshan-e-Iqbal', interests=array['Tazkiyah','Quran'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000010';
update public.profiles set full_name='Saad Iqbal', phone='+923003028901', gender='male', date_of_birth='1995-01-19', occupation_type='professional', university=null, company='Aga Khan Hospital', area='Gulshan-e-Iqbal Block 5', interests=array['Seerah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000011';
update public.profiles set full_name='Sana Tariq', phone='+923004181660', gender='female', date_of_birth='1990-05-19', occupation_type='professional', university=null, company='Systems Ltd', area='DHA Phase 6', interests=array['Family and marriage','Tazkiyah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000012';
update public.profiles set full_name='Talha Mirza', phone='+923008095218', gender='male', date_of_birth='1988-07-17', occupation_type='professional', university=null, company='Unilever', area='DHA Phase 5', interests=array['Islamic finance'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000013';
update public.profiles set full_name='Amna Javed', phone='+923006900956', gender='female', date_of_birth='1997-01-19', occupation_type='both', university=null, company='Careem', area='Clifton Block 2', interests=array['Seerah','Hadith'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000014';
update public.profiles set full_name='Daniyal Ahmed', phone='+923007391703', gender='male', date_of_birth='2004-04-15', occupation_type='student', university='NED University', company=null, area='North Nazimabad Block H', interests=array['Quran'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000015';
update public.profiles set full_name='Rabia Anwar', phone='+923002053595', gender='female', date_of_birth='1992-06-10', occupation_type='professional', university=null, company='Unilever', area='North Nazimabad Block L', interests=array['Family and marriage'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000016';
update public.profiles set full_name='Faraz Hassan', phone='+923002314265', gender='male', date_of_birth='1987-05-13', occupation_type='professional', university=null, company='K-Electric', area='PECHS Block 2', interests=array['Fiqh','Islamic finance'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000017';
update public.profiles set full_name='Mahnoor Ali', phone='+923008757264', gender='female', date_of_birth='2003-08-11', occupation_type='student', university='NED University', company=null, area='Bahadurabad', interests=array['Tazkiyah','Seerah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000018';
update public.profiles set full_name='Shoaib Akhtar', phone='+923005703974', gender='male', date_of_birth='1990-01-17', occupation_type='professional', university=null, company='K-Electric', area='Gulistan-e-Jauhar Block 15', interests=array['Quran','Hadith'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000019';
update public.profiles set full_name='Iqra Saleem', phone='+923009975129', gender='female', date_of_birth='2005-08-13', occupation_type='student', university='NED University', company=null, area='Gulistan-e-Jauhar Block 7', interests=array['Quran'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000020';
update public.profiles set full_name='Haris Siddiqui', phone='+923006099989', gender='male', date_of_birth='2000-04-18', occupation_type='both', university=null, company='Unilever', area='Federal B Area', interests=array['Fiqh'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000021';
update public.profiles set full_name='Noor Fatima', phone='+923006571011', gender='female', date_of_birth='1994-01-13', occupation_type='professional', university=null, company='Unilever', area='Federal B Area Block 15', interests=array['Family and marriage','Hadith'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000022';
update public.profiles set full_name='Waleed Khan', phone='+923002329988', gender='male', date_of_birth='1985-04-16', occupation_type='professional', university=null, company='Systems Ltd', area='Clifton Block 5', interests=array['Islamic finance','Seerah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000023';
update public.profiles set full_name='Areeba Khalid', phone='+923001732642', gender='female', date_of_birth='2002-03-11', occupation_type='student', university='NED University', company=null, area='DHA Phase 2', interests=array['Tazkiyah'], heard_from='Instagram', email_opt_in=false, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000024';
update public.profiles set full_name='Junaid Sheikh', phone='+923007281493', gender='male', date_of_birth='1993-04-12', occupation_type='professional', university=null, company='HBL', area='Malir Cantt', interests=array['Quran','Seerah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000025';
update public.profiles set full_name='Sadia Rehman', phone='+923001340584', gender='female', date_of_birth='1991-03-17', occupation_type='professional', university=null, company='Unilever', area='Nazimabad', interests=array['Family and marriage'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000026';
update public.profiles set full_name='Muneeb Raza', phone='+923009742057', gender='male', date_of_birth='2004-08-19', occupation_type='student', university='NED University', company=null, area='Gulshan-e-Iqbal Block 1', interests=array['Hadith','Quran'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000027';
update public.profiles set full_name='Khadija Imran', phone='+923004400267', gender='female', date_of_birth='1998-02-18', occupation_type='both', university=null, company='Systems Ltd', area='PECHS Block 6', interests=array['Seerah','Tazkiyah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000028';
update public.profiles set full_name='Ali Haider', phone='+923008443410', gender='male', date_of_birth='1986-06-15', occupation_type='professional', university=null, company='Aga Khan Hospital', area='Gulshan-e-Maymar', interests=array['Fiqh'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000029';
update public.profiles set full_name='Zoya Asif', phone='+923004497910', gender='female', date_of_birth='2003-07-13', occupation_type='student', university='NED University', company=null, area='Clifton Block 9', interests=array['Family and marriage','Quran'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000030';
update public.profiles set full_name='Ibrahim Malik', phone='+923005037575', gender='male', date_of_birth='1992-09-13', occupation_type='professional', university=null, company='K-Electric', area='Defence View', interests=array['Islamic finance','Hadith'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000031';
update public.profiles set full_name='Hafsa Yousuf', phone='+923007375396', gender='female', date_of_birth='1997-08-15', occupation_type='professional', university=null, company='Careem', area='Gulshan-e-Iqbal Block 13', interests=array['Tazkiyah','Seerah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000032';
update public.profiles set full_name='Tahir Mehmood', phone='+923002233889', gender='male', date_of_birth='1984-01-12', occupation_type='professional', university=null, company='Systems Ltd', area='Korangi', interests=array['Quran'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000033';
update public.profiles set full_name='Sumaiya Naveed', phone='+923009218034', gender='female', date_of_birth='2004-09-11', occupation_type='student', university='NED University', company=null, area='North Karachi', interests=array['Hadith'], heard_from='Instagram', email_opt_in=false, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000034';
update public.profiles set full_name='Abdullah Shah', phone='+923003252776', gender='male', date_of_birth='1999-05-19', occupation_type='both', university=null, company='HBL', area='Saddar', interests=array['Seerah','Fiqh'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=false, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000035';
update public.profiles set full_name='Laiba Farhan', phone='+923006564146', gender='female', date_of_birth='2005-09-18', occupation_type='student', university='NED University', company=null, area='Bahadurabad', interests=array['Quran','Tazkiyah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000036';
update public.profiles set full_name='Rizwan Akram', phone='+923002063473', gender='male', date_of_birth='1989-08-15', occupation_type='professional', university=null, company='HBL', area='Gulistan-e-Jauhar Block 12', interests=array['Islamic finance'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000037';
update public.profiles set full_name='Mehwish Kamal', phone='+923006050025', gender='female', date_of_birth='1990-08-13', occupation_type='professional', university=null, company='Engro', area='DHA Phase 8', interests=array['Family and marriage','Seerah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000038';
update public.profiles set full_name='Yasir Nadeem', phone='+923004712679', gender='male', date_of_birth='1996-09-19', occupation_type='professional', university=null, company='Aga Khan Hospital', area='Gulshan-e-Iqbal Block 3', interests=array['Hadith','Fiqh'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000039';
update public.profiles set full_name='Anum Zafar', phone='+923005027193', gender='female', date_of_birth='2002-04-15', occupation_type='student', university='NED University', company=null, area='Shah Faisal Colony', interests=array['Tazkiyah'], heard_from='Instagram', email_opt_in=true, whatsapp_opt_in=true, profile_completed_at=coalesce(profile_completed_at, now()) where id='de0d0000-0000-4000-8000-000000000040';

-- 4) Registrations, QR check-ins at last year's conference
insert into public.registrations (offering_id, user_id, status, answers, ticket_code, checked_in_at, submitted_at)
values
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000001', 'confirmed', '{}', null, null, now() - interval '39 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000001', 'confirmed', '{}', null, null, now() - interval '131 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000001', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '177 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000002', 'confirmed', '{}', null, null, now() - interval '78 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000002', 'confirmed', '{}', null, null, now() - interval '136 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000002', 'confirmed', '{}', null, null, now() - interval '19 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000002', 'confirmed', '{}', null, null, now() - interval '122 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000003', 'confirmed', '{}', null, null, now() - interval '70 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000003', 'confirmed', '{}', null, null, now() - interval '168 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000003', 'confirmed', '{}', null, null, now() - interval '26 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000004', 'confirmed', '{}', null, null, now() - interval '164 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000004', 'confirmed', '{}', null, null, now() - interval '202 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000005', 'confirmed', '{}', null, null, now() - interval '111 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000005', 'confirmed', '{}', null, null, now() - interval '151 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000005', 'confirmed', '{}', null, null, now() - interval '98 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000005', 'confirmed', '{}', null, null, now() - interval '194 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000006', 'confirmed', '{}', null, null, now() - interval '37 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000006', 'confirmed', '{}', null, null, now() - interval '219 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000006', 'confirmed', '{}', null, null, now() - interval '145 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000006', 'confirmed', '{}', null, null, now() - interval '82 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000007', 'confirmed', '{}', null, null, now() - interval '159 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000007', 'confirmed', '{}', null, null, now() - interval '197 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000007', 'confirmed', '{}', null, null, now() - interval '175 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000007', 'confirmed', '{}', null, null, now() - interval '214 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000007', 'confirmed', '{}', null, null, now() - interval '87 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000008', 'confirmed', '{}', null, null, now() - interval '168 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000008', 'confirmed', '{}', null, null, now() - interval '140 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000008', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '108 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000008', 'confirmed', '{}', null, null, now() - interval '77 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000009', 'confirmed', '{}', null, null, now() - interval '121 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000009', 'confirmed', '{}', null, null, now() - interval '205 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000009', 'confirmed', '{}', null, null, now() - interval '40 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000009', 'confirmed', '{}', null, null, now() - interval '105 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000009', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '68 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000009', 'confirmed', '{}', null, null, now() - interval '70 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000010', 'confirmed', '{}', null, null, now() - interval '111 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000010', 'confirmed', '{}', null, null, now() - interval '55 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000010', 'confirmed', '{}', null, null, now() - interval '31 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000010', 'confirmed', '{}', null, null, now() - interval '138 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000011', 'confirmed', '{}', null, null, now() - interval '28 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000011', 'confirmed', '{}', null, null, now() - interval '74 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000012', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '29 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000013', 'confirmed', '{}', null, null, now() - interval '206 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000013', 'confirmed', '{}', null, null, now() - interval '99 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000013', 'confirmed', '{}', null, null, now() - interval '140 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000013', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '216 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000014', 'confirmed', '{}', null, null, now() - interval '30 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000014', 'confirmed', '{}', null, null, now() - interval '29 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000014', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '128 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000015', 'confirmed', '{}', null, null, now() - interval '51 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000015', 'confirmed', '{}', null, null, now() - interval '45 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000015', 'confirmed', '{}', null, null, now() - interval '140 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000015', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '123 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000015', 'confirmed', '{}', null, null, now() - interval '23 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000017', 'confirmed', '{}', null, null, now() - interval '211 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000018', 'confirmed', '{}', null, null, now() - interval '43 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000019', 'confirmed', '{}', null, null, now() - interval '77 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000020', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '123 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000020', 'confirmed', '{}', null, null, now() - interval '103 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000021', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '113 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000022', 'confirmed', '{}', null, null, now() - interval '147 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000023', 'confirmed', '{}', null, null, now() - interval '136 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000023', 'confirmed', '{}', null, null, now() - interval '128 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000023', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '186 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000025', 'confirmed', '{}', null, null, now() - interval '182 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000026', 'confirmed', '{}', null, null, now() - interval '156 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000026', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '186 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000027', 'confirmed', '{}', null, null, now() - interval '15 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000027', 'confirmed', '{}', null, null, now() - interval '212 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000027', 'confirmed', '{}', null, null, now() - interval '195 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000027', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '147 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000029', 'confirmed', '{}', null, null, now() - interval '116 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000030', 'confirmed', '{}', null, null, now() - interval '45 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000030', 'confirmed', '{}', null, null, now() - interval '90 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000031', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '188 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000032', 'confirmed', '{}', null, null, now() - interval '198 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000032', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '178 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000032', 'confirmed', '{}', null, null, now() - interval '207 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000033', 'confirmed', '{}', null, null, now() - interval '160 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000033', 'confirmed', '{}', null, null, now() - interval '114 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000033', 'confirmed', '{}', null, null, now() - interval '18 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000033', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '134 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000034', 'confirmed', '{}', null, null, now() - interval '88 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000034', 'confirmed', '{}', null, null, now() - interval '184 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000035', 'confirmed', '{}', null, null, now() - interval '208 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000035', 'confirmed', '{}', null, null, now() - interval '65 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000035', 'confirmed', '{}', null, null, now() - interval '186 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000035', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '74 days'),
  ('de0e0000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000036', 'confirmed', '{}', null, null, now() - interval '97 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000036', 'confirmed', '{}', null, null, now() - interval '44 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000036', 'confirmed', '{}', null, null, now() - interval '157 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000036', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '140 days'),
  ('de0e0000-0000-4000-8000-000000000002', 'de0d0000-0000-4000-8000-000000000037', 'confirmed', '{}', null, null, now() - interval '202 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000037', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '41 days'),
  ('de0e0000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000037', 'confirmed', '{}', null, null, now() - interval '100 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000038', 'confirmed', '{}', null, null, now() - interval '33 days'),
  ('de0e0000-0000-4000-8000-000000000005', 'de0d0000-0000-4000-8000-000000000038', 'attended', '{}', public.generate_ticket_code(), now() - interval '209 days', now() - interval '45 days'),
  ('de0e0000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000040', 'confirmed', '{}', null, null, now() - interval '122 days'),
  ('de0e0000-0000-4000-8000-000000000003', 'de0d0000-0000-4000-8000-000000000040', 'confirmed', '{}', null, null, now() - interval '133 days'),
  ('20000000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000001', 'confirmed', '{}', null, null, now() - interval '131 days'),
  ('20000000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000004', 'confirmed', '{}', null, null, now() - interval '64 days'),
  ('20000000-0000-4000-8000-000000000001', 'de0d0000-0000-4000-8000-000000000009', 'confirmed', '{}', null, null, now() - interval '220 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000032', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '58 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000006', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '49 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000017', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '31 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000012', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '186 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000011', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '202 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000018', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '218 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000040', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '157 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000029', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '159 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000034', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '195 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000022', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '201 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000013', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '72 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000014', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '15 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000026', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '50 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000031', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '168 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000020', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '71 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000035', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '211 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000023', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '85 days'),
  ('20000000-0000-4000-8000-000000000006', 'de0d0000-0000-4000-8000-000000000027', 'confirmed', '{}', public.generate_ticket_code(), null, now() - interval '148 days'),
  ('10000000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000003', 'submitted', '{}', null, null, now() - interval '175 days'),
  ('10000000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000010', 'submitted', '{}', null, null, now() - interval '173 days'),
  ('10000000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000015', 'submitted', '{}', null, null, now() - interval '181 days'),
  ('10000000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000020', 'submitted', '{}', null, null, now() - interval '150 days'),
  ('10000000-0000-4000-8000-000000000004', 'de0d0000-0000-4000-8000-000000000027', 'submitted', '{}', null, null, now() - interval '213 days')
on conflict do nothing;

-- 5) Feedback on two past Feel Good Fridays
insert into public.feedback_forms (offering_id, questions, sent_at, sent_count)
select id, '[{"key":"overall","label":"How was the session overall?","type":"rating","required":true},{"key":"comments","label":"Anything else?","type":"long"}]', now() - interval '13 days', 0
from public.offerings where slug in ('demo-anxiety-and-tawakkul', 'demo-parents-in-old-age')
on conflict (offering_id) do nothing;
insert into public.feedback_responses (offering_id, registration_id, answers)
select r.offering_id, r.id, jsonb_build_object('overall', 4 + (abs(hashtext(r.id::text)) % 2), 'comments', 'JazakAllah khair, very beneficial.')
from public.registrations r join public.offerings o on o.id = r.offering_id
where o.slug in ('demo-anxiety-and-tawakkul', 'demo-parents-in-old-age') and abs(hashtext(r.id::text)) % 3 <> 0
on conflict (registration_id) do nothing;


-- 6) Requests from the Hifz, Mentorship and Hikmah at Work pages
insert into public.requests (id, kind, status, name, email, phone, payload, created_at)
values
  ('de0f0000-0000-4000-8000-000000000001', 'hifz', 'new', 'Kamran Siddiqui', pg_temp.demo_email('hk.parent.kamran'), '+923001112233',
   '{"children":[{"name":"Abdul Rahman","age":"8","gender":"Male","track":"Full time","in_school":"Yes","school":"The City School","grade":"Class 3","prior_study":"Yes","level":"Nazra","paras":"5","institute":"Masjid madrasa"},{"name":"Yusuf","age":"7","gender":"Male","track":"Full time","in_school":"Yes","school":"The City School","grade":"Class 2","prior_study":"No"}],"father":{"name":"Kamran Siddiqui","phone":"+923001112233","qualification":"MBA","institution":"IBA"},"mother":{"name":"Saima Kamran","phone":"+923004445566","qualification":"BSc"},"address":{"address":"House 12, Block 13-D","area":"Gulshan-e-Iqbal","city":"Karachi"}}', now() - interval '2 hours'),
  ('de0f0000-0000-4000-8000-000000000002', 'hifz', 'in_progress', 'Asif Raza', pg_temp.demo_email('hk.parent.asif'), '+923217778899',
   '{"children":[{"name":"Hamza Asif","age":"9","gender":"Male","track":"Full time","in_school":"No","prior_study":"Yes","level":"Hifz started","paras":"3"}],"father":{"name":"Asif Raza","phone":"+923217778899"},"mother":{"name":"Nadia Asif"},"address":{"area":"North Nazimabad","city":"Karachi"}}', now() - interval '3 days'),
  ('de0f0000-0000-4000-8000-000000000003', 'mentorship', 'new', 'Sara Ahmed', pg_temp.demo_email('hk.sara.ahmed'), '+923335556677',
   '{"area":"Career and studies","gender":"Female","date_of_birth":"2002-03-14","course":"BS Psychology","batch":"2023","enrollment":"Currently enrolled"}', now() - interval '5 hours'),
  ('de0f0000-0000-4000-8000-000000000004', 'mentorship', 'done', 'Faizan Ali', pg_temp.demo_email('hk.faizan.ali'), '+923459990011',
   '{"area":"Spiritual growth","gender":"Male","date_of_birth":"1999-08-02","course":"BBA","batch":"2020","enrollment":"Graduated"}', now() - interval '9 days'),
  ('de0f0000-0000-4000-8000-000000000005', 'corporate', 'new', 'Nida Hussain', pg_temp.demo_email('hk.nida.hussain'), '+923012223344',
   '{"organisation":"Systems Ltd","designation":"HR Business Partner","format":"Lunch and learn (45 min)","preferred_date":"2026-12-10","preferred_time":"1:00 pm","topic":"Balancing work and worship"}', now() - interval '1 day')
on conflict (id) do nothing;

