-- Lobby city_id stores the requested kit, including the Random sentinel.
-- Only match members/context store resolved catalog cities; reading a lobby
-- or confirming Ready before the second person never consumes a kit draw.
alter table public.online_room_members alter column city_id set default 'random';
alter table public.online_match_members add constraint online_match_members_concrete_kit check (city_id <> 'random');
alter table public.online_matches add constraint online_matches_concrete_context check (context_city_id <> 'random');

create or replace function public.online_room(p_action text,p_code text default null,p_public boolean default true,p_city_id text default 'random') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); r public.online_rooms; previous_room public.online_rooms; occupants integer; assigned_color text; new_match uuid; host_city text; member public.online_room_members; member_city text;
begin
  if not exists(select 1 from public.online_profiles where id=u) then perform public.online_profile(); end if;
  if p_city_id is null or (p_city_id<>'random' and not exists(select 1 from online_private.kit_catalog where id=p_city_id)) then raise exception 'INVALID_KIT' using errcode='22023'; end if;
  -- Serialize mutations from the same person across multiple rooms.
  perform 1 from public.online_profiles where id=u for update;
  -- Lock both rooms in a stable order before moving a participant. The profile
  -- lock above serializes this user's actions, including multiple browser tabs.
  if p_action='join' then
    perform locked.id from public.online_rooms locked
      where locked.code=upper(btrim(p_code))
        or locked.id in (select room_id from public.online_room_members where user_id=u)
      order by locked.id for update;
  end if;
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
        select count(*) into occupants from public.online_room_members where room_id=r.id;
        if occupants>=2 then raise exception 'ROOM_FULL' using errcode='23514'; end if;
        select old.* into previous_room from public.online_rooms old
          join public.online_room_members membership on membership.room_id=old.id where membership.user_id=u;
        if found then
          if previous_room.status='playing' and exists(select 1 from public.online_matches where id=previous_room.match_id and state->'result'='null'::jsonb) then raise exception 'ACTIVE_MATCH' using errcode='23514'; end if;
          delete from public.online_room_members where room_id=previous_room.id and user_id=u;
          update public.online_room_members set ready=false where room_id=previous_room.id;
          select count(*) into occupants from public.online_room_members where room_id=previous_room.id;
          update public.online_rooms set
            status=case when occupants=0 or previous_room.status='playing' then 'closed' else 'open' end,
            host_id=coalesce((select user_id from public.online_room_members where room_id=previous_room.id order by color limit 1),previous_room.host_id),
            updated_at=clock_timestamp() where id=previous_room.id;
          perform online_private.refresh_directory(previous_room.id);
        end if;
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
      elsif p_action='visibility' then
        if r.host_id<>u then raise exception 'FORBIDDEN' using errcode='42501'; end if;
        if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
        if p_public is null then raise exception 'INVALID_VISIBILITY' using errcode='22023'; end if;
        update public.online_rooms set is_public=p_public where id=r.id;
      elsif p_action='kit' then
        if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
        update public.online_room_members set city_id=p_city_id,ready=false where room_id=r.id and user_id=u;
      elsif p_action='ready' then
        if r.status='playing' then return online_private.room_json(r.id,u); end if;
        if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;
        update public.online_room_members set ready=true where room_id=r.id and user_id=u;
        if (select count(*)=2 and bool_and(ready) from public.online_room_members where room_id=r.id) then
          select city_id into host_city from public.online_room_members where room_id=r.id and user_id=r.host_id;
          if host_city='random' then
            select id into host_city from online_private.kit_catalog order by random() limit 1;
          end if;
          insert into public.online_matches(room_id,context_city_id,state) values(r.id,host_city,online_private.initial_state()) returning id into new_match;
          -- Draw separately for each Random participant. A single uncorrelated
          -- subquery in INSERT ... SELECT would give both people the same draw.
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
