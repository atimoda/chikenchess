-- Reduce Supabase egress for the chicken configuration and the Pátios: the client sends the revision it already
-- holds and the server leaves out the heavy part (config / layout) when that revision is still current. Calls
-- without the new arguments keep the full response, so older frontends continue to work unchanged.

-- Chicken config: read by every visitor of the globe. With p_known_revision equal to the saved revision only
-- the revision and its timestamp come back; the browser keeps the cached config it already has.
drop function public.chicken_config();
create function public.chicken_config(p_known_revision integer default null) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('revision',c.revision,'updated_at',c.updated_at)
    || case when p_known_revision is not distinct from c.revision then '{}'::jsonb else jsonb_build_object('config',c.config) end
  from online_private.chicken_config c where c.id='player'
$$;
revoke all on function public.chicken_config(integer) from public, anon;
grant execute on function public.chicken_config(integer) to anon, authenticated, service_role;

-- Pátios: the layout (up to 400 kB) is left out when the caller already holds that revision. Everything else
-- (names, people, favourites, plays) still comes back, so the panels refresh exactly as before.
drop function public.patio_lobby_get(uuid);
create function public.patio_lobby_get(p_id uuid, p_known_revision integer default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l online_private.patio_lobbies;
begin
  select * into l from online_private.patio_lobbies where id = p_id;
  if not found then return null; end if;
  if p_known_revision is not distinct from l.revision then return online_private.patio_lobby_json(l, true) - 'layout'; end if;
  return online_private.patio_lobby_json(l, true);
end $$;

-- the default Pátio: p_known_id and p_known_revision name the copy the browser keeps; the layout is left out
-- only when it is still that same lobby at that same revision
drop function public.patio_default();
create function public.patio_default(p_known_id uuid default null, p_known_revision integer default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l online_private.patio_lobbies;
begin
  select * into l from online_private.patio_lobbies where is_default;
  if not found then return null; end if;
  if p_known_id is not distinct from l.id and p_known_revision is not distinct from l.revision then return online_private.patio_lobby_json(l, true) - 'layout'; end if;
  return online_private.patio_lobby_json(l, true);
end $$;

revoke all on function public.patio_lobby_get(uuid, integer), public.patio_default(uuid, integer) from public, anon, authenticated;
grant execute on function public.patio_lobby_get(uuid, integer), public.patio_default(uuid, integer) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
