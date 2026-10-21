-- Keep the match-tip progress in cloud saves. Without it every profile sync
-- returned seenMatchTipsCount=0 to the client, so each match showed the first tip again.
create or replace function online_private.normalize_profile(p_raw jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare eggs bigint:=10; points bigint:=10; wins bigint:=0; cities jsonb:='[]';
begin
  if p_raw is not null then
    if jsonb_typeof(p_raw)<>'object' or octet_length(p_raw::text)>65536 then raise exception 'INVALID_PROFILE' using errcode='22023'; end if;
    if jsonb_typeof(p_raw->'conqueredCityIds')='array' then
      select coalesce(jsonb_agg(distinct value), '[]'::jsonb) into cities from jsonb_array_elements(p_raw->'conqueredCityIds') where jsonb_typeof(value)='string' and value#>>'{}' ~ '^[a-z0-9-]{1,80}$';
    end if;
    if coalesce(p_raw->>'winsCount','') ~ '^[0-9]{1,9}$' then wins:=(p_raw->>'winsCount')::bigint; else wins:=jsonb_array_length(cities); end if;
    if p_raw->>'profileVersion'='1' and coalesce(p_raw->>'goldenEggs','') ~ '^[0-9]{1,9}$' then
      eggs:=(p_raw->>'goldenEggs')::bigint;
      if coalesce(p_raw->>'points','') ~ '^[0-9]{1,9}$' then points:=greatest(eggs,(p_raw->>'points')::bigint); else points:=eggs; end if;
    else eggs:=10+wins*10; points:=eggs; end if;
  end if;
  return jsonb_build_object('profileVersion',1,'conqueredCityIds',cities,'goldenEggs',eggs,'points',points,'rank',online_private.rank(points),'winsCount',wins,'lastPlayedCityId',case when p_raw->>'lastPlayedCityId' ~ '^[a-z0-9-]{1,80}$' then p_raw->>'lastPlayedCityId' else null end,'updatedAt',floor(extract(epoch from clock_timestamp())*1000),'moveRewardNotices',jsonb_build_object('best',coalesce(p_raw->'moveRewardNotices'->'best'='true'::jsonb,false),'worst',coalesce(p_raw->'moveRewardNotices'->'worst'='true'::jsonb,false)),'gameplayTipSeen',coalesce(p_raw->'gameplayTipSeen'='true'::jsonb,false),'seenMatchTipsCount',case when coalesce(p_raw->>'seenMatchTipsCount','') ~ '^[0-9]{1,6}$' then (p_raw->>'seenMatchTipsCount')::bigint else 0 end);
end $$;
