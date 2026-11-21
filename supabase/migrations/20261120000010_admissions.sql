-- Admissions for courses.
--   applied -> test_invited -> test_done -> interview_invited -> interviewed -> selected | waitlisted | not_selected
-- The admission test is a set of mini-games generated here, per applicant. Answers never leave the database:
-- the applicant's browser only gets each puzzle when it is shown, and scoring and timing happen server side.

alter table public.course_details
  add column intake_year int,
  add column essay_prompt text not null default 'Why do you want to study at Hikmah, and what do you hope to do with what you learn?';

create type public.admission_stage as enum
  ('applied', 'test_invited', 'test_done', 'interview_invited', 'interviewed', 'selected', 'waitlisted', 'not_selected');

create table public.interview_slots (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  starts_at timestamptz not null,
  minutes int not null default 20 check (minutes between 5 and 240),
  venue_id uuid references public.venues (id) on delete set null,
  capacity int not null default 1 check (capacity between 1 and 50),
  created_at timestamptz not null default now()
);
create index interview_slots_offering_idx on public.interview_slots (offering_id, starts_at);

create table public.admissions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations (id) on delete cascade,
  offering_id uuid not null references public.offerings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  stage public.admission_stage not null default 'applied',
  test_token uuid not null unique default gen_random_uuid(),
  test_invited_at timestamptz,
  test_started_at timestamptz,
  test_submitted_at timestamptz,
  test_score numeric(5,1),            -- 0 to 100
  test_detail jsonb not null default '{}'::jsonb,   -- per game: { correct, total, points, max }
  tab_switches int not null default 0,
  essay text,
  pledge boolean not null default false,
  interview_invited_at timestamptz,
  slot_id uuid references public.interview_slots (id) on delete set null,
  interview_score numeric(3,1) check (interview_score between 0 and 10),
  interview_notes text,
  interviewer_id uuid references auth.users (id),
  interviewed_at timestamptz,
  batch text,
  campus text,
  student_id text unique,
  decided_at timestamptz,
  decision_sent_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admissions_offering_idx on public.admissions (offering_id, stage);
create trigger admissions_updated_at before update on public.admissions for each row execute function public.set_updated_at();

-- The generated puzzles. `answer` is never readable by applicants.
create table public.admission_test_items (
  id uuid primary key default gen_random_uuid(),
  admission_id uuid not null references public.admissions (id) on delete cascade,
  position int not null,
  game text not null,
  level int not null,
  limit_s int not null,
  payload jsonb not null,
  answer jsonb not null,
  served_at timestamptz,
  answered_at timestamptz,
  response jsonb,
  correct boolean,
  points int not null default 0,
  max_points int not null,
  unique (admission_id, position)
);

alter table public.interview_slots enable row level security;
alter table public.admissions enable row level security;
alter table public.admission_test_items enable row level security;

create or replace function public.is_interviewer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('super_admin', 'admin', 'interviewer'));
$$;
grant execute on function public.is_interviewer() to authenticated;

create policy "slots: admin" on public.interview_slots for all using (public.is_admin()) with check (public.is_admin());
create policy "slots: interviewer read" on public.interview_slots for select using (public.is_interviewer());
create policy "admissions: admin" on public.admissions for all using (public.is_admin()) with check (public.is_admin());
create policy "admissions: interviewer read" on public.admissions for select using (public.is_interviewer() and stage in ('interview_invited', 'interviewed', 'selected', 'waitlisted', 'not_selected'));
create policy "admissions: own read" on public.admissions for select using (user_id = auth.uid());
create policy "test items: admin read" on public.admission_test_items for select using (public.is_admin());
grant select, insert, update, delete on public.interview_slots, public.admissions to authenticated;

