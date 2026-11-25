-- Teachers saving new materials, assignments and quizzes got "row-level security" errors:
-- the read rules looked the new row up by id, which isn't visible yet while it's being inserted.
-- Check the row's own columns first.
drop policy if exists "lms_posts: read" on public.lms_posts;
create policy "lms_posts: read" on public.lms_posts for select
  using (created_by = auth.uid() or public.lms_teaches_in(offering_id, subject_id) or public.lms_post_visible(id));

drop policy if exists "lms_assignments: read" on public.lms_assignments;
create policy "lms_assignments: read" on public.lms_assignments for select
  using (created_by = auth.uid() or public.lms_teaches_in(offering_id, subject_id) or public.lms_assignment_visible(id));

drop policy if exists "lms_quizzes: read" on public.lms_quizzes;
create policy "lms_quizzes: read" on public.lms_quizzes for select
  using (created_by = auth.uid() or public.lms_teaches_in(offering_id, subject_id) or public.lms_quiz_visible(id));
