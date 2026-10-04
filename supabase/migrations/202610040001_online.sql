-- ChickenChess casual 1v1. Browser roles can SELECT authorized projections and
-- execute narrowly scoped RPCs, but never write a result, balance or position.
create schema if not exists online_private;
revoke all on schema online_private from public;
grant usage on schema online_private to authenticated, service_role;
grant usage on schema public to authenticated, service_role;

-- Server-side preset allowlist: add a migration when the city catalog grows.
create table online_private.kit_catalog (id text primary key);
insert into online_private.kit_catalog(id) values
  ('dusseldorf'),
  ('nyc'),
  ('chicago'),
  ('detroit'),
  ('ibiza'),
  ('manchester'),
  ('manchester-1999'),
  ('berlin'),
  ('tokyo'),
  ('london'),
  ('saopaulo'),
  ('johannesburg'),
  ('paris'),
  ('vienna'),
  ('buenos-aires-1940'),
  ('dublin-1990'),
  ('new-orleans-1953'),
  ('san-diego-1999'),
  ('london-1970'),
  ('berkeley-2004'),
  ('new-york-1961'),
  ('san-francisco-1993'),
  ('paris-1945'),
  ('columbus-2013'),
  ('new-york-1930'),
  ('jacksonville-1974'),
  ('chicago-1958'),
  ('rio-1930'),
  ('rio-1910'),
  ('recife-1935'),
  ('recife-1950'),
  ('piracicaba-1940'),
  ('rio-1960'),
  ('salvador-1992'),
  ('new-york-1962'),
  ('london-1977'),
  ('memphis-1967'),
  ('kingston-1973'),
  ('leipzig-1723'),
  ('vienna-1825'),
  ('oakland-1959'),
  ('canterbury-1972'),
  ('cambridge-1973'),
  ('istanbul-1970'),
  ('kalamata-1930'),
  ('santiago-del-estero-1960');
alter table online_private.kit_catalog enable row level security;

create table public.online_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  display_name text not null default 'Sir Clucks-a-Lot' check (char_length(display_name) between 1 and 40),
  points bigint not null default 10 check (points >= 0),
  golden_eggs bigint not null default 10 check (golden_eggs >= 0),
  wins_count bigint not null default 0 check (wins_count >= 0),
  updated_at timestamptz not null default now()
);
create table online_private.profile_saves (
  user_id uuid primary key references public.online_profiles(id) on delete cascade,
  profile jsonb not null,
  imported_at timestamptz not null default now(),
  transferred_to uuid references public.online_profiles(id)
);
create table online_private.profile_transfers (
  source_id uuid primary key references public.online_profiles(id),
  target_id uuid not null references public.online_profiles(id),
  choice text not null check (choice in ('source', 'target')),
  source_backup jsonb not null,
  target_backup jsonb not null,
  created_at timestamptz not null default now()
);
create table public.online_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(replace(gen_random_uuid()::text, '-', '')),
  is_public boolean not null default true,
  status text not null default 'open' check (status in ('open', 'playing', 'closed')),
  host_id uuid not null references public.online_profiles(id),
  match_id uuid,
  updated_at timestamptz not null default now()
);
create table public.online_room_members (
  room_id uuid not null references public.online_rooms(id),
  user_id uuid not null references public.online_profiles(id),
  color text not null check (color in ('w', 'b')),
  city_id text not null default 'dusseldorf' check (city_id ~ '^[a-z0-9-]{1,80}$'),
  ready boolean not null default false,
  primary key (room_id, user_id),
  unique (room_id, color), -- two colors: a third occupant is impossible even outside the RPC
  unique (user_id) -- a person cannot occupy two live lobbies
);
create table public.online_public_rooms (
  room_id uuid primary key references public.online_rooms(id),
  code text not null unique,
  creator_name text not null,
  players integer not null check (players between 0 and 1)
);
create table public.online_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.online_rooms(id),
  context_city_id text not null default 'dusseldorf',
  version integer not null default 0 check (version >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  rematch_id uuid references public.online_matches(id),
  settled_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.online_rooms add constraint online_rooms_match_fk foreign key (match_id) references public.online_matches(id);
create table public.online_match_members (
  match_id uuid not null references public.online_matches(id),
  user_id uuid not null references public.online_profiles(id),
  color text not null check (color in ('w', 'b')),
  city_id text not null check (city_id ~ '^[a-z0-9-]{1,80}$'),
  primary key (match_id, user_id), unique (match_id, color)
);
create table public.online_friendships (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.online_profiles(id),
  user_high uuid not null references public.online_profiles(id),
  sender_id uuid not null references public.online_profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'removed')),
  updated_at timestamptz not null default now(),
  check (user_low < user_high), check (sender_id in (user_low, user_high)),
  unique (user_low, user_high)
);
create table public.online_social_updates (
  user_id uuid primary key references public.online_profiles(id),
  revision bigint not null default 0
);
create table public.online_match_commands (
  match_id uuid not null references public.online_matches(id),
  command_id uuid not null,
  actor_id uuid not null references public.online_profiles(id),
  expected_version integer not null,
  command jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (match_id, command_id)
);
create table public.online_piece_params (
  match_id uuid not null references public.online_matches(id),
  piece_id text not null check (piece_id ~ '^(w:[a-h][12]|b:[a-h][78])$'),
  owner_id uuid not null references public.online_profiles(id),
  instrument jsonb not null check (jsonb_typeof(instrument) = 'object'),
  effects jsonb not null check (jsonb_typeof(effects) = 'object'),
  revision bigint not null default 1,
  primary key (match_id, piece_id)
);
create table public.online_match_updates (
  match_id uuid primary key references public.online_matches(id),
  version integer not null default 0,
  params_revision bigint not null default 0
);
create index online_match_members_user_idx on public.online_match_members(user_id, match_id);
create index online_friendships_high_idx on public.online_friendships(user_high);