-- Interviewers can read the people they interview (profile and application answers), nobody else.
create or replace function public.is_interviewee(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_interviewer() and exists (
    select 1 from public.admissions a where a.user_id = uid
      and a.stage in ('interview_invited', 'interviewed', 'selected', 'waitlisted', 'not_selected'));
$$;
create policy "profiles: interviewer read" on public.profiles for select using (public.is_interviewee(id));
create policy "registrations: interviewer read" on public.registrations for select using (public.is_interviewee(user_id));
grant select on public.admission_test_items to authenticated;

-- Applicants and interviewers may read their own row but change nothing directly.
create or replace function public.protect_admission_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger admissions_protect before update on public.admissions for each row execute function public.protect_admission_columns();

-- Every course application gets an admissions row.
create or replace function public.create_admission_for_registration()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.offerings o join public.offering_types t on t.id = o.type_id where o.id = new.offering_id and t.kind = 'course') then
    insert into public.admissions (registration_id, offering_id, user_id) values (new.id, new.offering_id, new.user_id) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger registrations_admission after insert on public.registrations for each row execute function public.create_admission_for_registration();

insert into public.admissions (registration_id, offering_id, user_id)
select r.id, r.offering_id, r.user_id from public.registrations r
join public.offerings o on o.id = r.offering_id join public.offering_types t on t.id = o.type_id
where t.kind = 'course' on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Puzzle generators. Each returns { payload, answer }.
-- ---------------------------------------------------------------------------
create or replace function public.adm_rand(lo int, hi int) returns int language sql volatile as $$
  select lo + floor(random() * (hi - lo + 1))::int;
$$;

-- Shuffles a jsonb array; returns { arr, index_of_first } where index_of_first is where element 0 ended up.
create or replace function public.adm_shuffle(items jsonb) returns jsonb language plpgsql volatile as $$
declare
  ord int[]; out jsonb := '[]'::jsonb; i int; pos int;
begin
  select array_agg(n order by random()) into ord from generate_series(0, jsonb_array_length(items) - 1) n;
  for i in 1 .. array_length(ord, 1) loop
    out := out || jsonb_build_array(items -> ord[i]);
    if ord[i] = 0 then pos := i - 1; end if;
  end loop;
  return jsonb_build_object('arr', out, 'first', pos);
end $$;

-- Pattern grid: 3x3 cells, each { s: shape 0-4, n: count 1-3, r: rotation step 0-3, f: fill 0-1 }. Bottom-right is missing.
create or replace function public.adm_gen_pattern(lvl int) returns jsonb language plpgsql volatile as $$
declare
  shapes int[]; fills int[]; rot0 int; cells jsonb := '[]'::jsonb; row int; col int; cell jsonb; target jsonb;
  opts jsonb; d jsonb; tries int := 0; sh jsonb;
begin
  select array_agg(x order by random()) into shapes from unnest(array[0,1,2,3,4]) x;
  fills := array[adm_rand(0,1), adm_rand(0,1), adm_rand(0,1)];
  rot0 := adm_rand(0,3);
  for row in 0..2 loop
    for col in 0..2 loop
      cell := jsonb_build_object(
        's', case when lvl >= 2 then shapes[((row + col) % 3) + 1] else shapes[row + 1] end,
        'n', col + 1,
        'r', case when lvl >= 3 then (rot0 + row + col) % 4 else rot0 end,
        'f', case when lvl >= 2 then fills[col + 1] else fills[1] end);
      if row = 2 and col = 2 then target := cell; cells := cells || 'null'::jsonb; else cells := cells || jsonb_build_array(cell); end if;
    end loop;
  end loop;
  opts := jsonb_build_array(target);
  while jsonb_array_length(opts) < 6 and tries < 60 loop
    tries := tries + 1;
    d := target;
    case adm_rand(0,3)
      when 0 then d := jsonb_set(d, '{n}', to_jsonb(((target->>'n')::int % 3) + 1));
      when 1 then d := jsonb_set(d, '{s}', to_jsonb(shapes[adm_rand(1,5)]));
      when 2 then d := jsonb_set(d, '{r}', to_jsonb(((target->>'r')::int + adm_rand(1,3)) % 4));
      else d := jsonb_set(d, '{f}', to_jsonb(1 - (target->>'f')::int));
    end case;
    if not exists (select 1 from jsonb_array_elements(opts) o where o = d) then opts := opts || jsonb_build_array(d); end if;
  end loop;
  sh := adm_shuffle(opts);
  return jsonb_build_object('payload', jsonb_build_object('cells', cells, 'options', sh->'arr'), 'answer', sh->'first');
