-- Returns per-set owned slot counts for a user without hitting PostgREST's
-- max_rows limit that silently truncates SELECT results on large collections.
create or replace function public.get_owned_slot_counts(p_user_id uuid)
returns table(set_code text, owned_count bigint)
language sql stable security invoker
as $$
  select set_code, count(*)::bigint
  from public.owned_slots
  where user_id = p_user_id
  group by set_code;
$$;
