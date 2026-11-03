-- The Pátio's lobbies (a Pátio and a lobby are the same thing): each one keeps its layout (the editor mode's
-- elements, lib/pigchicken/layout.ts), who created it, who named it (the godparent), who saved it, who edited
-- and who played it, and the players' favourites. A lobby with no name is "not saved": it is deleted after 30 days
-- without edits and without being played. A named lobby stays until its owner or an admin deletes it. One lobby
-- can be the default Pátio, the layout every new Pátio starts from (set by the admin).
--
-- Every write goes through the functions below, which check who may do what:
--   edit the layout: the admin, the creator, or a player in `editors` (the lobby panel's "Edit mode" column);
--     the default Pátio only the admin, whoever created it;
--   the first name: anyone who may edit (they become the godparent); renaming later: creator, godparent, admin;
--   delete: creator, whoever saved it, admin; set the default and see unsaved lobbies of others: admin;
--   the editors list: the creator or an admin.
create table online_private.patio_lobbies (
  id uuid primary key,
  name text check (name is null or char_length(name) between 1 and 60),
  layout jsonb not null check (jsonb_typeof(layout) = 'object' and jsonb_typeof(layout->'elements') = 'array' and octet_length(layout::text) <= 400000),
  revision integer not null default 1,
  creator_id uuid references auth.users(id) on delete set null,
  godparent_id uuid references auth.users(id) on delete set null,
  saved_by uuid references auth.users(id) on delete set null,
  is_default boolean not null default false,
  editors uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_edited_at timestamptz not null default now(),
  last_played_at timestamptz
);
create unique index patio_lobbies_one_default on online_private.patio_lobbies (is_default) where is_default;
create index patio_lobbies_creator on online_private.patio_lobbies (creator_id);
create index patio_lobbies_unsaved on online_private.patio_lobbies (last_edited_at) where name is null;

create table online_private.patio_lobby_people (
  lobby_id uuid not null references online_private.patio_lobbies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  edited_at timestamptz,
  played_at timestamptz,
  primary key (lobby_id, user_id)
);
create index patio_lobby_people_user on online_private.patio_lobby_people (user_id);

create table online_private.patio_lobby_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  lobby_id uuid not null references online_private.patio_lobbies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lobby_id)
);

alter table online_private.patio_lobbies enable row level security;
alter table online_private.patio_lobby_people enable row level security;
alter table online_private.patio_lobby_favorites enable row level security;
revoke all on online_private.patio_lobbies, online_private.patio_lobby_people, online_private.patio_lobby_favorites from public, anon, authenticated;
grant all on online_private.patio_lobbies, online_private.patio_lobby_people, online_private.patio_lobby_favorites to service_role;

-- the caller is the application admin (the same rule as online_private.require_admin, without raising). Every
-- permission check here is a plain true / false, never null: plpgsql's `if not null` would let anyone through.
create function online_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and not coalesce((coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb->>'is_anonymous')::boolean, false)
    and (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb->'app_metadata'->>'access_level') is not distinct from 'admin'
$$;
create function online_private.is_guest() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is null or coalesce((coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb->>'is_anonymous')::boolean, false)
$$;