end $$;

-- Number sequences: show 5 terms, pick the 6th from 4 options.
create or replace function public.adm_gen_sequence(lvl int) returns jsonb language plpgsql volatile as $$
declare
  kind int; a int; d int; r int; terms int[] := '{}'; i int; nxt int; opts jsonb; sh jsonb; x int; y int;
begin
  kind := case when lvl = 1 then adm_rand(0,1) when lvl = 2 then adm_rand(1,3) else adm_rand(3,5) end;
  a := adm_rand(2, 9); d := adm_rand(2, 7); r := adm_rand(2, 3); x := adm_rand(2, 6); y := adm_rand(1, 4);
  for i in 0..5 loop
    terms := terms || case kind
      when 0 then a + d * i                                   -- arithmetic
      when 1 then a * (r ^ i)::int                            -- geometric
      when 2 then (i + a) * (i + a) - d                       -- shifted squares
      when 3 then a + (case when i % 2 = 0 then (i / 2) * (x - y) else (i / 2) * (x - y) + x end)  -- +x, -y alternating
      when 4 then (a * (2 ^ i)::int) + ((2 ^ i)::int - 1)      -- double plus one
      else 0 end;
  end loop;
  if kind = 5 then  -- each term is the sum of the previous two
    terms := array[a, d];
    for i in 3..6 loop terms := terms || (terms[i - 1] + terms[i - 2]); end loop;
  end if;
  nxt := terms[6];
  opts := jsonb_build_array(nxt, nxt + adm_rand(1, 3), nxt - adm_rand(1, 3), nxt + d + adm_rand(1, 2));
  if (select count(distinct v) from jsonb_array_elements(opts) v) < 4 then opts := jsonb_build_array(nxt, nxt + 1, nxt - 2, nxt + 5); end if;
  sh := adm_shuffle(opts);
  return jsonb_build_object('payload', jsonb_build_object('terms', to_jsonb(terms[1:5]), 'options', sh->'arr'), 'answer', sh->'first');
end $$;

-- Odd one out: 5 figures share a rule except one.
create or replace function public.adm_gen_odd(lvl int) returns jsonb language plpgsql volatile as $$
declare
  rule int; base jsonb; items jsonb := '[]'::jsonb; odd jsonb; i int; sh jsonb; s int; n int;
begin
  rule := adm_rand(0, case when lvl >= 2 then 3 else 1 end);
  s := adm_rand(0,4); n := adm_rand(1,3);
  for i in 1..4 loop
    base := case rule
      when 0 then jsonb_build_object('s', s, 'n', adm_rand(1,3), 'r', adm_rand(0,3), 'f', adm_rand(0,1))           -- same shape
      when 1 then jsonb_build_object('s', adm_rand(0,4), 'n', n, 'r', adm_rand(0,3), 'f', adm_rand(0,1))           -- same count
      when 2 then jsonb_build_object('s', adm_rand(0,4), 'n', adm_rand(1,3), 'r', adm_rand(0,3), 'f', 1)            -- all filled
      else jsonb_build_object('s', s, 'n', n, 'r', i % 4, 'f', 0) end;                                               -- same shape and count, rotated
    items := items || jsonb_build_array(base);
  end loop;
  odd := case rule
    when 0 then jsonb_build_object('s', (s + adm_rand(1,4)) % 5, 'n', adm_rand(1,3), 'r', adm_rand(0,3), 'f', adm_rand(0,1))
    when 1 then jsonb_build_object('s', adm_rand(0,4), 'n', (n % 3) + 1, 'r', adm_rand(0,3), 'f', adm_rand(0,1))
    when 2 then jsonb_build_object('s', adm_rand(0,4), 'n', adm_rand(1,3), 'r', adm_rand(0,3), 'f', 0)
    else jsonb_build_object('s', s, 'n', (n % 3) + 1, 'r', 0, 'f', 0) end;
  sh := adm_shuffle(jsonb_build_array(odd) || items);
  return jsonb_build_object('payload', jsonb_build_object('items', sh->'arr'), 'answer', sh->'first');
