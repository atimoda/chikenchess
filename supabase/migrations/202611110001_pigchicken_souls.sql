-- PigChicKen's soul collection (the Biblioteca de almas, lib/pigchicken/soul-library.ts): each signed-in player
-- keeps in their account which souls they have caught, so the library follows them to another browser.
--
-- A collection only grows: for each entry of the catalogue, how many were caught (n), when the first one was
-- (at, in ms; 0: unknown) and the notes and weapons seen. So there is nothing to settle between two browsers: the one
-- function below merges what a browser has into the account's and gives the result back. Each side takes what the
-- other found, and nothing found is ever lost, whatever the order the browsers send in.
--
--   found: { "<entry id>": { "n": 3, "at": 1794360000000, "notes": ["tonic"], "weapons": ["arrow"] }, ... }
create table online_private.pigchicken_souls (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  found jsonb not null default '{}'::jsonb check (jsonb_typeof(found) = 'object' and octet_length(found::text) <= 100000),
  updated_at timestamptz not null default now()
);
alter table online_private.pigchicken_souls enable row level security;
revoke all on online_private.pigchicken_souls from public, anon, authenticated;
grant all on online_private.pigchicken_souls to service_role;

-- the marks (notes or weapons) of two copies of an entry as one list: only the known ones, in their fixed order
create function online_private.pigchicken_soul_marks(a jsonb, b jsonb, allowed text[]) returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(x order by array_position(allowed, x)), '[]'::jsonb)
  from unnest(allowed) as x
  where (jsonb_typeof(a) = 'array' and a ? x) or (jsonb_typeof(b) = 'array' and b ? x)
$$;

-- merges this browser's collection into mine and returns mine (an empty one just reads it). Signed in with an
-- account (not as a guest). What is not an entry (a bad id, no count) is left out; up to 400 entries a player.
create function public.pigchicken_souls_merge(p_found jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); cur jsonb; k text; v jsonb; was jsonb;
  n numeric; first_at numeric; was_at numeric;
begin
  if u is null or online_private.is_guest() then raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  if p_found is null or jsonb_typeof(p_found) is distinct from 'object' then raise exception 'INVALID_SOULS' using errcode = '22023'; end if;
  if octet_length(p_found::text) > 100000 then raise exception 'TOO_MANY_SOULS' using errcode = '22023'; end if;
  insert into online_private.pigchicken_souls (owner_id) values (u) on conflict (owner_id) do nothing;
  select s.found into cur from online_private.pigchicken_souls s where s.owner_id = u for update;
  for k, v in select e.key, e.value from jsonb_each(p_found) e loop
    if k !~ '^[a-z0-9.-]{1,80}$' or jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(v->'n') is distinct from 'number' then continue; end if;
    n := least(floor((v->>'n')::numeric), 1000000000);
    if n < 1 then continue; end if;
    first_at := case when jsonb_typeof(v->'at') = 'number' then floor((v->>'at')::numeric) else 0 end;
    if first_at < 0 or first_at > 100000000000000 then first_at := 0; end if;
    was := cur->k;
    was_at := coalesce((was->>'at')::numeric, 0);
    cur := jsonb_set(cur, array[k], jsonb_build_object(
      'n', greatest(n, coalesce((was->>'n')::numeric, 0)),
      'at', case when was_at > 0 and first_at > 0 then least(was_at, first_at) else greatest(was_at, first_at) end,
      'notes', online_private.pigchicken_soul_marks(was->'notes', v->'notes', array['tonic', 'consonant', 'tension', 'leading', 'outside']),
      'weapons', online_private.pigchicken_soul_marks(was->'weapons', v->'weapons', array['blast', 'bullet', 'arrow', 'impact'])), true);
  end loop;
  if (select count(*) from jsonb_object_keys(cur)) > 400 then raise exception 'TOO_MANY_SOULS' using errcode = '22023'; end if;
  update online_private.pigchicken_souls s set found = cur, updated_at = clock_timestamp() where s.owner_id = u and s.found is distinct from cur;
  return cur;
end $$;

revoke all on function online_private.pigchicken_soul_marks(jsonb, jsonb, text[]) from public, anon, authenticated;
revoke all on function public.pigchicken_souls_merge(jsonb) from public, anon;
grant execute on function public.pigchicken_souls_merge(jsonb) to authenticated, service_role;
