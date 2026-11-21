-- Odd one out: re-roll any puzzle where more than one figure could be "the odd one",
-- so every puzzle has exactly one defensible answer.
alter function public.adm_gen_odd(int) rename to adm_gen_odd_once;

create or replace function public.adm_odd_candidates(items jsonb) returns int
language sql immutable as $$
  -- How many different figures are "the only one different" on some attribute.
  select count(distinct idx)::int from (
    select i.idx from unnest(array['s', 'n', 'f', 'r']) k,
      lateral (select ord - 1 as idx, e ->> k as v from jsonb_array_elements(items) with ordinality as x(e, ord)) i
    where (select count(*) from jsonb_array_elements(items) e2 where e2 ->> k = i.v) = 1
      and (select count(distinct e3 ->> k) from jsonb_array_elements(items) e3) = 2
  ) c;
$$;

create or replace function public.adm_gen_odd(lvl int) returns jsonb language plpgsql volatile as $$
declare g jsonb; tries int := 0;
begin
  loop
    g := public.adm_gen_odd_once(lvl);
    tries := tries + 1;
    exit when public.adm_odd_candidates(g -> 'payload' -> 'items') <= 1 or tries >= 25;
  end loop;
  return g;
end $$;

revoke execute on function public.adm_gen_odd(int), public.adm_gen_odd_once(int), public.adm_odd_candidates(jsonb) from public, anon, authenticated;