create function online_private.is_room_member(p_room uuid, p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.online_room_members where room_id=p_room and user_id=p_user)
$$;
create function online_private.is_match_member(p_match uuid, p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.online_match_members where match_id=p_match and user_id=p_user)
$$;
create function online_private.can_read_profile(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_id=auth.uid()
    or exists (select 1 from public.online_friendships where status <> 'removed' and p_id in (user_low,user_high) and auth.uid() in (user_low,user_high))
    or exists (select 1 from public.online_room_members a join public.online_room_members b using(room_id) where a.user_id=auth.uid() and b.user_id=p_id)
    or exists (select 1 from public.online_match_members a join public.online_match_members b using(match_id) where a.user_id=auth.uid() and b.user_id=p_id)
$$;

alter table public.online_profiles enable row level security;
alter table public.online_rooms enable row level security;
alter table public.online_room_members enable row level security;
alter table public.online_public_rooms enable row level security;
alter table public.online_matches enable row level security;
alter table public.online_match_members enable row level security;
alter table public.online_friendships enable row level security;
alter table public.online_social_updates enable row level security;
alter table public.online_match_commands enable row level security;
alter table public.online_piece_params enable row level security;
alter table public.online_match_updates enable row level security;
alter table online_private.profile_saves enable row level security;
alter table online_private.profile_transfers enable row level security;
create policy profiles_read on public.online_profiles for select to authenticated using (online_private.can_read_profile(id));
create policy rooms_read on public.online_rooms for select to authenticated using (online_private.is_room_member(id));
create policy room_members_read on public.online_room_members for select to authenticated using (online_private.is_room_member(room_id));
create policy directory_read on public.online_public_rooms for select to authenticated using (true);
create policy matches_read on public.online_matches for select to authenticated using (online_private.is_match_member(id));
create policy match_members_read on public.online_match_members for select to authenticated using (online_private.is_match_member(match_id));
create policy friendships_read on public.online_friendships for select to authenticated using (auth.uid() in (user_low,user_high));
create policy social_read on public.online_social_updates for select to authenticated using (user_id=auth.uid());
create policy commands_read on public.online_match_commands for select to authenticated using (actor_id=auth.uid() and online_private.is_match_member(match_id));
create policy updates_read on public.online_match_updates for select to authenticated using (online_private.is_match_member(match_id));
create policy params_read on public.online_piece_params for select to authenticated using (online_private.is_match_member(match_id));

create function online_private.notify_match() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.online_match_updates(match_id,version) values(new.id,new.version) on conflict(match_id) do update set version=excluded.version;
  return new;
end $$;
create trigger notify_match after insert or update of version on public.online_matches for each row execute function online_private.notify_match();
create function online_private.notify_params() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.online_match_updates set params_revision=params_revision+1 where match_id=new.match_id;
  return new;
end $$;
create trigger notify_params after insert or update on public.online_piece_params for each row execute function online_private.notify_params();

create function online_private.rank(p_points bigint) returns text language sql immutable set search_path = '' as $$
  select case when p_points>=250 then 'Grandmaster Producer' when p_points>=120 then 'Synth Virtuoso' when p_points>=80 then 'Groove Master' when p_points>=40 then 'Rhythm Apprentice' else 'Novice Beatmaker' end
$$;
create function online_private.normalize_profile(p_raw jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare eggs bigint:=10; points bigint:=10; wins bigint:=0; cities jsonb:='[]';
begin
  if p_raw is not null then
    if jsonb_typeof(p_raw)<>'object' or octet_length(p_raw::text)>65536 then raise exception 'INVALID_PROFILE' using errcode='22023'; end if;
    if jsonb_typeof(p_raw->'conqueredCityIds')='array' then
      select coalesce(jsonb_agg(distinct value), '[]'::jsonb) into cities from jsonb_array_elements(p_raw->'conqueredCityIds') where jsonb_typeof(value)='string' and value#>>'{}' ~ '^[a-z0-9-]{1,80}$';
    end if;
    if coalesce(p_raw->>'winsCount','') ~ '^[0-9]{1,9}$' then wins:=(p_raw->>'winsCount')::bigint; else wins:=jsonb_array_length(cities); end if;
    if p_raw->>'profileVersion'='1' and coalesce(p_raw->>'goldenEggs','') ~ '^[0-9]{1,9}$' then
      eggs:=(p_raw->>'goldenEggs')::bigint;
      if coalesce(p_raw->>'points','') ~ '^[0-9]{1,9}$' then points:=greatest(eggs,(p_raw->>'points')::bigint); else points:=eggs; end if;
    else eggs:=10+wins*10; points:=eggs; end if;
  end if;
  return jsonb_build_object('profileVersion',1,'conqueredCityIds',cities,'goldenEggs',eggs,'points',points,'rank',online_private.rank(points),'winsCount',wins,'lastPlayedCityId',case when p_raw->>'lastPlayedCityId' ~ '^[a-z0-9-]{1,80}$' then p_raw->>'lastPlayedCityId' else null end,'updatedAt',floor(extract(epoch from clock_timestamp())*1000),'moveRewardNotices',jsonb_build_object('best',coalesce(p_raw->'moveRewardNotices'->'best'='true'::jsonb,false),'worst',coalesce(p_raw->'moveRewardNotices'->'worst'='true'::jsonb,false)),'gameplayTipSeen',coalesce(p_raw->'gameplayTipSeen'='true'::jsonb,false));
end $$;
create function online_private.profile_json(p_id uuid, p_viewer uuid default auth.uid()) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',p.id,'code',p.code,'display_name',p.display_name,'profile',
    case when p.id=p_viewer then s.profile else jsonb_build_object('profileVersion',1,'conqueredCityIds','[]'::jsonb,'goldenEggs',p.golden_eggs,'points',p.points,'rank',online_private.rank(p.points),'winsCount',p.wins_count,'lastPlayedCityId',null,'updatedAt',floor(extract(epoch from p.updated_at)*1000),'moveRewardNotices',jsonb_build_object('best',false,'worst',false),'gameplayTipSeen',false) end)
  from public.online_profiles p join online_private.profile_saves s on s.user_id=p.id where p.id=p_id
$$;
create function online_private.require_user() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
  if exists(select 1 from online_private.profile_saves where user_id=u and transferred_to is not null) then raise exception 'TRANSFERRED' using errcode='42501'; end if;
  return u;
end $$;
create function public.online_profile(p_local_profile jsonb default null,p_display_name text default null,p_expected_user_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); save jsonb; inserted integer;
begin
  if p_expected_user_id is not null and u is distinct from p_expected_user_id then raise exception 'FORBIDDEN_IDENTITY' using errcode='42501'; end if;
  -- Insert decides import ownership under a unique PK. Existing saves never reimport.
  save:=online_private.normalize_profile(p_local_profile);
  insert into public.online_profiles(id) values(u) on conflict(id) do nothing;
  insert into online_private.profile_saves(user_id,profile) values(u,save) on conflict(user_id) do nothing;
  get diagnostics inserted=row_count;
  if inserted=1 then update public.online_profiles set points=(save->>'points')::bigint,golden_eggs=(save->>'goldenEggs')::bigint,wins_count=(save->>'winsCount')::bigint where id=u; end if;
  if p_display_name is not null then
    if char_length(btrim(p_display_name)) not between 1 and 40 or p_display_name ~ '[[:cntrl:]]' then raise exception 'INVALID_NAME' using errcode='22023'; end if;
    update public.online_profiles set display_name=btrim(p_display_name),updated_at=now() where id=u;
    update public.online_public_rooms d set creator_name=btrim(p_display_name) from public.online_rooms r where d.room_id=r.id and r.host_id=u;
  end if;
  return online_private.profile_json(u,u);
end $$;
-- The campaign has an intentionally local/trusted economy. Sync is an
-- authenticated, optimistic replacement of that legacy save, not a ranked or
-- anti-cheat ledger. CAS prevents losing a concurrently settled online win.
create function public.online_sync_profile(p_expected_updated_at bigint,p_profile jsonb,p_expected_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); previous jsonb; replacement jsonb; stamp bigint;
begin
  if u is distinct from p_expected_user_id then raise exception 'FORBIDDEN_IDENTITY' using errcode='42501'; end if;
  perform 1 from public.online_profiles where id=u for update;
  select profile into previous from online_private.profile_saves where user_id=u for update;
  if previous is null then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
  replacement:=online_private.normalize_profile(p_profile);
  if replacement-'updatedAt'=previous-'updatedAt' then return online_private.profile_json(u,u); end if;
  if p_expected_updated_at is null or (previous->>'updatedAt')::bigint<>p_expected_updated_at then raise exception 'PROFILE_CONFLICT' using errcode='40001'; end if;
  stamp:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,(previous->>'updatedAt')::bigint+1);
  replacement:=replacement || jsonb_build_object('updatedAt',stamp);
  update online_private.profile_saves set profile=replacement where user_id=u;
  update public.online_profiles set points=(replacement->>'points')::bigint,golden_eggs=(replacement->>'goldenEggs')::bigint,wins_count=(replacement->>'winsCount')::bigint,updated_at=clock_timestamp() where id=u;
  return online_private.profile_json(u,u);
