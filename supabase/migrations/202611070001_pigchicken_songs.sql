-- PigChicKen's songs (the jukebox's library, lib/pigchicken/song-library.ts): each signed-in player keeps a
-- personal library in their account, so the songs they make or save follow them to another browser. The admin
-- sees everyone's songs (and can open any of them) but writes only to their own library.
--
-- Every call goes through the functions below:
--   list my songs: id, name, revision and dates only (the browser fetches the bodies it does not have yet);
--   get a song: its owner, or the admin;
--   save / delete: only in my own library, signed in with an account (not as a guest);
--   list everyone's: the admin.
create table online_private.pigchicken_songs (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[a-z0-9-]{1,80}$'),
  name text not null check (char_length(name) between 1 and 60),
  song jsonb not null check (jsonb_typeof(song) = 'object' and jsonb_typeof(song->'aliens') = 'array' and octet_length(song::text) <= 400000),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);
create index pigchicken_songs_updated on online_private.pigchicken_songs (updated_at desc);
alter table online_private.pigchicken_songs enable row level security;
revoke all on online_private.pigchicken_songs from public, anon, authenticated;
grant all on online_private.pigchicken_songs to service_role;

create function online_private.pigchicken_song_info(s online_private.pigchicken_songs) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('owner_id', s.owner_id, 'id', s.id, 'name', s.name, 'revision', s.revision, 'created_at', s.created_at, 'updated_at', s.updated_at,
    'owner_name', (select p.display_name from public.online_profiles p where p.id = s.owner_id))
$$;

-- my library (no bodies): the browser compares the revisions with the ones it holds
create function public.pigchicken_song_list() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null or online_private.is_guest() then raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(online_private.pigchicken_song_info(s) order by s.updated_at desc)
    from online_private.pigchicken_songs s where s.owner_id = u), '[]'::jsonb);
end $$;

-- the admin: everyone's songs (no bodies), the latest first
create function public.pigchicken_song_list_all() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not online_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(online_private.pigchicken_song_info(s) order by s.updated_at desc)
    from (select * from online_private.pigchicken_songs order by updated_at desc limit 1000) s), '[]'::jsonb);
end $$;

-- one song with its body: mine (p_owner null), or anyone's for the admin
create function public.pigchicken_song_get(p_id text, p_owner uuid default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid(); s online_private.pigchicken_songs;
begin
  if u is null or online_private.is_guest() then raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  if p_owner is not null and p_owner <> u and not online_private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select * into s from online_private.pigchicken_songs where owner_id = coalesce(p_owner, u) and id = p_id;
  if not found then return null; end if;
  return online_private.pigchicken_song_info(s) || jsonb_build_object('song', s.song);
end $$;

-- saves a song in my library. p_revision: the revision this browser last had (0: a new song); another one means it
-- was saved elsewhere in the meantime (SONG_CONFLICT). Up to 200 songs a player.
create function public.pigchicken_song_save(p_id text, p_song jsonb, p_revision integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); s online_private.pigchicken_songs; clean text := left(nullif(btrim(coalesce(p_song->>'name', '')), ''), 60);
begin
  if u is null or online_private.is_guest() then raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  if p_id is null or p_id !~ '^[a-z0-9-]{1,80}$' or p_id = 'campanha' then raise exception 'INVALID_SONG' using errcode = '22023'; end if;
  if p_song is null or jsonb_typeof(p_song) is distinct from 'object' or jsonb_typeof(p_song->'aliens') is distinct from 'array' then raise exception 'INVALID_SONG' using errcode = '22023'; end if;
  if octet_length(p_song::text) > 400000 then raise exception 'SONG_TOO_LARGE' using errcode = '22023'; end if;
  select * into s from online_private.pigchicken_songs where owner_id = u and id = p_id for update;
  if not found then
    if coalesce(p_revision, 0) <> 0 then raise exception 'SONG_CONFLICT' using errcode = '40001'; end if;
    if (select count(*) from online_private.pigchicken_songs where owner_id = u) >= 200 then raise exception 'TOO_MANY_SONGS' using errcode = '22023'; end if;
    insert into online_private.pigchicken_songs (owner_id, id, name, song) values (u, p_id, coalesce(clean, 'Música'), p_song) returning * into s;
  else
    if p_revision is distinct from s.revision then raise exception 'SONG_CONFLICT' using errcode = '40001'; end if;
    update online_private.pigchicken_songs set song = p_song, name = coalesce(clean, name), revision = revision + 1, updated_at = clock_timestamp()
      where owner_id = u and id = p_id returning * into s;
  end if;
  return jsonb_build_object('id', s.id, 'revision', s.revision, 'updated_at', s.updated_at);
end $$;

create function public.pigchicken_song_delete(p_id text) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null or online_private.is_guest() then raise exception 'ACCOUNT_REQUIRED' using errcode = '42501'; end if;
  delete from online_private.pigchicken_songs where owner_id = u and id = p_id;
end $$;

revoke all on function online_private.pigchicken_song_info(online_private.pigchicken_songs) from public, anon, authenticated;
revoke all on function public.pigchicken_song_list(), public.pigchicken_song_list_all(), public.pigchicken_song_get(text, uuid),
  public.pigchicken_song_save(text, jsonb, integer), public.pigchicken_song_delete(text) from public, anon;
grant execute on function public.pigchicken_song_list(), public.pigchicken_song_list_all(), public.pigchicken_song_get(text, uuid),
  public.pigchicken_song_save(text, jsonb, integer), public.pigchicken_song_delete(text) to authenticated, service_role;
