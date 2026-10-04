-- Optimistic version mismatches are HTTP conflicts, not PostgreSQL
-- serialization failures. PT409 returns immediately through the Data API
-- and preserves the pending command/profile without a transaction retry.

create or replace function public.online_sync_profile(p_expected_updated_at bigint,p_profile jsonb,p_expected_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); previous jsonb; replacement jsonb; stamp bigint;
begin
  if u is distinct from p_expected_user_id then raise exception 'FORBIDDEN_IDENTITY' using errcode='42501'; end if;
  perform 1 from public.online_profiles where id=u for update;
  select profile into previous from online_private.profile_saves where user_id=u for update;
  if previous is null then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
  replacement:=online_private.normalize_profile(p_profile);
  if replacement-'updatedAt'=previous-'updatedAt' then return online_private.profile_json(u,u); end if;
  if p_expected_updated_at is null or (previous->>'updatedAt')::bigint<>p_expected_updated_at then raise exception 'PROFILE_CONFLICT' using errcode='PT409'; end if;
  stamp:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,(previous->>'updatedAt')::bigint+1);
  replacement:=replacement || jsonb_build_object('updatedAt',stamp);
  update online_private.profile_saves set profile=replacement where user_id=u;
  update public.online_profiles set points=(replacement->>'points')::bigint,golden_eggs=(replacement->>'goldenEggs')::bigint,wins_count=(replacement->>'winsCount')::bigint,updated_at=clock_timestamp() where id=u;
  return online_private.profile_json(u,u);
end $$;

create or replace function public.online_commit_match(p_match_id uuid,p_actor uuid,p_command_id uuid,p_expected_version integer,p_state jsonb,p_command jsonb) returns jsonb
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
  if m.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
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
