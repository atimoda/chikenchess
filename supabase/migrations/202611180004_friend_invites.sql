-- Friend invites: call an accepted friend into your lobby (18/11).
-- kind 'patio': the Pátio (patio_id, null = the default one) and, when online, its live room on the game server.
-- kind 'room': a 1v1 chess lobby, by its code.
-- One row per sender and recipient: a new invite replaces the last one (at most one every 5 seconds). The recipient
-- reads the invites of the last 10 minutes; older rows are dropped on their next read. The recipient's
-- online_social_updates row is bumped, so the Realtime watch they already have wakes up.
create table public.online_invites (
  sender_id uuid not null references public.online_profiles(id) on delete cascade,
  recipient_id uuid not null references public.online_profiles(id) on delete cascade,
  kind text not null check (kind in ('patio', 'room')),
  patio_id uuid,
  room text check (room is null or room ~ '^[A-Za-z0-9_-]{1,64}$'),
  created_at timestamptz not null default now(),
  primary key (sender_id, recipient_id),
  check (kind <> 'room' or room is not null)
);
create index online_invites_recipient_idx on public.online_invites (recipient_id, created_at desc);
alter table public.online_invites enable row level security;
revoke all on public.online_invites from public, anon, authenticated;
grant all on public.online_invites to service_role;

create or replace function public.online_invite(p_action text default 'list', p_friend uuid default null, p_kind text default 'patio', p_patio uuid default null, p_room text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); last_sent timestamptz;
begin
  if p_action='send' then
    if p_friend is null or p_friend=u or not exists(
      select 1 from public.online_friendships where user_low=least(u,p_friend) and user_high=greatest(u,p_friend) and status='accepted'
    ) then raise exception 'FRIEND_NOT_FOUND' using errcode='P0002'; end if;
    if p_kind is null or p_kind not in ('patio','room') or (p_kind='room' and p_room is null)
      or (p_room is not null and p_room !~ '^[A-Za-z0-9_-]{1,64}$') then raise exception 'INVALID_INVITE' using errcode='22023'; end if;
    select created_at into last_sent from public.online_invites where sender_id=u and recipient_id=p_friend for update;
    if last_sent is not null and last_sent > now() - interval '5 seconds' then raise exception 'INVITE_TOO_SOON' using errcode='22023'; end if;
    insert into public.online_invites(sender_id,recipient_id,kind,patio_id,room,created_at)
      values(u,p_friend,p_kind,case when p_kind='patio' then p_patio end,p_room,now())
      on conflict(sender_id,recipient_id) do update set kind=excluded.kind,patio_id=excluded.patio_id,room=excluded.room,created_at=excluded.created_at;
    insert into public.online_social_updates(user_id,revision) values(p_friend,1) on conflict(user_id) do update set revision=public.online_social_updates.revision+1;
    return jsonb_build_object('sent_at',now());
  elsif p_action<>'list' then
    raise exception 'INVALID_ACTION' using errcode='22023';
  end if;
  delete from public.online_invites where recipient_id=u and created_at < now() - interval '10 minutes';
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'sender_id',i.sender_id,'name',p.display_name,'kind',i.kind,'patio_id',i.patio_id,'patio_name',l.name,'room',i.room,'created_at',i.created_at
    ) order by i.created_at desc)
    from public.online_invites i
    join public.online_profiles p on p.id=i.sender_id
    left join online_private.patio_lobbies l on l.id=i.patio_id
    where i.recipient_id=u
  ),'[]'::jsonb);
end $$;
revoke all on function public.online_invite(text,uuid,text,uuid,text) from public, anon;
grant execute on function public.online_invite(text,uuid,text,uuid,text) to authenticated, service_role;