end $$;

-- Memory flash: tiles light up in order on a grid; repeat the order.
create or replace function public.adm_gen_memory(lvl int) returns jsonb language plpgsql volatile as $$
declare size int; len int; seq jsonb := '[]'::jsonb; i int; t int; prev int := -1;
begin
  size := case when lvl >= 3 then 4 else 3 end;
  len := 2 + lvl + (case when lvl >= 4 then 1 else 0 end);
  for i in 1..len loop
    loop t := adm_rand(0, size * size - 1); exit when t <> prev; end loop;
    seq := seq || to_jsonb(t); prev := t;
  end loop;
  -- The sequence has to be shown, so it is in the payload; scoring still happens here.
  return jsonb_build_object('payload', jsonb_build_object('size', size, 'sequence', seq, 'flash_ms', greatest(450, 750 - lvl * 60)), 'answer', seq);
end $$;

-- Speed logic: made-up words so general knowledge cannot help.
create or replace function public.adm_gen_logic(lvl int) returns jsonb language plpgsql volatile as $$
declare
  words text[] := array['bloops','razzies','lazzles','dorps','fimbles','snarks','tovs','quibs','zents','morks','plinks','vabs'];
  w text[]; t int; q text; ans int; -- 0 yes, 1 no, 2 cannot tell
begin
  select array_agg(x order by random()) into w from unnest(words) x;
  t := adm_rand(0, 7);
  case t
    when 0 then q := format('All %s are %s. All %s are %s. Are all %s %s?', w[1], w[2], w[2], w[3], w[1], w[3]); ans := 0;
    when 1 then q := format('All %s are %s. Some %s are %s. Are some %s definitely %s?', w[1], w[2], w[2], w[3], w[1], w[3]); ans := 2;
    when 2 then q := format('No %s are %s. All %s are %s. Can any %s be %s?', w[1], w[2], w[3], w[1], w[3], w[2]); ans := 1;
    when 3 then q := format('Some %s are %s. All %s are %s. Are some %s %s?', w[1], w[2], w[2], w[3], w[1], w[3]); ans := 0;
    when 4 then q := format('All %s are %s. Are all %s %s?', w[1], w[2], w[2], w[1]); ans := 2;
    when 5 then q := format('No %s are %s. Are some %s %s?', w[1], w[2], w[1], w[2]); ans := 1;
    when 6 then q := format('All %s are %s. Some %s are not %s. Are some %s not %s?', w[1], w[2], w[3], w[2], w[3], w[1]); ans := 0;
    else q := format('Some %s are %s. Some %s are %s. Are some %s definitely %s?', w[1], w[2], w[2], w[3], w[1], w[3]); ans := 2;
  end case;
  return jsonb_build_object('payload', jsonb_build_object('question', q, 'options', jsonb_build_array('Yes', 'No', 'Can''t tell')), 'answer', ans);
end $$;

-- ---------------------------------------------------------------------------
-- Applicant-facing test functions (all check that the caller owns the admission).
-- ---------------------------------------------------------------------------
create or replace function public.adm_for_token(p_token uuid) returns public.admissions
language plpgsql stable security definer set search_path = public as $$
declare a public.admissions;
begin
  select * into a from public.admissions where test_token = p_token;
  if not found or a.user_id <> auth.uid() then raise exception 'not_found' using errcode = 'P0001'; end if;
  return a;
end $$;