end $$;
create function online_private.initial_state() returns jsonb language sql immutable set search_path = '' as $$
  select '{"schema":1,"actions":[],"redo":null,"eggs":{"w":1,"b":1},"collected":{"w":0,"b":0},"rewarded":[],"suggestions":null,"seen":[],"result":null,"drawOffer":null,"rematchOffer":null}'::jsonb
$$;
create function online_private.room_json(p_room uuid,p_viewer uuid default auth.uid()) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',r.id,'code',r.code,'is_public',r.is_public,'status',r.status,'host_id',r.host_id,'match_id',r.match_id,'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'color',m.color,'city_id',m.city_id,'ready',m.ready,'profile',online_private.profile_json(m.user_id,p_viewer)) order by m.color desc) from public.online_room_members m where m.room_id=r.id),'[]'::jsonb)) from public.online_rooms r where r.id=p_room
$$;
create function online_private.refresh_directory(p_room uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.online_rooms; count_members integer;
begin
  select * into r from public.online_rooms where id=p_room;
  select count(*) into count_members from public.online_room_members where room_id=p_room;
  if r.is_public and r.status='open' and count_members<2 then
    insert into public.online_public_rooms(room_id,code,creator_name,players) select r.id,r.code,p.display_name,count_members from public.online_profiles p where p.id=r.host_id on conflict(room_id) do update set creator_name=excluded.creator_name,players=excluded.players;
  else delete from public.online_public_rooms where room_id=p_room; end if;
end $$;
create function public.online_rooms() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform online_private.require_user();
  return coalesce((select jsonb_agg(jsonb_build_object('code',code,'creator_name',creator_name,'players',players) order by code) from public.online_public_rooms),'[]'::jsonb);
end $$;
create function public.online_room(p_action text,p_code text default null,p_public boolean default true,p_city_id text default 'dusseldorf') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); r public.online_rooms; occupants integer; assigned_color text; new_match uuid;
begin
  if not exists(select 1 from public.online_profiles where id=u) then perform public.online_profile(); end if;
  if p_city_id is null or not exists(select 1 from online_private.kit_catalog where id=p_city_id) then raise exception 'INVALID_KIT' using errcode='22023'; end if;
  -- Serialize mutations from the same person across multiple rooms.
  perform 1 from public.online_profiles where id=u for update;
  if p_action='create' then
    if exists(select 1 from public.online_room_members where user_id=u) then raise exception 'ALREADY_IN_ROOM' using errcode='23505'; end if;
    insert into public.online_rooms(host_id,is_public) values(u,p_public) returning * into r;
    assigned_color:=case when random()<0.5 then 'w' else 'b' end;
    insert into public.online_room_members(room_id,user_id,color,city_id) values(r.id,u,assigned_color,p_city_id);
  else
    if p_action='get' and p_code is null then
      select x.* into r from public.online_rooms x join public.online_room_members mm on mm.room_id=x.id where mm.user_id=u for update of x;
      if not found then return null; end if;
    else select * into r from public.online_rooms where code=upper(btrim(p_code)) for update; end if;
    if not found then raise exception 'ROOM_NOT_FOUND' using errcode='P0002'; end if;
    if p_action='get' then return online_private.room_json(r.id,u); end if;
    if p_action='join' then
      if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
      if not online_private.is_room_member(r.id,u) then
        if exists(select 1 from public.online_room_members where user_id=u) then raise exception 'ALREADY_IN_ROOM' using errcode='23505'; end if;
        select count(*) into occupants from public.online_room_members where room_id=r.id;
        if occupants>=2 then raise exception 'ROOM_FULL' using errcode='23514'; end if;
        select case when exists(select 1 from public.online_room_members where room_id=r.id and color='w') then 'b' else 'w' end into assigned_color;
        insert into public.online_room_members(room_id,user_id,color,city_id) values(r.id,u,assigned_color,p_city_id);
        update public.online_room_members set ready=false where room_id=r.id;
      end if;
    else
      if not online_private.is_room_member(r.id,u) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      if p_action='leave' then
        if r.status='playing' and exists(select 1 from public.online_matches where id=r.match_id and state->'result'='null'::jsonb) then raise exception 'ACTIVE_MATCH' using errcode='23514'; end if;
        delete from public.online_room_members where room_id=r.id and user_id=u;
        update public.online_room_members set ready=false where room_id=r.id;
        select count(*) into occupants from public.online_room_members where room_id=r.id;
        update public.online_rooms set status=case when occupants=0 then 'closed' when r.status='playing' then 'closed' else 'open' end,host_id=coalesce((select user_id from public.online_room_members where room_id=r.id order by color limit 1),r.host_id),updated_at=now() where id=r.id;
        perform online_private.refresh_directory(r.id); return null;
      elsif p_action='kit' then
        if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
        update public.online_room_members set city_id=p_city_id,ready=false where room_id=r.id and user_id=u;
      elsif p_action='ready' then
        if r.status='playing' then return online_private.room_json(r.id,u); end if;
        if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
        update public.online_room_members set ready=true where room_id=r.id and user_id=u;
        if (select count(*)=2 and bool_and(ready) from public.online_room_members where room_id=r.id) then
          insert into public.online_matches(room_id,context_city_id,state) values(r.id,(select city_id from public.online_room_members where room_id=r.id and user_id=r.host_id),online_private.initial_state()) returning id into new_match;
          insert into public.online_match_members(match_id,user_id,color,city_id) select new_match,user_id,color,city_id from public.online_room_members where room_id=r.id;
          update public.online_rooms set status='playing',match_id=new_match where id=r.id;
        end if;
      else raise exception 'INVALID_ACTION' using errcode='22023'; end if;
    end if;
  end if;
  update public.online_rooms set updated_at=clock_timestamp() where id=r.id;
  perform online_private.refresh_directory(r.id);
  return online_private.room_json(r.id,u);
