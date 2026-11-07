-- What the game server (server/, the online Pátio) needs to know about a Pátio when it opens a room for it: its
-- name, creator and godparent, for the lobby owner rule (the creator owns the lobby while present) and for who may
-- not be removed. A tiny row, read once per room, never the layout or the people list. Public data: the same
-- fields are already shown to anyone who opens the Pátio.
create function public.patio_lobby_meta(p_id uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', l.id, 'name', l.name, 'creator_id', l.creator_id, 'godparent_id', l.godparent_id, 'is_default', l.is_default)
  from online_private.patio_lobbies l where l.id = p_id
$$;
revoke all on function public.patio_lobby_meta(uuid) from public, anon, authenticated;
grant execute on function public.patio_lobby_meta(uuid) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
