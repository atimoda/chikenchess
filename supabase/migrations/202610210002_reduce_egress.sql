-- Reduce Supabase egress: clients send what they already hold and the server
-- returns only what changed. Calls without p_known keep the full response, so
-- older frontends continue to work unchanged.

-- Running games: omit the action history of a match whose updated_at the
-- client already has. The miniature keeps its cached actions for that match.
drop function public.online_running_games();
create function public.online_running_games(p_known jsonb default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); known jsonb:=case when jsonb_typeof(p_known)='object' then p_known else '{}'::jsonb end;
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',m.id,'context_city_id',m.context_city_id,'updated_at',m.updated_at,
      'color',own.color,'opponent',jsonb_build_object('id',opponent.id,'display_name',opponent.display_name),
      'turn',case when (select count(*) from jsonb_array_elements(m.state->'actions') action where action->>'kind'='move')%2=0 then 'w' else 'b' end
    ) || case when known->>(m.id::text) is not distinct from (to_jsonb(m.updated_at)#>>'{}') then '{}'::jsonb
      else jsonb_build_object('actions',coalesce(m.state->'actions','[]'::jsonb)) end
    order by m.updated_at desc,m.id)
    from public.online_matches m
    join public.online_match_members own on own.match_id=m.id and own.user_id=u
    join public.online_match_members other on other.match_id=m.id and other.user_id<>u
    join public.online_profiles opponent on opponent.id=other.user_id
    where m.settled_at is null and m.state->'result'='null'::jsonb
  ),'[]'::jsonb);
end $$;
revoke all on function public.online_running_games(jsonb) from public,anon,authenticated;
grant execute on function public.online_running_games(jsonb) to authenticated;

-- Piece params: p_known maps piece_id to the revision the client holds; only
-- new or changed pieces are returned. Rows are never deleted during a match.
drop function public.online_piece_params(uuid);
create function public.online_piece_params(p_match_id uuid, p_known jsonb default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); known jsonb:=case when jsonb_typeof(p_known)='object' then p_known else '{}'::jsonb end;
begin
  if not online_private.is_match_member(p_match_id,u) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('piece_id',piece_id,'instrument',instrument,'effects',effects,'revision',revision) order by piece_id)
    from public.online_piece_params where match_id=p_match_id and (known->>piece_id) is distinct from revision::text),'[]'::jsonb);
end $$;
revoke all on function public.online_piece_params(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.online_piece_params(uuid,jsonb) to authenticated;

-- The piece-params Edge Function only needs membership and the musical context,
-- not the whole match state and both profiles.
create function public.online_match_context(p_match_id uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_user();
begin
  if not online_private.is_match_member(p_match_id,u) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return (select context_city_id from public.online_matches where id=p_match_id);
end $$;
revoke all on function public.online_match_context(uuid) from public,anon,authenticated;
grant execute on function public.online_match_context(uuid) to authenticated;
notify pgrst, 'reload schema';
