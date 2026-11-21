-- DEMO DATA for the admissions tutorial. Run after migration 10 (admissions) and demo-seed.sql.
-- Paste into the Supabase SQL editor and run. Safe to re-run. Removed by demo-cleanup.sql.
--
-- PLACEHOLDER: change the inbox below to the same Gmail used in demo-seed.sql.
create temp table if not exists demo_cfg2 (inbox text);
truncate demo_cfg2;
insert into demo_cfg2 values ('you@gmail.com');
do $$ begin
  if exists (select 1 from demo_cfg2 where inbox = 'you@gmail.com') then
    raise exception 'Change the inbox at the top of demo-admissions.sql first.';
  end if;
end $$;

-- Darse Nizami: intake 2027, course code DN.
update public.course_details set intake_year = 2027, code = 'DN' where offering_id = '10000000-0000-4000-8000-000000000004';

-- The tutorial applicant is the student from the student tutorial (Abdullah Khan, +hk.studentvb20).
-- Other test students' Darse Nizami applications are removed so the list stays clear.
delete from public.registrations r using auth.users u, demo_cfg2 c
where r.user_id = u.id and r.offering_id = '10000000-0000-4000-8000-000000000004'
  and u.email ~ '\+hk\.student' and u.email <> split_part(c.inbox, '@', 1) || '+hk.studentvb20@' || split_part(c.inbox, '@', 2);
update public.admissions a set stage = 'applied', test_invited_at = null, test_started_at = null, test_submitted_at = null, test_score = null,
  test_detail = '{}', essay = null, pledge = false, tab_switches = 0, slot_id = null, interview_score = null, interview_notes = null,
  interviewed_at = null, student_id = null, batch = null, campus = null, decided_at = null, decision_sent_at = null
from auth.users u, demo_cfg2 c
where a.user_id = u.id and u.email = split_part(c.inbox, '@', 1) || '+hk.studentvb20@' || split_part(c.inbox, '@', 2);
delete from public.admission_test_items i using public.admissions a, auth.users u, demo_cfg2 c
where i.admission_id = a.id and a.user_id = u.id and u.email = split_part(c.inbox, '@', 1) || '+hk.studentvb20@' || split_part(c.inbox, '@', 2);

-- Interview slots: next Saturday, 10:00 to 13:00 every 20 minutes, Main Campus.
delete from public.interview_slots where offering_id = '10000000-0000-4000-8000-000000000004'
  and id not in (select slot_id from public.admissions where slot_id is not null);
insert into public.interview_slots (offering_id, starts_at, minutes, venue_id, capacity)
select '10000000-0000-4000-8000-000000000004',
       (date_trunc('day', now() at time zone 'Asia/Karachi') + ((6 - extract(dow from now() at time zone 'Asia/Karachi')::int + 7) % 7 + 7) * interval '1 day'
        + interval '10 hours' + n * interval '20 minutes') at time zone 'Asia/Karachi',
       20, '00000000-0000-4000-8000-000000000001', 1
from generate_series(0, 8) n;

-- The five demo applicants at different stages, so the ranking has something to compare.
with d(uid, stage, score, iv, essay) as (values
  ('de0d0000-0000-4000-8000-000000000003'::uuid, 'interviewed', 81.4, 8.0, 'I want to understand the Quran directly and teach my younger siblings properly.'),
  ('de0d0000-0000-4000-8000-000000000010'::uuid, 'test_done', 76.2, null, 'Studying the deen alongside my degree has been my goal since school.'),
  ('de0d0000-0000-4000-8000-000000000015'::uuid, 'test_done', 58.9, null, 'My father studied at a madrasa and I want to continue that path while working.'),
  ('de0d0000-0000-4000-8000-000000000020'::uuid, 'test_invited', null, null, null),
  ('de0d0000-0000-4000-8000-000000000027'::uuid, 'applied', null, null, null))
update public.admissions a set stage = d.stage::public.admission_stage,
  test_invited_at = case when d.stage <> 'applied' then now() - interval '3 days' end,
  test_started_at = case when d.score is not null then now() - interval '2 days' end,
  test_submitted_at = case when d.score is not null then now() - interval '2 days' end,
  test_score = d.score, essay = d.essay, pledge = d.score is not null,
  test_detail = case when d.score is null then '{}'::jsonb else jsonb_build_object(
    'pattern', jsonb_build_object('correct', 5, 'total', 6, 'points', round(1100 * d.score / 100), 'max', 1100),
    'sequence', jsonb_build_object('correct', 4, 'total', 6, 'points', round(1100 * d.score / 110), 'max', 1100),
    'odd', jsonb_build_object('correct', 5, 'total', 6, 'points', round(1100 * d.score / 95), 'max', 1100),
    'memory', jsonb_build_object('correct', 3, 'total', 5, 'points', round(875 * d.score / 120), 'max', 875),
    'logic', jsonb_build_object('correct', 6, 'total', 8, 'points', round(1550 * d.score / 105), 'max', 1550)) end,
  interview_score = d.iv, interview_notes = case when d.iv is not null then 'Sincere, well prepared. Good Arabic reading.' end,
  interviewed_at = case when d.iv is not null then now() - interval '1 day' end
from d where a.user_id = d.uid and a.offering_id = '10000000-0000-4000-8000-000000000004';
