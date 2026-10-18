-- Allow adding friends by Profile Code or Email address, and avoid re-notifying already accepted friends.
create or replace function public.online_friends(p_action text default 'list', p_target_code text default null, p_friend_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); target uuid; f public.online_friendships; affected uuid[];
begin
  if not exists(select 1 from public.online_profiles where id=u) then perform public.online_profile(); end if;
  if p_action='request' then
    -- 1. Try finding target by profile code
    select id into target from public.online_profiles where code=upper(btrim(p_target_code));
    -- 2. If not found, try finding target by email in auth.users
    if target is null then
      select p.id into target
      from auth.users au
      join public.online_profiles p on p.id=au.id
      where lower(btrim(au.email))=lower(btrim(p_target_code))
      limit 1;
    end if;
    if target is null then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
    if target=u then raise exception 'SELF_REQUEST' using errcode='22023'; end if;
    if exists(select 1 from online_private.profile_saves where user_id=target and transferred_to is not null) then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
    insert into public.online_friendships(user_low,user_high,sender_id) values(least(u,target),greatest(u,target),u) on conflict(user_low,user_high) do nothing;
    select * into f from public.online_friendships where user_low=least(u,target) and user_high=greatest(u,target) for update;
    if f.status='removed' then
      update public.online_friendships set status='pending',sender_id=u,updated_at=now() where id=f.id;
      affected:=array[u,target];
    elsif f.status='accepted' then
      -- Already accepted: do not notify the friend again
      affected:=null;
    else
      affected:=array[u,target];
    end if;
  elsif p_action<>'list' then
    select * into f from public.online_friendships where id=p_friend_id and u in(user_low,user_high) for update;
    if not found then raise exception 'FRIEND_NOT_FOUND' using errcode='P0002'; end if;
    if p_action='accept' then
      if f.sender_id=u then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      if f.status='removed' then raise exception 'REQUEST_CLOSED' using errcode='23514'; end if;
      update public.online_friendships set status='accepted',updated_at=now() where id=f.id;
      affected:=array[f.user_low,f.user_high];
    elsif p_action='reject' then
      if f.sender_id=u or f.status='accepted' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      update public.online_friendships set status='removed',updated_at=now() where id=f.id;
      affected:=array[f.user_low,f.user_high];
    elsif p_action='cancel' then
      if f.sender_id<>u or f.status='accepted' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      update public.online_friendships set status='removed',updated_at=now() where id=f.id;
      affected:=array[f.user_low,f.user_high];
    elsif p_action='remove' then
      if f.status not in('accepted','removed') then raise exception 'REQUEST_PENDING' using errcode='23514'; end if;
      update public.online_friendships set status='removed',updated_at=now() where id=f.id;
      affected:=array[f.user_low,f.user_high];
    else raise exception 'INVALID_ACTION' using errcode='22023'; end if;
  end if;
  if affected is not null then insert into public.online_social_updates(user_id,revision) select unnest(affected),1 on conflict(user_id) do update set revision=public.online_social_updates.revision+1; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'sender_id',x.sender_id,'status',x.status,'profile',online_private.profile_json(case when x.user_low=u then x.user_high else x.user_low end,u)) order by x.updated_at desc) from public.online_friendships x where u in(x.user_low,x.user_high) and x.status<>'removed'),'[]'::jsonb);
end $$;

grant execute on function public.online_friends(text,text,uuid) to authenticated;
