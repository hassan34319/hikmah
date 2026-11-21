-- Removes everything demo-seed.sql added, plus what the tutorial recordings created.
-- Demo people, the student and the parent all use +hk. plus-addresses.
delete from public.campaigns where id in (select distinct campaign_id from public.campaign_recipients where email ~ '\+hk\.');
delete from public.segments where name ilike '%FGF regulars%';
delete from public.requests where email ~ '\+hk\.' or id::text like 'de0f0000-%';
delete from public.registrations where user_id in (select id from auth.users where email ~ '\+hk\.' or id::text like 'de0d0000-%');
delete from public.user_roles where user_id in (select id from auth.users where email ~ '\+hk\.' or id::text like 'de0d0000-%');
delete from auth.users where email ~ '\+hk\.' or id::text like 'de0d0000-%';
delete from public.offerings where slug like 'demo-%';
delete from public.fields where not is_system and label in ('Which campus is closer to you?', 'Will you attend in person?');
delete from public.interview_slots where offering_id = '10000000-0000-4000-8000-000000000004';
