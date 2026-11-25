-- Correct answers are only shown to students once the quiz has a closing time and it has passed,
-- so classmates still taking an open-ended quiz can't be shown them.
create or replace function public.lms_quiz_review(p_attempt uuid)
returns table (question_id uuid, correct int, model_answer text)
language plpgsql security definer set search_path = public as $$
declare att public.lms_quiz_attempts; q public.lms_quizzes;
begin
  select * into att from public.lms_quiz_attempts where id = p_attempt and (user_id = auth.uid() or public.lms_quiz_editable(quiz_id));
  if att.id is null or att.submitted_at is null then return; end if;
  select * into q from public.lms_quizzes where id = att.quiz_id;
  if not public.lms_quiz_editable(q.id) and (not q.show_answers or q.closes_at is null or q.closes_at > now()) then return; end if;
  return query select k.question_id, k.correct, k.model_answer
    from public.lms_quiz_keys k join public.lms_quiz_questions qq on qq.id = k.question_id where qq.quiz_id = q.id;
end $$;
