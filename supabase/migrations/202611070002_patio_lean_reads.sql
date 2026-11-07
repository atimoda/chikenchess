-- Less Supabase work for the Pátios, before the online Pátio multiplies the calls:
-- 1. The 30-day cleanup of unsaved lobbies ran (a DELETE) on every "Abrir" list. It now runs at most once a day:
--    the first list call of the day does it, the others skip it. pg_cron, where installed, keeps its own schedule.
-- 2. Reading a Pátio sent the whole people list (creator, godparent, who edited and played, with their profiles)
--    every time, also after each autosave. Each read now carries `people_hash` (md5 of that list); a caller that
--    sends the hash it already holds (p_known_people) gets the row without `people` while the list is unchanged.
--    Calls without the new argument keep the full response, so older frontends work unchanged.

create table online_private.patio_maintenance (
  task text primary key,
  last_run timestamptz not null
);
alter table online_private.patio_maintenance enable row level security;
revoke all on online_private.patio_maintenance from public, anon, authenticated;
grant all on online_private.patio_maintenance to service_role;

-- the cleanup, at most once a day: claims the day's run atomically, so two lists at the same moment do not both run it
create function online_private.patio_cleanup_unsaved_daily() returns integer language plpgsql security definer set search_path = '' as $$
declare due boolean;
begin
  insert into online_private.patio_maintenance (task, last_run) values ('cleanup_unsaved', clock_timestamp())
    on conflict (task) do update set last_run = excluded.last_run
    where online_private.patio_maintenance.last_run < clock_timestamp() - interval '1 day'
    returning true into due;
  if not coalesce(due, false) then return 0; end if;
  return online_private.patio_cleanup_unsaved();
end $$;

create or replace function public.patio_lobby_list(p_all boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); admin boolean := online_private.is_admin();
begin
  if u is null then raise exception 'UNAUTHORIZED' using errcode = '42501'; end if;
  perform online_private.patio_cleanup_unsaved_daily();
  return coalesce((
    select jsonb_agg(online_private.patio_lobby_json(l, false) order by l.is_default desc, l.updated_at desc)
    from (
      select * from online_private.patio_lobbies l
      where (p_all and (admin or l.name is not null or l.is_default))
        or l.creator_id = u or l.saved_by = u or l.godparent_id = u
        or exists (select 1 from online_private.patio_lobby_people pp where pp.lobby_id = l.id and pp.user_id = u and pp.edited_at is not null)
        or exists (select 1 from online_private.patio_lobby_favorites f where f.lobby_id = l.id and f.user_id = u)
      order by l.updated_at desc
      limit 500
    ) l
  ), '[]'::jsonb);
end $$;

-- a full lobby row with `people_hash`, and without `people` when the caller already holds that list
create function online_private.patio_lean_people(j jsonb, known text) returns jsonb language sql immutable set search_path = '' as $$
  select case when j ? 'people' then
    (j - 'people') || jsonb_build_object('people_hash', md5((j->'people')::text))
      || case when known is not distinct from md5((j->'people')::text) then '{}'::jsonb else jsonb_build_object('people', j->'people') end
  else j end
$$;

drop function public.patio_lobby_get(uuid, integer);
create function public.patio_lobby_get(p_id uuid, p_known_revision integer default null, p_known_people text default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l online_private.patio_lobbies; j jsonb;
begin
  select * into l from online_private.patio_lobbies where id = p_id;
  if not found then return null; end if;
  j := online_private.patio_lobby_json(l, true);
  if p_known_revision is not distinct from l.revision then j := j - 'layout'; end if;
  return online_private.patio_lean_people(j, p_known_people);
end $$;

drop function public.patio_default(uuid, integer);
create function public.patio_default(p_known_id uuid default null, p_known_revision integer default null, p_known_people text default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l online_private.patio_lobbies; j jsonb;
begin
  select * into l from online_private.patio_lobbies where is_default;
  if not found then return null; end if;
  j := online_private.patio_lobby_json(l, true);
  if p_known_id is not distinct from l.id and p_known_revision is not distinct from l.revision then j := j - 'layout'; end if;
  return online_private.patio_lean_people(j, p_known_people);
end $$;

revoke all on function online_private.patio_cleanup_unsaved_daily(), online_private.patio_lean_people(jsonb, text) from public, anon, authenticated;
revoke all on function public.patio_lobby_get(uuid, integer, text), public.patio_default(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.patio_lobby_get(uuid, integer, text), public.patio_default(uuid, integer, text) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