-- About the test, for the start screen.
create or replace function public.admission_test_info(p_token uuid)
returns table (course text, stage public.admission_stage, started boolean, submitted boolean, total int, answered int, essay_prompt text, first_name text)
language plpgsql stable security definer set search_path = public as $$
declare a public.admissions;
begin
  a := public.adm_for_token(p_token);
  return query
    select o.title, a.stage, a.test_started_at is not null, a.test_submitted_at is not null,
           (select count(*)::int from public.admission_test_items i where i.admission_id = a.id),
           (select count(*)::int from public.admission_test_items i where i.admission_id = a.id and i.answered_at is not null),
           coalesce(cd.essay_prompt, 'Why do you want to study at Hikmah?'),
           split_part(coalesce(p.full_name, ''), ' ', 1)
    from public.offerings o left join public.course_details cd on cd.offering_id = o.id
    left join public.profiles p on p.id = a.user_id
    where o.id = a.offering_id;
end $$;

-- Generates the puzzles once. Order: pattern x6, sequence x6, odd x6, memory x5, logic x8; difficulty rises within each game.
create or replace function public.admission_test_start(p_token uuid) returns int
language plpgsql security definer set search_path = public as $$
declare a public.admissions; pos int := 0; g record; i int; item jsonb;
begin
  a := public.adm_for_token(p_token);
  if a.stage <> 'test_invited' then raise exception 'not_invited' using errcode = 'P0001'; end if;
  if a.test_started_at is not null then return (select count(*) from public.admission_test_items where admission_id = a.id); end if;
  for g in select * from (values ('pattern', 6, 35), ('sequence', 6, 25), ('odd', 6, 15), ('memory', 5, 20), ('logic', 8, 12)) v(game, n, lim) loop
    for i in 1..g.n loop
      item := case g.game
        when 'pattern' then public.adm_gen_pattern(least(3, 1 + (i - 1) / 2))
        when 'sequence' then public.adm_gen_sequence(least(3, 1 + (i - 1) / 2))
        when 'odd' then public.adm_gen_odd(least(3, 1 + (i - 1) / 2))
        when 'memory' then public.adm_gen_memory(i)
        else public.adm_gen_logic(1) end;
      pos := pos + 1;
      insert into public.admission_test_items (admission_id, position, game, level, limit_s, payload, answer, max_points)
      values (a.id, pos, g.game, least(5, i), g.lim, item->'payload', item->'answer', 100 + 25 * least(5, i));
    end loop;
  end loop;
  update public.admissions set test_started_at = now() where id = a.id;
  return pos;
end $$;

-- The next puzzle to show. Puzzles left open past their time limit count as wrong.
create or replace function public.admission_test_next(p_token uuid)
returns table (item_id uuid, game text, level int, limit_s int, payload jsonb, pos int, total int, score int)
language plpgsql security definer set search_path = public as $$
declare a public.admissions; it public.admission_test_items;
begin
  a := public.adm_for_token(p_token);
  if a.test_submitted_at is not null or a.test_started_at is null then return; end if;
  update public.admission_test_items x set answered_at = now(), correct = false, points = 0
    where x.admission_id = a.id and x.served_at is not null and x.answered_at is null
      and x.served_at + make_interval(secs => x.limit_s + 8) < now();
  select * into it from public.admission_test_items x where x.admission_id = a.id and x.answered_at is null order by x.position limit 1;
  if not found then return; end if;
  if it.served_at is null then update public.admission_test_items x set served_at = now() where x.id = it.id; end if;
  return query select it.id, it.game, it.level, it.limit_s, it.payload, it.position,
    (select count(*)::int from public.admission_test_items x where x.admission_id = a.id),
    (select coalesce(sum(x.points), 0)::int from public.admission_test_items x where x.admission_id = a.id);
end $$;