-- the default Pátio is the admin's alone, whoever made it
create function online_private.patio_can_edit(l online_private.patio_lobbies, u uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select online_private.is_admin() or coalesce(u is not null and not l.is_default and (l.creator_id = u or u = any(l.editors)), false)
$$;

-- unsaved lobbies (no name) with no edit and no play for 30 days go away; the default never does
create function online_private.patio_cleanup_unsaved() returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from online_private.patio_lobbies
  where name is null and not is_default
    and greatest(last_edited_at, coalesce(last_played_at, last_edited_at)) < clock_timestamp() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;

-- a lobby as the Pátio reads it: layout, names, the people around it (display names from the public profiles)
create function online_private.patio_lobby_json(l online_private.patio_lobbies, with_layout boolean) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', l.id, 'name', l.name, 'revision', l.revision,
    'creator_id', l.creator_id, 'godparent_id', l.godparent_id, 'saved_by', l.saved_by,
    'is_default', l.is_default, 'editors', to_jsonb(l.editors),
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

create function public.patio_lobby_get(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l online_private.patio_lobbies;
begin
  select * into l from online_private.patio_lobbies where id = p_id;
  if not found then return null; end if;
  return online_private.patio_lobby_json(l, true);
end $$;

-- the default Pátio (null: the code's own)
create function public.patio_default() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare l online_private.patio_lobbies;
begin
  select * into l from online_private.patio_lobbies where is_default;
  if not found then return null; end if;
  return online_private.patio_lobby_json(l, true);
end $$;

-- saves the layout. A lobby the server does not have yet is created with the caller as its creator (the "Criar meu
-- Pátio" copy). p_revision is the revision the editor started from (0 for a new one): saving over a newer one fails
-- with PATIO_CONFLICT instead of silently discarding another player's change.
create function public.patio_lobby_save(p_id uuid, p_layout jsonb, p_revision integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); l online_private.patio_lobbies;
begin
  if u is null then raise exception 'UNAUTHORIZED' using errcode = '42501'; end if;
  if p_layout is null or jsonb_typeof(p_layout) is distinct from 'object' or jsonb_typeof(p_layout->'elements') is distinct from 'array' then
    raise exception 'INVALID_LAYOUT' using errcode = '22023';
  end if;
  if octet_length(p_layout::text) > 400000 then raise exception 'LAYOUT_TOO_LARGE' using errcode = '22023'; end if;
  select * into l from online_private.patio_lobbies where id = p_id for update;
  if not found then
    if coalesce(p_revision, 0) <> 0 then raise exception 'PATIO_NOT_FOUND' using errcode = 'P0002'; end if;
    insert into online_private.patio_lobbies (id, layout, creator_id) values (p_id, p_layout, u) returning * into l;
  else
    if not online_private.patio_can_edit(l, u) then raise exception 'PATIO_EDIT_FORBIDDEN' using errcode = '42501'; end if;
    if l.revision <> coalesce(p_revision, -1) then raise exception 'PATIO_CONFLICT' using errcode = '40001'; end if;
    update online_private.patio_lobbies
      set layout = p_layout, revision = revision + 1, updated_at = clock_timestamp(), last_edited_at = clock_timestamp()
      where id = p_id returning * into l;
  end if;
  insert into online_private.patio_lobby_people (lobby_id, user_id, edited_at) values (l.id, u, clock_timestamp())
    on conflict (lobby_id, user_id) do update set edited_at = excluded.edited_at;
  return jsonb_build_object('id', l.id, 'revision', l.revision, 'updated_at', l.updated_at);
end $$;

-- names the lobby. The first name may come from anyone who may edit it, who becomes its godparent and the account
-- it is saved to; after that only the creator, the godparent or an admin rename it.
create function public.patio_lobby_rename(p_id uuid, p_name text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); l online_private.patio_lobbies; clean text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if u is null or online_private.is_guest() then raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  if clean is null or char_length(clean) > 60 then raise exception 'INVALID_NAME' using errcode = '22023'; end if;
  select * into l from online_private.patio_lobbies where id = p_id for update;
  if not found then raise exception 'PATIO_NOT_FOUND' using errcode = 'P0002'; end if;
  if l.name is null then
    if not online_private.patio_can_edit(l, u) then raise exception 'PATIO_RENAME_FORBIDDEN' using errcode = '42501'; end if;
    update online_private.patio_lobbies set name = clean, godparent_id = coalesce(godparent_id, u), saved_by = coalesce(saved_by, u), updated_at = clock_timestamp()
      where id = p_id returning * into l;
  else
    if not (online_private.is_admin() or coalesce(not l.is_default and (l.creator_id = u or l.godparent_id = u), false)) then raise exception 'PATIO_RENAME_FORBIDDEN' using errcode = '42501'; end if;
    update online_private.patio_lobbies set name = clean, updated_at = clock_timestamp() where id = p_id returning * into l;
  end if;
  return online_private.patio_lobby_json(l, false);
end $$;

create function public.patio_lobby_favorite(p_id uuid, p_on boolean) returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null or online_private.is_guest() then raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  if not exists (select 1 from online_private.patio_lobbies where id = p_id) then raise exception 'PATIO_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_on then insert into online_private.patio_lobby_favorites (user_id, lobby_id) values (u, p_id) on conflict do nothing;
  else delete from online_private.patio_lobby_favorites where user_id = u and lobby_id = p_id; end if;
  return p_on;
end $$;

-- a signed-in player played this lobby (guests are not counted)
create function public.patio_lobby_played(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null or online_private.is_guest() then return; end if;
  update online_private.patio_lobbies set last_played_at = clock_timestamp() where id = p_id;
  if not found then return; end if;
  insert into online_private.patio_lobby_people (lobby_id, user_id, played_at) values (p_id, u, clock_timestamp())
    on conflict (lobby_id, user_id) do update set played_at = excluded.played_at;
end $$;

-- the "Abrir" lists: my lobbies (created, saved, apadrinhados or edited: `mine`) and my favourites; "Ver todos"
-- (p_all) adds every saved (named) lobby, and for the admin every lobby, saved or not. Each row carries how many
-- players favourited it and how many (signed in) played it. Each read also runs the 30-day cleanup, so it happens even where pg_cron is not available.
create function public.patio_lobby_list(p_all boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); admin boolean := online_private.is_admin();
begin
  if u is null then raise exception 'UNAUTHORIZED' using errcode = '42501'; end if;
  perform online_private.patio_cleanup_unsaved();
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

create function public.patio_lobby_delete(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); l online_private.patio_lobbies;
begin
  if u is null then raise exception 'UNAUTHORIZED' using errcode = '42501'; end if;
  select * into l from online_private.patio_lobbies where id = p_id for update;
  if not found then return; end if;
  if not (online_private.is_admin() or coalesce(l.creator_id = u or l.saved_by = u, false)) then raise exception 'PATIO_DELETE_FORBIDDEN' using errcode = '42501'; end if;
  if l.is_default then raise exception 'PATIO_IS_DEFAULT' using errcode = '22023'; end if;
  delete from online_private.patio_lobbies where id = p_id;
end $$;

-- admin: this lobby becomes the default Pátio (the layout every new one copies)
create function public.patio_lobby_set_default(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not online_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if not exists (select 1 from online_private.patio_lobbies where id = p_id) then raise exception 'PATIO_NOT_FOUND' using errcode = 'P0002'; end if;
  update online_private.patio_lobbies set is_default = false where is_default and id <> p_id;
  update online_private.patio_lobbies set is_default = true, name = coalesce(name, 'Pátio padrão'), saved_by = coalesce(saved_by, auth.uid()), updated_at = clock_timestamp() where id = p_id;
end $$;

-- admin: a new lobby with the same layout under another name (the caller is its creator and godparent)
create function public.patio_lobby_duplicate(p_id uuid, p_name text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); src online_private.patio_lobbies; l online_private.patio_lobbies; clean text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if not online_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if clean is null or char_length(clean) > 60 then raise exception 'INVALID_NAME' using errcode = '22023'; end if;
  select * into src from online_private.patio_lobbies where id = p_id;
  if not found then raise exception 'PATIO_NOT_FOUND' using errcode = 'P0002'; end if;
  insert into online_private.patio_lobbies (id, name, layout, creator_id, godparent_id, saved_by)
    values (gen_random_uuid(), clean, src.layout, u, u, u) returning * into l;
  insert into online_private.patio_lobby_people (lobby_id, user_id, edited_at) values (l.id, u, clock_timestamp());
  return online_private.patio_lobby_json(l, false);
end $$;

-- the lobby panel's "Edit mode" column: who besides the creator may edit (the owner or an admin decide; not on the
-- default Pátio, which stays the admin's). Up to 100 players, no repeats, not the creator.
create function public.patio_lobby_set_editors(p_lobby_id uuid, p_editors uuid[]) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); l online_private.patio_lobbies; clean uuid[];
begin
  if u is null or online_private.is_guest() then raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  select * into l from online_private.patio_lobbies where id = p_lobby_id for update;
  if not found then raise exception 'PATIO_NOT_FOUND' using errcode = 'P0002'; end if;
  if not (online_private.is_admin() or coalesce(not l.is_default and l.creator_id = u, false)) then raise exception 'PATIO_EDITORS_FORBIDDEN' using errcode = '42501'; end if;
  select coalesce(array_agg(distinct e), '{}') into clean from unnest(coalesce(p_editors, '{}')) e where e is not null and e is distinct from l.creator_id;
  if cardinality(clean) > 100 then raise exception 'TOO_MANY_EDITORS' using errcode = '22023'; end if;
  update online_private.patio_lobbies set editors = clean, updated_at = clock_timestamp() where id = p_lobby_id returning * into l;
  return online_private.patio_lobby_json(l, false);
end $$;

revoke all on function online_private.is_admin(), online_private.is_guest(), online_private.patio_can_edit(online_private.patio_lobbies, uuid),
  online_private.patio_cleanup_unsaved(), online_private.patio_lobby_json(online_private.patio_lobbies, boolean) from public, anon, authenticated;
revoke all on function public.patio_lobby_get(uuid), public.patio_default(), public.patio_lobby_save(uuid, jsonb, integer), public.patio_lobby_rename(uuid, text),
  public.patio_lobby_favorite(uuid, boolean), public.patio_lobby_played(uuid), public.patio_lobby_list(boolean), public.patio_lobby_delete(uuid),
  public.patio_lobby_set_default(uuid), public.patio_lobby_duplicate(uuid, text), public.patio_lobby_set_editors(uuid, uuid[]) from public, anon;
grant execute on function public.patio_lobby_get(uuid), public.patio_default() to anon, authenticated, service_role;
grant execute on function public.patio_lobby_save(uuid, jsonb, integer), public.patio_lobby_rename(uuid, text), public.patio_lobby_favorite(uuid, boolean),
  public.patio_lobby_played(uuid), public.patio_lobby_list(boolean), public.patio_lobby_delete(uuid), public.patio_lobby_set_default(uuid),
  public.patio_lobby_duplicate(uuid, text), public.patio_lobby_set_editors(uuid, uuid[]) to authenticated, service_role;

-- the daily cleanup, where pg_cron is installed (otherwise the list call above does it)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('patio-cleanup-unsaved', '17 4 * * *', 'select online_private.patio_cleanup_unsaved()');
  end if;
end $$;
