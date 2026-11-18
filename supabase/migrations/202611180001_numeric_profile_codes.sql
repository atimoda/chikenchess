-- Profile code: 9 numeric digits, numbered in the order accounts registered (000000001, 000000002, ...).
-- Renumbers the existing profiles by Auth's registration date (auth.users.created_at, then id); the admin account
-- "jéjé" (old code 7B23E26B10944F18) gets 000000001 even if it is not the oldest. The old code stays in legacy_code,
-- so adding a friend by it keeps working. New profiles take the next number from a sequence. Friendships, rooms,
-- matches, Pátios and saves reference the profile id, never the code, so nothing else changes.
-- Runs in one transaction; the table is locked so no profile is created halfway through.

lock table public.online_profiles in share row exclusive mode;

alter table public.online_profiles add column legacy_code text unique;
update public.online_profiles set legacy_code=code;

update public.online_profiles p set code=lpad(o.n::text,9,'0')
from (
  select p2.id, row_number() over (order by (p2.legacy_code='7B23E26B10944F18') desc, u.created_at nulls last, p2.id) as n
  from public.online_profiles p2 left join auth.users u on u.id=p2.id
) o
where o.id=p.id;

create sequence online_private.profile_code_seq as bigint minvalue 1 maxvalue 999999999 no cycle;
select setval('online_private.profile_code_seq', coalesce((select max(code::bigint) from public.online_profiles),1), exists(select 1 from public.online_profiles));
alter table public.online_profiles alter column code set default lpad(nextval('online_private.profile_code_seq')::text,9,'0');
alter table public.online_profiles add constraint online_profiles_code_digits check (code ~ '^[0-9]{9}$');
revoke all on sequence online_private.profile_code_seq from public, anon, authenticated;

create or replace function public.online_profile(p_local_profile jsonb default null,p_display_name text default null,p_expected_user_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); save jsonb; inserted integer; google_name text;
begin
  if p_expected_user_id is not null and u is distinct from p_expected_user_id then raise exception 'FORBIDDEN_IDENTITY' using errcode='42501'; end if;
  select nullif(left(btrim(regexp_replace(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),'[[:cntrl:]]','','g')),40),'')
    into google_name from auth.users where id=u;
  save:=online_private.normalize_profile(p_local_profile);
  -- Only a missing profile reaches the insert: the default draws the next code, and an insert that conflicts would
  -- still burn a number.
  if not exists(select 1 from public.online_profiles where id=u) then
    insert into public.online_profiles(id,display_name) values(u,google_name) on conflict(id) do nothing;
  end if;
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

create or replace function public.online_friends(p_action text default 'list', p_target_code text default null, p_friend_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); target uuid; f public.online_friendships; affected uuid[];
begin
  if not exists(select 1 from public.online_profiles where id=u) then perform public.online_profile(); end if;
  if p_action='request' then
    -- 1. Try finding target by profile code: 9 digits, leading zeros optional ("1" is 000000001)
    if btrim(p_target_code) ~ '^[0-9]{1,9}$' then
      select id into target from public.online_profiles where code=lpad(btrim(p_target_code),9,'0');
    end if;
    -- 1b. The code from before the 9-digit numbering still finds its account
    if target is null then
      select id into target from public.online_profiles where legacy_code=upper(btrim(p_target_code));
    end if;
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
