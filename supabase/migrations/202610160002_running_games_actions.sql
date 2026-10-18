-- Include match actions in online_running_games to allow board preview miniatures.
create or replace function public.online_running_games() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',m.id,'context_city_id',m.context_city_id,'updated_at',m.updated_at,
      'color',own.color,'opponent',jsonb_build_object('id',opponent.id,'display_name',opponent.display_name),
      'turn',case when (select count(*) from jsonb_array_elements(m.state->'actions') action where action->>'kind'='move')%2=0 then 'w' else 'b' end,
      'actions',coalesce(m.state->'actions','[]'::jsonb)
    ) order by m.updated_at desc,m.id)
    from public.online_matches m
    join public.online_match_members own on own.match_id=m.id and own.user_id=u
    join public.online_match_members other on other.match_id=m.id and other.user_id<>u
    join public.online_profiles opponent on opponent.id=other.user_id
    where m.settled_at is null and m.state->'result'='null'::jsonb
  ),'[]'::jsonb);
end $$;
revoke all on function public.online_running_games() from public,anon,authenticated;
grant execute on function public.online_running_games() to authenticated;
