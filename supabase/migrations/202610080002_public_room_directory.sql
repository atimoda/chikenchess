-- Public map directory: retain creation order while exposing only the thin,
-- trigger-maintained projection of open rooms with a vacant seat.
alter table public.online_rooms add column created_at timestamptz;
update public.online_rooms set created_at=updated_at where created_at is null;
alter table public.online_rooms alter column created_at set default now();
alter table public.online_rooms alter column created_at set not null;

drop function public.online_rooms();
create function public.online_rooms() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('code',d.code,'creator_name',d.creator_name,'players',d.players)
      order by r.created_at desc, r.id desc)
    from public.online_public_rooms d
    join public.online_rooms r on r.id=d.room_id
  ),'[]'::jsonb);
end $$;

drop policy if exists directory_anon_read on public.online_public_rooms;
create policy directory_anon_read on public.online_public_rooms for select to anon using (true);
grant select on public.online_public_rooms to anon;
revoke all on function public.online_rooms() from public, anon, authenticated;
grant execute on function public.online_rooms() to anon, authenticated;