end $$;
create function public.online_friends(p_action text default 'list',p_target_code text default null,p_friend_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); target uuid; f public.online_friendships; affected uuid[];
begin
  if not exists(select 1 from public.online_profiles where id=u) then perform public.online_profile(); end if;
  if p_action='request' then
    select id into target from public.online_profiles where code=upper(btrim(p_target_code));
    if target is null then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
    if target=u then raise exception 'SELF_REQUEST' using errcode='22023'; end if;
    if exists(select 1 from online_private.profile_saves where user_id=target and transferred_to is not null) then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
    insert into public.online_friendships(user_low,user_high,sender_id) values(least(u,target),greatest(u,target),u) on conflict(user_low,user_high) do nothing;
    select * into f from public.online_friendships where user_low=least(u,target) and user_high=greatest(u,target) for update;
    if f.status='removed' then update public.online_friendships set status='pending',sender_id=u,updated_at=now() where id=f.id; end if;
    -- An inverse pending request remains pending: only recipient acceptance changes it.
    affected:=array[u,target];
  elsif p_action<>'list' then
    select * into f from public.online_friendships where id=p_friend_id and u in(user_low,user_high) for update;
    if not found then raise exception 'FRIEND_NOT_FOUND' using errcode='P0002'; end if;
    if p_action='accept' then
      if f.sender_id=u then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      if f.status='removed' then raise exception 'REQUEST_CLOSED' using errcode='23514'; end if;
      update public.online_friendships set status='accepted',updated_at=now() where id=f.id;
    elsif p_action='reject' then
      if f.sender_id=u or f.status='accepted' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      update public.online_friendships set status='removed',updated_at=now() where id=f.id;
    elsif p_action='cancel' then
      if f.sender_id<>u or f.status='accepted' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      update public.online_friendships set status='removed',updated_at=now() where id=f.id;
    elsif p_action='remove' then
      if f.status not in('accepted','removed') then raise exception 'REQUEST_PENDING' using errcode='23514'; end if;
      update public.online_friendships set status='removed',updated_at=now() where id=f.id;
    else raise exception 'INVALID_ACTION' using errcode='22023'; end if;
    affected:=array[f.user_low,f.user_high];
  end if;
  if affected is not null then insert into public.online_social_updates(user_id,revision) select unnest(affected),1 on conflict(user_id) do update set revision=public.online_social_updates.revision+1; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'sender_id',x.sender_id,'status',x.status,'profile',online_private.profile_json(case when x.user_low=u then x.user_high else x.user_low end,u)) order by x.updated_at desc) from public.online_friendships x where u in(x.user_low,x.user_high) and x.status<>'removed'),'[]'::jsonb);
