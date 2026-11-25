-- DEMO: resets the LMS tutorial on Quranic Sciences (QS) so it can be recorded again.
-- Paste into the Supabase SQL editor and run. Touches only demo accounts (+hk. emails) and QS class content.
-- Also sets the 2027 intake on QS and QHD.
update public.course_details set intake_year = 2027
where offering_id in ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003');

-- Demo student IDs issued before the intake year was set: 26 -> 27
update public.admissions a set student_id = replace(a.student_id, 'HKM-26-', 'HKM-27-')
from auth.users u where a.user_id = u.id and u.email like '%+hk.%' and a.student_id like 'HKM-26-%';

-- QS class content from the tutorial
delete from public.lms_posts where offering_id = '10000000-0000-4000-8000-000000000001';
delete from public.lms_assignments where offering_id = '10000000-0000-4000-8000-000000000001';
delete from public.lms_quizzes where offering_id = '10000000-0000-4000-8000-000000000001';
delete from public.lms_timetable t using public.lms_sections s where t.section_id = s.id and s.offering_id = '10000000-0000-4000-8000-000000000001';
delete from public.lms_teaching t using public.lms_sections s where t.section_id = s.id and s.offering_id = '10000000-0000-4000-8000-000000000001';
delete from public.lms_sections where offering_id = '10000000-0000-4000-8000-000000000001' and name = 'Weekend Afternoon';

-- The tutorial student (Ayesha) goes back to "applied" and out of any section
update public.lms_enrolments e set ended_at = now()
from auth.users u where e.user_id = u.id and u.email like '%+hk.lms.ayesha@%' and e.ended_at is null;
delete from public.lms_enrolments e using auth.users u where e.user_id = u.id and u.email like '%+hk.lms.ayesha@%';
update public.admissions a set stage = 'applied', section_id = null, batch = null, campus = null, decided_at = null, decision_sent_at = null, student_id = null
from auth.users u where a.user_id = u.id and u.email like '%+hk.lms.ayesha@%' and a.offering_id = '10000000-0000-4000-8000-000000000001';
delete from public.user_roles r using auth.users u where r.user_id = u.id and u.email like '%+hk.lms.ayesha@%' and r.role = 'student';
