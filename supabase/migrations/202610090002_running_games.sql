-- A lobby slot is transient; match membership and authoritative state are durable.
-- A caller may hold several unfinished matches while occupying one lobby.
create function online_private.detach_room_member(p_room uuid,p_user uuid,p_close_lobby boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.online_rooms; occupants integer; active boolean;
begin
  select * into r from public.online_rooms where id=p_room for update;
  active:=r.status='playing' and exists(select 1 from public.online_matches where id=r.match_id and settled_at is null and state->'result'='null'::jsonb);
  delete from public.online_room_members where room_id=p_room and user_id=p_user;
  if active then
    -- The other player's readiness, host and match access remain intact.
    update public.online_rooms set updated_at=clock_timestamp() where id=p_room;
  else
    update public.online_room_members set ready=false where room_id=p_room;
    select count(*) into occupants from public.online_room_members where room_id=p_room;
    update public.online_rooms set
      status=case when p_close_lobby or r.status<>'open' or occupants=0 then 'closed' else 'open' end,
      host_id=case when p_close_lobby then r.host_id else coalesce((select user_id from public.online_room_members where room_id=p_room order by color limit 1),r.host_id) end,
      updated_at=clock_timestamp() where id=p_room;
  end if;
  perform online_private.refresh_directory(p_room);
end $$;
revoke all on function online_private.detach_room_member(uuid,uuid,boolean) from public,anon,authenticated;

create or replace function public.online_room(p_action text,p_code text default null,p_public boolean default true,p_city_id text default 'random') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid:=online_private.require_user();
  r public.online_rooms;
  previous_room public.online_rooms;
  occupants integer;
  assigned_color text;
  new_match uuid;
  host_city text;
  member public.online_room_members;
  member_city text;
  was_ready boolean;
begin
  if not exists(select 1 from public.online_profiles where id=u) then perform public.online_profile(); end if;
  if p_city_id is null or (p_city_id<>'random' and not exists(select 1 from online_private.kit_catalog where id=p_city_id)) then raise exception 'INVALID_KIT' using errcode='22023'; end if;
  perform 1 from public.online_profiles where id=u for update;
  if p_action in ('create','join') then
    perform locked.id from public.online_rooms locked
      where (p_action='join' and locked.code=upper(btrim(p_code)))
        or locked.id in (select room_id from public.online_room_members where user_id=u)
      order by locked.id for update;
  end if;
  if p_action='create' then
    select old.* into previous_room from public.online_rooms old
      join public.online_room_members membership on membership.room_id=old.id where membership.user_id=u;
    if found then
      perform online_private.detach_room_member(previous_room.id,u,true);
    end if;
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
        select count(*) into occupants from public.online_room_members where room_id=r.id;
        if occupants>=2 then raise exception 'ROOM_FULL' using errcode='23514'; end if;
        select old.* into previous_room from public.online_rooms old
          join public.online_room_members membership on membership.room_id=old.id where membership.user_id=u;
        if found then
          perform online_private.detach_room_member(previous_room.id,u,false);
        end if;
        select case when exists(select 1 from public.online_room_members where room_id=r.id and color='w') then 'b' else 'w' end into assigned_color;
        insert into public.online_room_members(room_id,user_id,color,city_id) values(r.id,u,assigned_color,p_city_id);
        update public.online_room_members set ready=false where room_id=r.id;
      end if;
    else
      if not online_private.is_room_member(r.id,u) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      if p_action='leave' then
        perform online_private.detach_room_member(r.id,u,false);
        return null;
      elsif p_action='visibility' then
        if r.host_id<>u then raise exception 'FORBIDDEN' using errcode='42501'; end if;
        if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
        if p_public is null then raise exception 'INVALID_VISIBILITY' using errcode='22023'; end if;
        update public.online_rooms set is_public=p_public where id=r.id;
      elsif p_action='kit' then
        if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
        update public.online_room_members set city_id=p_city_id where room_id=r.id and user_id=u;
      elsif p_action='ready' then
        if r.status='playing' then return online_private.room_json(r.id,u); end if;
        if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
        select ready into was_ready from public.online_room_members where room_id=r.id and user_id=u for update;
        update public.online_room_members set ready=not was_ready where room_id=r.id and user_id=u;
        if not was_ready and (select count(*)=2 and bool_and(ready) from public.online_room_members where room_id=r.id) then
          select city_id into host_city from public.online_room_members where room_id=r.id and user_id=r.host_id;
          if host_city='random' then
            select id into host_city from online_private.kit_catalog order by random() limit 1;
          end if;
          insert into public.online_matches(room_id,context_city_id,state) values(r.id,host_city,online_private.initial_state()) returning id into new_match;
          for member in select * from public.online_room_members where room_id=r.id loop
            if member.user_id=r.host_id then member_city:=host_city;
            elsif member.city_id='random' then
              select id into member_city from online_private.kit_catalog order by random() limit 1;
            else member_city:=member.city_id; end if;
            insert into public.online_match_members(match_id,user_id,color,city_id) values(new_match,member.user_id,member.color,member_city);
          end loop;
          update public.online_rooms set status='playing',match_id=new_match where id=r.id;
        end if;
      else raise exception 'INVALID_ACTION' using errcode='22023'; end if;
    end if;
  end if;
  update public.online_rooms set updated_at=clock_timestamp() where id=r.id;
  perform online_private.refresh_directory(r.id);
  return online_private.room_json(r.id,u);
end $$;

create or replace function public.online_commit_match(p_match_id uuid,p_actor uuid,p_command_id uuid,p_expected_version integer,p_state jsonb,p_command jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.online_matches; previous public.online_match_commands; recipient record; winner_color text; pool bigint; amount bigint; bonus bigint; save jsonb; new_match uuid; response jsonb;
begin
  select * into m from public.online_matches where id=p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode='P0002'; end if;
  if not online_private.is_match_member(p_match_id,p_actor) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into previous from public.online_match_commands where match_id=p_match_id and command_id=p_command_id;
  if found then
    if previous.actor_id<>p_actor or previous.command<>p_command or previous.expected_version<>p_expected_version then raise exception 'COMMAND_ID_REUSED' using errcode='23505'; end if;
    return online_private.match_json(p_match_id,p_actor);
  end if;
  if m.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
  if p_command_id is null or p_expected_version is null or p_expected_version<0 or p_command is null or jsonb_typeof(p_command)<>'object' or p_state is null or p_state->>'schema' is distinct from '1' or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>2000000 then raise exception 'INVALID_STATE' using errcode='22023'; end if;
  if m.settled_at is not null and p_command->>'kind' not in('offer-rematch','accept-rematch') then raise exception 'MATCH_FINISHED' using errcode='23514'; end if;
  if m.settled_at is not null and p_state->'result' is distinct from m.state->'result' then raise exception 'IMMUTABLE_RESULT' using errcode='23514'; end if;
  update public.online_matches set state=p_state,version=version+1,updated_at=clock_timestamp() where id=p_match_id;
  if p_state->'result' is not null and p_state->'result'<>'null'::jsonb and m.settled_at is null then
    winner_color:=p_state->'result'->>'winner';
    if (winner_color is not null and winner_color not in('w','b')) or coalesce(p_state->'eggs'->>'w','') !~ '^[0-9]{1,9}$' or coalesce(p_state->'eggs'->>'b','') !~ '^[0-9]{1,9}$' then raise exception 'INVALID_RESULT' using errcode='22023'; end if;
    pool:=(p_state->'eggs'->>'w')::bigint+(p_state->'eggs'->>'b')::bigint;
    -- A win receives both remaining balances. A draw preserves the entire pool:
    -- black receives the extra egg when the total is odd, white the lower half.
    -- Lock recipients in a stable identity order before changing either save.
    perform 1 from public.online_profiles where id in(select user_id from public.online_match_members where match_id=p_match_id and (winner_color is null or color=winner_color)) order by id for update;
    for recipient in select user_id,color from public.online_match_members where match_id=p_match_id and (winner_color is null or color=winner_color) order by user_id loop
      if coalesce(p_state->'collected'->>recipient.color,'') !~ '^[0-9]{1,9}$' then raise exception 'INVALID_RESULT' using errcode='22023'; end if;
      amount:=case when winner_color is not null then pool when recipient.color='b' then (pool+1)/2 else pool/2 end;
      bonus:=(p_state->'collected'->>recipient.color)::bigint;
      select profile into save from online_private.profile_saves where user_id=recipient.user_id for update;
      save:=save || jsonb_build_object('goldenEggs',(save->>'goldenEggs')::bigint+amount,'points',(save->>'points')::bigint+amount+bonus,'winsCount',(save->>'winsCount')::bigint+case when winner_color is null then 0 else 1 end,'rank',online_private.rank((save->>'points')::bigint+amount+bonus),'updatedAt',greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,(save->>'updatedAt')::bigint+1));
      -- Casual results credit eggs/points, and wins only for a winner; neither
      -- result grants a campaign city conquest.
      update online_private.profile_saves set profile=save where user_id=recipient.user_id;
      update public.online_profiles set golden_eggs=(save->>'goldenEggs')::bigint,points=(save->>'points')::bigint,wins_count=(save->>'winsCount')::bigint,updated_at=now() where id=recipient.user_id;
    end loop;
    update public.online_matches set settled_at=now() where id=p_match_id;
  end if;
  if p_command->>'kind'='accept-rematch' then
    if m.settled_at is null or m.state->>'rematchOffer' is null or m.state->>'rematchOffer'=(select color from public.online_match_members where match_id=p_match_id and user_id=p_actor) then raise exception 'NO_REMATCH_OFFER' using errcode='23514'; end if;
    if m.rematch_id is not null then raise exception 'REMATCH_EXISTS' using errcode='23514'; end if;
    -- Match identities are durable even after either player switches lobbies.
    -- Serialize against lobby admission using its same profile-before-room order.
    perform 1 from public.online_profiles where id in(select user_id from public.online_match_members where match_id=p_match_id) order by id for update;
    perform 1 from public.online_rooms where id=m.room_id and match_id=p_match_id for update;
    if not found then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
    insert into public.online_matches(room_id,context_city_id,state) values(m.room_id,m.context_city_id,online_private.initial_state()) returning id into new_match;
    insert into public.online_match_members(match_id,user_id,color,city_id) select new_match,user_id,case color when 'w' then 'b' else 'w' end,city_id from public.online_match_members where match_id=p_match_id;
    update public.online_matches set rematch_id=new_match where id=p_match_id;
    -- Delete/reinsert within this transaction avoids the unique(room,color) swap collision.
    delete from public.online_room_members where room_id=m.room_id;
    insert into public.online_room_members(room_id,user_id,color,city_id,ready) select m.room_id,user_id,color,city_id,true from public.online_match_members fresh where match_id=new_match and not exists(select 1 from public.online_room_members occupied where occupied.user_id=fresh.user_id) on conflict(user_id) do nothing;
    update public.online_rooms set status='playing',match_id=new_match,updated_at=clock_timestamp() where id=m.room_id;
  end if;
  response:=online_private.match_json(p_match_id,p_actor);
  insert into public.online_match_commands(match_id,command_id,actor_id,expected_version,command,response) values(p_match_id,p_command_id,p_actor,p_expected_version,p_command,jsonb_build_object('id',p_match_id,'version',p_expected_version+1,'rematch_id',new_match));
  return response;
end $$;

-- Only safe resume metadata is returned. Powers do not advance the turn;
-- Undo removes actions and Redo restores them in the authoritative action array.
create function public.online_running_games() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',m.id,'context_city_id',m.context_city_id,'updated_at',m.updated_at,
      'color',own.color,'opponent',jsonb_build_object('id',opponent.id,'display_name',opponent.display_name),
      'turn',case when (select count(*) from jsonb_array_elements(m.state->'actions') action where action->>'kind'='move')%2=0 then 'w' else 'b' end
    ) order by m.updated_at desc,m.id)
    from public.online_matches m
    join public.online_match_members own on own.match_id=m.id and own.user_id=u
    join public.online_match_members other on other.match_id=m.id and other.user_id<>u
    join public.online_profiles opponent on opponent.id=other.user_id
    where m.settled_at is null and m.state->'result'='null'::jsonb
  ),'[]'::jsonb);