end $$;
create function online_private.match_json(p_match uuid,p_viewer uuid default auth.uid()) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',x.id,'room_id',x.room_id,'context_city_id',x.context_city_id,'version',x.version,'state',x.state,'rematch_id',x.rematch_id,'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'color',m.color,'city_id',m.city_id,'ready',true,'profile',online_private.profile_json(m.user_id,p_viewer)) order by m.color desc) from public.online_match_members m where m.match_id=x.id),'[]'::jsonb)) from public.online_matches x where x.id=p_match
$$;
create function public.get_online_match(p_match_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_user();
begin
  if not online_private.is_match_member(p_match_id,u) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return online_private.match_json(p_match_id,u);
end $$;
create function public.online_commit_match(p_match_id uuid,p_actor uuid,p_command_id uuid,p_expected_version integer,p_state jsonb,p_command jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.online_matches; previous public.online_match_commands; winner_id uuid; winner_color text; amount bigint; bonus bigint; save jsonb; new_match uuid; response jsonb;
begin
  select * into m from public.online_matches where id=p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode='P0002'; end if;
  if not online_private.is_match_member(p_match_id,p_actor) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into previous from public.online_match_commands where match_id=p_match_id and command_id=p_command_id;
  if found then
    if previous.actor_id<>p_actor or previous.command<>p_command or previous.expected_version<>p_expected_version then raise exception 'COMMAND_ID_REUSED' using errcode='23505'; end if;
    return online_private.match_json(p_match_id,p_actor);
  end if;
  if m.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if p_command_id is null or p_expected_version is null or p_expected_version<0 or p_command is null or jsonb_typeof(p_command)<>'object' or p_state is null or p_state->>'schema' is distinct from '1' or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>2000000 then raise exception 'INVALID_STATE' using errcode='22023'; end if;
  if m.settled_at is not null and p_command->>'kind' not in('offer-rematch','accept-rematch') then raise exception 'MATCH_FINISHED' using errcode='23514'; end if;
  if m.settled_at is not null and p_state->'result' is distinct from m.state->'result' then raise exception 'IMMUTABLE_RESULT' using errcode='23514'; end if;
  update public.online_matches set state=p_state,version=version+1,updated_at=clock_timestamp() where id=p_match_id;
  if p_state->'result' is not null and p_state->'result'<>'null'::jsonb and m.settled_at is null then
    winner_color:=p_state->'result'->>'winner';
    if winner_color is not null then
      if winner_color not in('w','b') or coalesce(p_state->'eggs'->>winner_color,'') !~ '^[0-9]{1,9}$' or coalesce(p_state->'collected'->>winner_color,'') !~ '^[0-9]{1,9}$' then raise exception 'INVALID_RESULT' using errcode='22023'; end if;
      select user_id into winner_id from public.online_match_members where match_id=p_match_id and color=winner_color;
      amount:=(p_state->'eggs'->>winner_color)::bigint; bonus:=(p_state->'collected'->>winner_color)::bigint;
      perform 1 from public.online_profiles where id=winner_id for update;
      select profile into save from online_private.profile_saves where user_id=winner_id for update;
      save:=save || jsonb_build_object('goldenEggs',(save->>'goldenEggs')::bigint+amount,'points',(save->>'points')::bigint+amount+bonus,'winsCount',(save->>'winsCount')::bigint+1,'rank',online_private.rank((save->>'points')::bigint+amount+bonus),'updatedAt',greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,(save->>'updatedAt')::bigint+1));
      -- Casual wins credit eggs/points/wins, never campaign city conquest.
      update online_private.profile_saves set profile=save where user_id=winner_id;
      update public.online_profiles set golden_eggs=(save->>'goldenEggs')::bigint,points=(save->>'points')::bigint,wins_count=(save->>'winsCount')::bigint,updated_at=now() where id=winner_id;
    end if;
    update public.online_matches set settled_at=now() where id=p_match_id;
  end if;
  if p_command->>'kind'='accept-rematch' then
    if m.settled_at is null or m.state->>'rematchOffer' is null or m.state->>'rematchOffer'=(select color from public.online_match_members where match_id=p_match_id and user_id=p_actor) then raise exception 'NO_REMATCH_OFFER' using errcode='23514'; end if;
    if m.rematch_id is not null then raise exception 'REMATCH_EXISTS' using errcode='23514'; end if;
    -- Lock lobby so departure and rematch cannot race.
    perform 1 from public.online_rooms where id=m.room_id and status='playing' and match_id=p_match_id for update;
    if not found or (select count(*) from public.online_room_members where room_id=m.room_id)<>2 then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
    insert into public.online_matches(room_id,context_city_id,state) values(m.room_id,m.context_city_id,online_private.initial_state()) returning id into new_match;
    insert into public.online_match_members(match_id,user_id,color,city_id) select new_match,user_id,case color when 'w' then 'b' else 'w' end,city_id from public.online_match_members where match_id=p_match_id;
    update public.online_matches set rematch_id=new_match where id=p_match_id;
    -- Delete/reinsert within this transaction avoids the unique(room,color) swap collision.
    delete from public.online_room_members where room_id=m.room_id;
    insert into public.online_room_members(room_id,user_id,color,city_id,ready) select m.room_id,user_id,color,city_id,true from public.online_match_members where match_id=new_match;
    update public.online_rooms set match_id=new_match,updated_at=clock_timestamp() where id=m.room_id;
  end if;
  response:=online_private.match_json(p_match_id,p_actor);
  insert into public.online_match_commands(match_id,command_id,actor_id,expected_version,command,response) values(p_match_id,p_command_id,p_actor,p_expected_version,p_command,jsonb_build_object('id',p_match_id,'version',p_expected_version+1,'rematch_id',new_match));
  return response;
end $$;
create function public.online_piece_params(p_match_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_user();
begin
  if not online_private.is_match_member(p_match_id,u) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('piece_id',piece_id,'instrument',instrument,'effects',effects,'revision',revision) order by piece_id) from public.online_piece_params where match_id=p_match_id),'[]'::jsonb);
