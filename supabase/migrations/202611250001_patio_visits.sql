-- Visits and anonymous players of each Pátio, as two numbers only (nothing about the person is kept):
--   visits: every entry into the Pátio, with or without an account; the browser skips a new entry into the same Pátio
--     within 30 minutes (a reload does not count again);
--   anon_players: a browser without an account counted once per Pátio (the browser remembers it was counted; a cleared
--     browser or another device counts again, so it is approximate).
-- The counters live in their own table, so a visit does not rewrite the Pátio's row (and its layout) nor its
-- updated_at, and the lists' row(...)::patio_lobbies casts keep their column count.
create table online_private.patio_lobby_stats (
  lobby_id uuid primary key references online_private.patio_lobbies(id) on delete cascade,
  visits bigint not null default 0 check (visits >= 0),
  anon_players bigint not null default 0 check (anon_players >= 0)
);
alter table online_private.patio_lobby_stats enable row level security;
revoke all on online_private.patio_lobby_stats from public, anon, authenticated;
grant all on online_private.patio_lobby_stats to service_role;

-- one entry into a Pátio: anyone may call it, with or without a session. p_new_anon: this browser was never counted as
-- an anonymous player of this Pátio; it counts only when the caller has no account (no session or an anonymous one).
-- Returns the new numbers and whether the anonymous player was counted, or null for a Pátio not in the database.
create function public.patio_lobby_visit(p_id uuid, p_new_anon boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare anon_add integer := case when coalesce(p_new_anon, false) and online_private.is_guest() then 1 else 0 end; s online_private.patio_lobby_stats;
begin
  if not exists (select 1 from online_private.patio_lobbies where id = p_id) then return null; end if;
  insert into online_private.patio_lobby_stats as t (lobby_id, visits, anon_players) values (p_id, 1, anon_add)
    on conflict (lobby_id) do update set visits = t.visits + 1, anon_players = t.anon_players + excluded.anon_players
    returning * into s;
  return jsonb_build_object('visits', s.visits, 'anon_players', s.anon_players, 'anon_counted', anon_add = 1);
end $$;

-- every Pátio row (the open Pátio and the lists) carries the two numbers
create or replace function online_private.patio_lobby_json(l online_private.patio_lobbies, with_layout boolean) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', l.id, 'name', l.name, 'revision', l.revision,
    'creator_id', l.creator_id, 'godparent_id', l.godparent_id, 'saved_by', l.saved_by,
    'is_default', l.is_default, 'featured', l.featured, 'editors', to_jsonb(l.editors),
    'created_at', l.created_at, 'updated_at', l.updated_at, 'last_edited_at', l.last_edited_at, 'last_played_at', l.last_played_at,
    'creator_name', (select p.display_name from public.online_profiles p where p.id = l.creator_id),
    'favorite', exists (select 1 from online_private.patio_lobby_favorites f where f.lobby_id = l.id and f.user_id = auth.uid()),
    'can_edit', online_private.patio_can_edit(l, auth.uid()),
    'favorites', (select count(*) from online_private.patio_lobby_favorites f where f.lobby_id = l.id),
    'plays', (select count(*) from online_private.patio_lobby_people pp where pp.lobby_id = l.id and pp.played_at is not null),
    'visits', coalesce((select s.visits from online_private.patio_lobby_stats s where s.lobby_id = l.id), 0),
    'anon_players', coalesce((select s.anon_players from online_private.patio_lobby_stats s where s.lobby_id = l.id), 0),
    'mine', coalesce(auth.uid() in (l.creator_id, l.saved_by, l.godparent_id), false)
      or exists (select 1 from online_private.patio_lobby_people pp where pp.lobby_id = l.id and pp.user_id = auth.uid() and pp.edited_at is not null)
  )
  || case when with_layout then jsonb_build_object(
    'layout', l.layout,
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', x.user_id, 'display_name', p.display_name, 'points', p.points, 'golden_eggs', p.golden_eggs, 'wins', p.wins_count,
        'edited_at', x.edited_at, 'played_at', x.played_at
      ) order by coalesce(x.edited_at, x.played_at) desc)
      from (
        select pp.user_id, pp.edited_at, pp.played_at from online_private.patio_lobby_people pp where pp.lobby_id = l.id
        union select u, null, null from unnest(array[l.creator_id, l.godparent_id]) u
          where u is not null and not exists (select 1 from online_private.patio_lobby_people q where q.lobby_id = l.id and q.user_id = u)
      ) x
      left join public.online_profiles p on p.id = x.user_id
    ), '[]'::jsonb)
  ) else '{}'::jsonb end
$$;

revoke all on function public.patio_lobby_visit(uuid, boolean) from public, anon, authenticated;
grant execute on function public.patio_lobby_visit(uuid, boolean) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