-- Scores one answer. Faster correct answers earn more (60% to 100% of the item's points).
create or replace function public.admission_test_answer(p_token uuid, p_item uuid, p_response jsonb)
returns table (correct boolean, points int)
language plpgsql security definer set search_path = public as $$
declare a public.admissions; it public.admission_test_items; elapsed numeric; ok boolean; pts int; mem_limit numeric;
begin
  a := public.adm_for_token(p_token);
  select * into it from public.admission_test_items x where x.id = p_item and x.admission_id = a.id for update;
  if not found or it.served_at is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if it.answered_at is not null then return query select it.correct, it.points; return; end if;
  elapsed := extract(epoch from now() - it.served_at);
  -- Memory rounds include the time spent watching the sequence.
  mem_limit := it.limit_s + case when it.game = 'memory' then jsonb_array_length(it.payload->'sequence') * (it.payload->>'flash_ms')::numeric / 1000 + 1 else 0 end;
  ok := elapsed <= mem_limit + 3 and p_response = it.answer;
  pts := case when ok then round(it.max_points * (0.6 + 0.4 * greatest(0, 1 - elapsed / mem_limit)))::int else 0 end;
  update public.admission_test_items x set answered_at = now(), response = p_response, correct = ok, points = pts where x.id = it.id;
  return query select ok, pts;
end $$;

create or replace function public.admission_test_flag(p_token uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.admissions;
begin
  a := public.adm_for_token(p_token);
  if a.test_started_at is not null and a.test_submitted_at is null then
    update public.admissions set tab_switches = tab_switches + 1 where id = a.id;
  end if;
end $$;

-- Finishes the test: essay, pledge, final score (0-100) and a per-game breakdown.
create or replace function public.admission_test_submit(p_token uuid, p_essay text, p_pledge boolean) returns numeric
language plpgsql security definer set search_path = public as $$
declare a public.admissions; total numeric; maxp numeric; detail jsonb;
begin
  a := public.adm_for_token(p_token);
  if a.test_started_at is null then raise exception 'not_started' using errcode = 'P0001'; end if;
  if a.test_submitted_at is not null then return a.test_score; end if;
  if not coalesce(p_pledge, false) then raise exception 'pledge_required' using errcode = 'P0001'; end if;
  if length(trim(coalesce(p_essay, ''))) < 40 then raise exception 'essay_too_short' using errcode = 'P0001'; end if;
  update public.admission_test_items set answered_at = now(), correct = false, points = 0
    where admission_id = a.id and answered_at is null;
  select sum(points), sum(max_points) into total, maxp from public.admission_test_items where admission_id = a.id;
  select jsonb_object_agg(game, jsonb_build_object('correct', c, 'total', n, 'points', p, 'max', m)) into detail
    from (select game, count(*) filter (where correct) c, count(*) n, sum(points) p, sum(max_points) m
          from public.admission_test_items where admission_id = a.id group by game) s;
  update public.admissions set test_submitted_at = now(), stage = 'test_done', essay = left(trim(p_essay), 6000), pledge = true,
    test_score = round(100 * total / nullif(maxp, 0), 1), test_detail = coalesce(detail, '{}')
  where id = a.id;
  return round(100 * total / nullif(maxp, 0), 1);
end $$;

-- ---------------------------------------------------------------------------
-- Interviews
-- ---------------------------------------------------------------------------
create or replace function public.interview_slots_for(p_token uuid)
returns table (slot_id uuid, starts_at timestamptz, minutes int, venue text, seats_left int, mine boolean)
language plpgsql stable security definer set search_path = public as $$
declare a public.admissions;
begin
  a := public.adm_for_token(p_token);
  return query
    select s.id, s.starts_at, s.minutes, v.name,
           (s.capacity - (select count(*) from public.admissions x where x.slot_id = s.id))::int,
           coalesce(s.id = a.slot_id, false)
    from public.interview_slots s left join public.venues v on v.id = s.venue_id
    where s.offering_id = a.offering_id and s.starts_at > now()
    order by s.starts_at;
end $$;

create or replace function public.interview_book(p_token uuid, p_slot uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare a public.admissions; s public.interview_slots; taken int;
begin
  a := public.adm_for_token(p_token);
  if a.stage <> 'interview_invited' then raise exception 'not_invited' using errcode = 'P0001'; end if;
  select * into s from public.interview_slots where id = p_slot and offering_id = a.offering_id for update;
  if not found or s.starts_at <= now() then raise exception 'slot_unavailable' using errcode = 'P0001'; end if;
  select count(*) into taken from public.admissions where slot_id = s.id and id <> a.id;
  if taken >= s.capacity then raise exception 'slot_full' using errcode = 'P0001'; end if;
  update public.admissions set slot_id = s.id where id = a.id;
  return s.starts_at;
end $$;

-- Interviewers record a score out of 10 with notes.
create or replace function public.interview_record(p_admission uuid, p_score numeric, p_notes text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_interviewer() then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  if p_score is null or p_score < 0 or p_score > 10 then raise exception 'bad_score' using errcode = 'P0001'; end if;
  update public.admissions set interview_score = round(p_score, 1), interview_notes = nullif(trim(coalesce(p_notes, '')), ''),
    interviewer_id = auth.uid(), interviewed_at = now(),
    stage = case when stage = 'interview_invited' then 'interviewed'::public.admission_stage else stage end
  where id = p_admission and stage in ('interview_invited', 'interviewed');
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
end $$;

-- Student ID like HKM-27-DN-0042: intake year, course code letters, running number per course and year.
create or replace function public.admission_assign_student_id(p_admission uuid) returns text
language plpgsql security definer set search_path = public as $$
declare a public.admissions; code text; yy text; prefix text; n int; sid text;
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = 'P0001'; end if;
  select * into a from public.admissions where id = p_admission for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.student_id is not null then return a.student_id; end if;
  select upper(regexp_replace(coalesce(cd.code, ''), '[^A-Za-z0-9]', '', 'g')),
         lpad((coalesce(cd.intake_year, extract(year from now())::int) % 100)::text, 2, '0')
    into code, yy from public.course_details cd where cd.offering_id = a.offering_id;
  if coalesce(code, '') = '' then
    select upper(left(regexp_replace(o.title, '[^A-Za-z]', '', 'g'), 2)) into code from public.offerings o where o.id = a.offering_id;
  end if;
  yy := coalesce(yy, lpad((extract(year from now())::int % 100)::text, 2, '0'));
  prefix := 'HKM-' || yy || '-' || code || '-';
  perform pg_advisory_xact_lock(hashtext(prefix));
  select coalesce(max(substring(student_id from length(prefix) + 1)::int), 0) + 1 into n
    from public.admissions where student_id like prefix || '%';
  sid := prefix || lpad(n::text, 4, '0');
  update public.admissions set student_id = sid where id = a.id;
  return sid;
end $$;

revoke execute on function public.admission_test_info(uuid), public.admission_test_start(uuid), public.admission_test_next(uuid),
  public.admission_test_answer(uuid, uuid, jsonb), public.admission_test_flag(uuid), public.admission_test_submit(uuid, text, boolean),
  public.interview_slots_for(uuid), public.interview_book(uuid, uuid), public.interview_record(uuid, numeric, text),
  public.admission_assign_student_id(uuid) from public, anon;
grant execute on function public.admission_test_info(uuid), public.admission_test_start(uuid), public.admission_test_next(uuid),
  public.admission_test_answer(uuid, uuid, jsonb), public.admission_test_flag(uuid), public.admission_test_submit(uuid, text, boolean),
  public.interview_slots_for(uuid), public.interview_book(uuid, uuid), public.interview_record(uuid, numeric, text),
  public.admission_assign_student_id(uuid) to authenticated;
revoke execute on function public.adm_gen_pattern(int), public.adm_gen_sequence(int), public.adm_gen_odd(int), public.adm_gen_memory(int),
  public.adm_gen_logic(int), public.adm_shuffle(jsonb), public.adm_rand(int, int), public.adm_for_token(uuid) from public, anon, authenticated;