end $$;
create function public.online_commit_piece(p_match_id uuid,p_actor uuid,p_piece_id text,p_instrument jsonb,p_effects jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare color text; row public.online_piece_params; resolved_effects jsonb;
begin
  select mm.color into color from public.online_match_members mm join public.online_matches m on m.id=mm.match_id where mm.match_id=p_match_id and mm.user_id=p_actor and m.settled_at is null for share of m;
  if color is null or p_piece_id !~ ('^'||color||':[a-h]'||case color when 'w' then '[12]' else '[78]' end||'$') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  resolved_effects:=coalesce(p_effects,(select effects from public.online_piece_params where match_id=p_match_id and piece_id=p_piece_id),'{"gain":1,"pitch":1,"pan":0,"delay":0,"reverb":0.12,"decay":0.15}'::jsonb);
  if jsonb_typeof(p_instrument)<>'object' or jsonb_typeof(resolved_effects)<>'object' or octet_length(p_instrument::text)+octet_length(resolved_effects::text)>131072 then raise exception 'INVALID_PARAMS' using errcode='22023'; end if;
  -- The service Edge validates the complete shared Zod schemas before this RPC.
  insert into public.online_piece_params(match_id,piece_id,owner_id,instrument,effects) values(p_match_id,p_piece_id,p_actor,p_instrument,resolved_effects) on conflict(match_id,piece_id) do update set instrument=excluded.instrument,effects=excluded.effects,revision=public.online_piece_params.revision+1 returning * into row;
  return jsonb_build_object('piece_id',row.piece_id,'instrument',row.instrument,'effects',row.effects,'revision',row.revision);
end $$;
create function public.online_transfer_profile(p_source uuid,p_target uuid,p_choice text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare source_save online_private.profile_saves; target_save online_private.profile_saves; retained jsonb; f public.online_friendships; other_user uuid; low_id uuid; high_id uuid; new_sender uuid;
begin
  if p_source=p_target or p_choice not in('source','target') then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
  -- Lock identities in stable UUID order; only the Edge holding both verified sessions may call.
  perform 1 from public.online_profiles where id in(p_source,p_target) order by id for update;
  select * into source_save from online_private.profile_saves where user_id=p_source for update;
  select * into target_save from online_private.profile_saves where user_id=p_target for update;
  if source_save.user_id is null or target_save.user_id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if source_save.transferred_to=p_target then return online_private.profile_json(p_target,p_target); end if;
  if source_save.transferred_to is not null or target_save.transferred_to is not null then raise exception 'TRANSFERRED' using errcode='23514'; end if;
  if exists(select 1 from public.online_match_members mm join public.online_matches m on m.id=mm.match_id where mm.user_id in(p_source,p_target) and m.settled_at is null) then raise exception 'ACTIVE_MATCH' using errcode='23514'; end if;
  if exists(select 1 from public.online_match_members a join public.online_match_members b using(match_id) where a.user_id=p_source and b.user_id=p_target) then raise exception 'HISTORY_CONFLICT' using errcode='23514'; end if;
  if exists(select 1 from public.online_room_members where user_id in(p_source,p_target)) then raise exception 'ACTIVE_ROOM' using errcode='23514'; end if;
  insert into online_private.profile_transfers(source_id,target_id,choice,source_backup,target_backup) values(p_source,p_target,p_choice,source_save.profile,target_save.profile);
  retained:=case p_choice when 'source' then source_save.profile else target_save.profile end;
  update online_private.profile_saves set profile=retained where user_id=p_target;
  update online_private.profile_saves set transferred_to=p_target where user_id=p_source;
  update public.online_profiles set points=(retained->>'points')::bigint,golden_eggs=(retained->>'goldenEggs')::bigint,wins_count=(retained->>'winsCount')::bigint,updated_at=now() where id=p_target;
  for f in select * from public.online_friendships where p_source in(user_low,user_high) for update loop
    other_user:=case when f.user_low=p_source then f.user_high else f.user_low end;
    if other_user<>p_target and f.status<>'removed' then
      low_id:=least(other_user,p_target); high_id:=greatest(other_user,p_target); new_sender:=case when f.sender_id=p_source then p_target else f.sender_id end;
      -- Existing relation wins, including inverse pending. Transfer never autoaccepts.
      insert into public.online_friendships(user_low,user_high,sender_id,status) values(low_id,high_id,new_sender,f.status) on conflict(user_low,user_high) do nothing;
      insert into public.online_social_updates(user_id,revision) values(other_user,1) on conflict(user_id) do update set revision=public.online_social_updates.revision+1;
    end if;
    update public.online_friendships set status='removed',updated_at=now() where id=f.id;
  end loop;
  update public.online_match_members set user_id=p_target where user_id=p_source;
  update public.online_piece_params set owner_id=p_target where owner_id=p_source;
  insert into public.online_social_updates(user_id,revision) values(p_target,1),(p_source,1) on conflict(user_id) do update set revision=public.online_social_updates.revision+1;
  return online_private.profile_json(p_target,p_target);
end $$;

-- A new Supabase project may disable automatic grants. These are deliberately
-- explicit; all mutation tables remain read-only to browser credentials.
revoke all on all tables in schema online_private from public, anon, authenticated;
revoke all on public.online_profiles,public.online_rooms,public.online_room_members,public.online_public_rooms,public.online_matches,public.online_match_members,public.online_friendships,public.online_social_updates,public.online_match_commands,public.online_piece_params,public.online_match_updates from public, anon, authenticated;
grant select on public.online_profiles,public.online_rooms,public.online_room_members,public.online_public_rooms,public.online_matches,public.online_match_members,public.online_friendships,public.online_social_updates,public.online_piece_params,public.online_match_updates to authenticated;
grant all on all tables in schema online_private to service_role;
grant all on public.online_profiles,public.online_rooms,public.online_room_members,public.online_public_rooms,public.online_matches,public.online_match_members,public.online_friendships,public.online_social_updates,public.online_match_commands,public.online_piece_params,public.online_match_updates to service_role;
revoke all on all functions in schema online_private from public,anon,authenticated;
grant execute on function online_private.is_room_member(uuid,uuid),online_private.is_match_member(uuid,uuid),online_private.can_read_profile(uuid) to authenticated;
grant execute on all functions in schema online_private to service_role;
revoke all on function public.online_profile(jsonb,text,uuid),public.online_sync_profile(bigint,jsonb,uuid),public.online_rooms(),public.online_room(text,text,boolean,text),public.online_friends(text,text,uuid),public.get_online_match(uuid),public.online_piece_params(uuid),public.online_commit_match(uuid,uuid,uuid,integer,jsonb,jsonb),public.online_commit_piece(uuid,uuid,text,jsonb,jsonb),public.online_transfer_profile(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.online_profile(jsonb,text,uuid),public.online_sync_profile(bigint,jsonb,uuid),public.online_rooms(),public.online_room(text,text,boolean,text),public.online_friends(text,text,uuid),public.get_online_match(uuid),public.online_piece_params(uuid) to authenticated;
grant execute on function public.online_commit_match(uuid,uuid,uuid,integer,jsonb,jsonb),public.online_commit_piece(uuid,uuid,text,jsonb,jsonb),public.online_transfer_profile(uuid,uuid,text) to service_role;

-- Publish only authorized UPDATE/INSERT payloads and the thin public directory.
-- Lobby membership DELETE is deliberately unpublished (Realtime DELETE bypasses
-- RLS); lobby updated_at announces changes. Social notifications use own rows.
do $$
begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
  alter publication supabase_realtime add table public.online_profiles,public.online_rooms,public.online_public_rooms,public.online_match_updates,public.online_social_updates;
end $$;

-- Presence is transient and never decides game results. These policies authorize
-- only match members and only the presence extension; client Broadcast cannot
-- impersonate a confirmed move. Supabase owns/enables RLS on realtime.messages.
create function online_private.can_join_match_topic(p_topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.online_match_members where user_id=auth.uid() and 'match:'||match_id::text=p_topic)
$$;
revoke all on function online_private.can_join_match_topic(text) from public,anon;
grant execute on function online_private.can_join_match_topic(text) to authenticated,service_role;
create policy chicken_match_presence_read on realtime.messages for select to authenticated
using (extension='presence' and online_private.can_join_match_topic((select realtime.topic())));
create policy chicken_match_presence_write on realtime.messages for insert to authenticated
with check (extension='presence' and online_private.can_join_match_topic((select realtime.topic())));
