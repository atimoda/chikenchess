-- Scale the public lobby directory to many simultaneous viewers.
-- 1. Clients apply each Realtime change to their own list, so the directory
--    carries room_id (the only key a DELETE payload has) and created_at.
-- 2. Idle-lobby cleanup runs at most once per minute instead of on every read.
-- 3. A read returns at most the 50 newest rooms.
create table online_private.maintenance_runs (
  task text primary key,
  ran_at timestamptz not null
);
revoke all on online_private.maintenance_runs from public, anon, authenticated;

drop function public.online_rooms();
create function public.online_rooms() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare due boolean;
begin
  -- Only one concurrent reader per minute wins the slot and does the cleanup.
  insert into online_private.maintenance_runs(task,ran_at) values('expire_idle_rooms',clock_timestamp())
  on conflict(task) do update set ran_at=excluded.ran_at
  where online_private.maintenance_runs.ran_at < clock_timestamp()-interval '1 minute'
  returning true into due;
  if due then perform online_private.expire_idle_rooms(); end if;
  return coalesce((
    select jsonb_agg(entry order by created_at desc, room_id desc) from (
      select jsonb_build_object('room_id',d.room_id,'code',d.code,'creator_name',d.creator_name,'players',d.players,'created_at',r.created_at) as entry,
        r.created_at, d.room_id
      from public.online_public_rooms d
      join public.online_rooms r on r.id=d.room_id
      order by r.created_at desc, d.room_id desc
      limit 50
    ) newest
  ),'[]'::jsonb);
end $$;
revoke all on function public.online_rooms() from public, anon, authenticated;
grant execute on function public.online_rooms() to anon, authenticated;
notify pgrst, 'reload schema';
