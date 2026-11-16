-- Conflicts (a save over a revision someone else saved first) were raised with SQLSTATE 40001 (serialization_failure).
-- PostgREST runs each RPC in a transaction that it retries on 40001, with no limit: one stale save then ran again and
-- again inside the server (hundreds of calls a second, the browser long gone with a 503). They are raised now with
-- PT409, which PostgREST answers with HTTP 409 and never retries. The browsers tell conflicts apart by the message
-- (PATIO_CONFLICT, PROFILE_CONFLICT, VERSION_CONFLICT, CONFIG_CONFLICT, SONG_CONFLICT), which does not change; the
-- Edge Functions already map PT409 to 409 (supabase/functions/_shared/http.ts).
-- Every function of the app's schemas that still raises 40001 is redefined from its current definition, with only
-- that code changed (owner, grants and settings stay).
do $$
declare
  f record;
  def text;
begin
  for f in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'online_private')
      and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
      and pg_get_functiondef(p.oid) ~* 'errcode\s*=\s*''40001'''
  loop
    def := regexp_replace(pg_get_functiondef(f.oid), '(errcode\s*=\s*)''40001''', '\1''PT409''', 'gi');
    execute def;
  end loop;
end $$;

notify pgrst, 'reload schema';
