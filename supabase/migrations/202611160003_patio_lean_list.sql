-- The Pátio lists (Playgrounds, a portal's destination, Destaques) leave the layouts in the table. They used to pass
-- each whole row (layout included, up to 400 kB) to online_private.patio_lobby_json, which then had to be fetched for
-- every Pátio in the list although the list never shows it. The row is now built with an empty layout in its place.
-- Counting a Pátio's favourites gets its own index (the primary key starts with the user).
create index if not exists patio_lobby_favorites_lobby on online_private.patio_lobby_favorites (lobby_id);

create or replace function public.patio_lobby_list(p_all boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); admin boolean := online_private.is_admin();
begin
  if u is null then raise exception 'UNAUTHORIZED' using errcode = '42501'; end if;
  perform online_private.patio_cleanup_unsaved_daily();
  return coalesce((
    select jsonb_agg(online_private.patio_lobby_json(row(
        l.id, l.name, '{"elements":[]}'::jsonb, l.revision, l.creator_id, l.godparent_id, l.saved_by, l.is_default, l.editors,
        l.created_at, l.updated_at, l.last_edited_at, l.last_played_at, l.featured
      )::online_private.patio_lobbies, false) order by l.is_default desc, l.updated_at desc)
    from (
      select l.id, l.name, l.revision, l.creator_id, l.godparent_id, l.saved_by, l.is_default, l.editors,
        l.created_at, l.updated_at, l.last_edited_at, l.last_played_at, l.featured
      from online_private.patio_lobbies l
      where (p_all and (admin or l.name is not null or l.is_default))
        or l.featured
        or l.creator_id = u or l.saved_by = u or l.godparent_id = u
        or exists (select 1 from online_private.patio_lobby_people pp where pp.lobby_id = l.id and pp.user_id = u and pp.edited_at is not null)
        or exists (select 1 from online_private.patio_lobby_favorites f where f.lobby_id = l.id and f.user_id = u)
      order by l.updated_at desc
      limit 500
    ) l
  ), '[]'::jsonb);
end $$;

create or replace function public.patio_lobby_featured() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(online_private.patio_lobby_json(row(
      l.id, l.name, '{"elements":[]}'::jsonb, l.revision, l.creator_id, l.godparent_id, l.saved_by, l.is_default, l.editors,
      l.created_at, l.updated_at, l.last_edited_at, l.last_played_at, l.featured
    )::online_private.patio_lobbies, false) order by l.is_default desc, l.updated_at desc), '[]'::jsonb)
  from (
    select l.id, l.name, l.revision, l.creator_id, l.godparent_id, l.saved_by, l.is_default, l.editors,
      l.created_at, l.updated_at, l.last_edited_at, l.last_played_at, l.featured
    from online_private.patio_lobbies l where l.featured order by l.updated_at desc limit 100
  ) l
$$;

notify pgrst, 'reload schema';