end $$;
revoke all on function public.online_running_games() from public,anon,authenticated;
grant execute on function public.online_running_games() to authenticated;

-- A small private projection announces list changes even when a player has no
-- current lobby and is not viewing the match that changed. Never publish DELETE
-- of match membership itself: Realtime DELETE payloads bypass row policies.
create table public.online_running_game_updates (
  user_id uuid primary key references public.online_profiles(id),
  revision bigint not null default 0
);
alter table public.online_running_game_updates enable row level security;
create policy running_game_updates_read on public.online_running_game_updates
  for select to authenticated using (user_id=auth.uid());
revoke all on public.online_running_game_updates from public,anon,authenticated;
grant select on public.online_running_game_updates to authenticated;
grant all on public.online_running_game_updates to service_role;

create function online_private.notify_running_game_members() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous_user uuid; next_user uuid;
begin
  if tg_op<>'INSERT' then previous_user:=old.user_id; end if;
  if tg_op<>'DELETE' then next_user:=new.user_id; end if;
  insert into public.online_running_game_updates(user_id,revision)
    select id,1 from public.online_profiles where id in(previous_user,next_user) order by id
    on conflict(user_id) do update set revision=public.online_running_game_updates.revision+1;
  return null;
end $$;
create trigger notify_running_game_members after insert or update or delete on public.online_match_members
  for each row execute function online_private.notify_running_game_members();

create function online_private.notify_running_game_state() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.online_running_game_updates(user_id,revision)
    select user_id,1 from public.online_match_members where match_id=new.id order by user_id
    on conflict(user_id) do update set revision=public.online_running_game_updates.revision+1;
  return null;
end $$;
-- Commit settlement locks profiles after updating match state. Deferring its
-- notification preserves profile-before-projection lock order with lobby starts.
create constraint trigger notify_running_game_state after update on public.online_matches
  deferrable initially deferred for each row
  when (old.version is distinct from new.version or old.state is distinct from new.state or old.settled_at is distinct from new.settled_at)
  execute function online_private.notify_running_game_state();
revoke all on function online_private.notify_running_game_members(),online_private.notify_running_game_state() from public,anon,authenticated;
insert into public.online_running_game_updates(user_id)
  select distinct user_id from public.online_match_members;
alter publication supabase_realtime add table public.online_running_game_updates;
notify pgrst, 'reload schema';
