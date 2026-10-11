-- Open lobby rooms expire after 30 minutes without a server-recorded room
-- action. Playing matches are durable and are never expired by this cleanup.
create or replace function online_private.expire_idle_rooms() returns void
language plpgsql security definer set search_path = '' as $$
declare expired uuid;
begin
  for expired in
    select id
    from public.online_rooms
    where status='open' and updated_at < clock_timestamp() - interval '30 minutes'
    order by updated_at
    for update skip locked
  loop
    delete from public.online_room_members where room_id=expired;
    update public.online_rooms set status='closed',updated_at=clock_timestamp() where id=expired and status='open';
    perform online_private.refresh_directory(expired);
  end loop;
end $$;
revoke all on function online_private.expire_idle_rooms() from public, anon, authenticated;

-- A directory read performs the cleanup before returning the public projection,
-- so stale rooms disappear even when no participant revisits their lobby.
drop function public.online_rooms();
create function public.online_rooms() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform online_private.expire_idle_rooms();
  return coalesce((
    select jsonb_agg(jsonb_build_object('code',d.code,'creator_name',d.creator_name,'players',d.players)
      order by r.created_at desc, r.id desc)
    from public.online_public_rooms d
    join public.online_rooms r on r.id=d.room_id
  ),'[]'::jsonb);
end $$;
revoke all on function public.online_rooms() from public, anon, authenticated;
grant execute on function public.online_rooms() to anon, authenticated;
