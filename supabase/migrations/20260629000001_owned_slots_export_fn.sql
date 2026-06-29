-- Returns all owned slots for a user without hitting PostgREST's max_rows
-- limit, which would silently truncate a data export for large collections.
create or replace function public.get_owned_slots_export(p_user_id uuid)
returns table(slot_id text, set_code text, date_owned timestamptz)
language sql stable security invoker
as $$
  select slot_id, set_code, date_owned
  from public.owned_slots
  where user_id = p_user_id
  order by set_code, slot_id;
$$;
