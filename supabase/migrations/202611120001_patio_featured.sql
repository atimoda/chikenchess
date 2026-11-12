-- "Destaque": an admin marks a Pátio as featured, and the Playgrounds panel lists every featured Pátio in its first
-- block ("Destaques"), for everyone. Featured Pátios join every player's list (patio_lobby_list), whoever made them.
-- Only an admin features or unfeatures one (patio_lobby_set_featured). The default Pátio becomes the admin's in its
-- people (creator and godparent: the account with profile code 7B23E26B10944F18, "jéjé") and is featured too, so it
-- is opened and edited from Destaques like any other.
alter table online_private.patio_lobbies add column featured boolean not null default false;
create index patio_lobbies_featured on online_private.patio_lobbies (featured) where featured;

create or replace function online_private.patio_lobby_json(l online_private.patio_lobbies, with_layout boolean) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', l.id, 'name', l.name, 'revision', l.revision,
    'creator_id', l.creator_id, 'godparent_id', l.godparent_id, 'saved_by', l.saved_by,
    'is_default', l.is_default, 'featured', l.featured, 'editors', to_jsonb(l.editors),
    'created_at', l.created_at, 'updated_at', l.updated_at, 'last_edited_at', l.last_edited_at, 'last_played_at', l.last_played_at,
    'creator_name', (select p.display_name from public.online_profiles p where p.id = l.creator_id),
    'favorite', exists (select 1 from online_private.patio_lobby_favorites f where f.lobby_id = l.id and f.user_id = auth.uid()),
    'can_edit', online_private.patio_can_edit(l, auth.uid()),
    'favorites', (select count(*) from online_private.patio_lobby_favorites f where f.lobby_id = l.id),
    'plays', (select count(*) from online_private.patio_lobby_people pp where pp.lobby_id = l.id and pp.played_at is not null),
    'mine', coalesce(auth.uid() in (l.creator_id, l.saved_by, l.godparent_id), false)
      or exists (select 1 from online_private.patio_lobby_people pp where pp.lobby_id = l.id and pp.user_id = auth.uid() and pp.edited_at is not null)
  )
  || case when with_layout then jsonb_build_object(
    'layout', l.layout,
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', x.user_id, 'display_name', p.display_name, 'points', p.points, 'golden_eggs', p.golden_eggs, 'wins', p.wins_count,
        'edited_at', x.edited_at, 'played_at', x.played_at
      ) order by coalesce(x.edited_at, x.played_at) desc)
      from (
        select pp.user_id, pp.edited_at, pp.played_at from online_private.patio_lobby_people pp where pp.lobby_id = l.id
        union select u, null, null from unnest(array[l.creator_id, l.godparent_id]) u
          where u is not null and not exists (select 1 from online_private.patio_lobby_people q where q.lobby_id = l.id and q.user_id = u)
      ) x
      left join public.online_profiles p on p.id = x.user_id
    ), '[]'::jsonb)
  ) else '{}'::jsonb end
$$;

-- the featured Pátios come in every list (the "Destaques" block), as well as mine and my favourites
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
        or l.featured
        or l.creator_id = u or l.saved_by = u or l.godparent_id = u
        or exists (select 1 from online_private.patio_lobby_people pp where pp.lobby_id = l.id and pp.user_id = u and pp.edited_at is not null)
        or exists (select 1 from online_private.patio_lobby_favorites f where f.lobby_id = l.id and f.user_id = u)
      order by l.updated_at desc
      limit 500
    ) l
  ), '[]'::jsonb);
end $$;

-- admin: feature a Pátio (Destaques) or take it out; a featured Pátio is never an unsaved one (it keeps a name)
create function public.patio_lobby_set_featured(p_id uuid, p_on boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare l online_private.patio_lobbies;
begin
  if not online_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  update online_private.patio_lobbies set featured = coalesce(p_on, false), name = case when coalesce(p_on, false) then coalesce(name, 'Pátio em destaque') else name end
    where id = p_id returning * into l;
  if not found then raise exception 'PATIO_NOT_FOUND' using errcode = 'P0002'; end if;
  return online_private.patio_lobby_json(l, false);
end $$;

-- the featured Pátios for anyone, also without an account (the Destaques block before signing in)
create function public.patio_lobby_featured() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(online_private.patio_lobby_json(l, false) order by l.is_default desc, l.updated_at desc), '[]'::jsonb)
  from (select * from online_private.patio_lobbies where featured order by updated_at desc limit 100) l
$$;

revoke all on function public.patio_lobby_set_featured(uuid, boolean), public.patio_lobby_featured() from public, anon;
grant execute on function public.patio_lobby_set_featured(uuid, boolean) to authenticated, service_role;
grant execute on function public.patio_lobby_featured() to anon, authenticated, service_role;

-- the default Pátio: the admin's account is its creator and godparent, and it is featured
do $$
declare admin_id uuid;
begin
  select id into admin_id from public.online_profiles where code = '7B23E26B10944F18';
  if admin_id is null then return; end if;
  update online_private.patio_lobbies set creator_id = admin_id, godparent_id = admin_id, saved_by = admin_id, featured = true where is_default;
end $$;

notify pgrst, 'reload schema';
