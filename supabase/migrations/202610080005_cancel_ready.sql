-- Cancel Ready explicitly instead of relying on a second toggle request.
create function public.online_room_cancel_ready(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid:=online_private.require_user();
  r public.online_rooms;
begin
  select * into r from public.online_rooms
    where code=upper(btrim(p_code)) for update;
  if not found then raise exception 'ROOM_NOT_FOUND' using errcode='P0002'; end if;
  if not online_private.is_room_member(r.id,u) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if r.status='playing' then return online_private.room_json(r.id,u); end if;
  if r.status<>'open' then raise exception 'ROOM_CLOSED' using errcode='23514'; end if;

  update public.online_room_members set ready=false where room_id=r.id and user_id=u;
  update public.online_rooms set updated_at=clock_timestamp() where id=r.id;
  perform online_private.refresh_directory(r.id);
  return online_private.room_json(r.id,u);
end $$;

revoke all on function public.online_room_cancel_ready(text) from public, anon, authenticated;
grant execute on function public.online_room_cancel_ready(text) to authenticated;

notify pgrst, 'reload schema';
