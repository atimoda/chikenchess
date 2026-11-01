-- Central configuration of the player chicken (movement, animation, sound and look).
-- Every screen that draws the chicken reads it; the Pátio da Galinha (/patio) edits it, and only the
-- admin account saves it. Anyone, guests included, can read the current version. Without a saved row the
-- game uses the defaults in lib/chicken/params.ts. Each save also lands in a short history.
create table online_private.chicken_config (
  id text primary key check (id = 'player'),
  config jsonb not null check (jsonb_typeof(config)='object' and octet_length(config::text) <= 60000),
  revision integer not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table online_private.chicken_config_history (
  id bigint generated always as identity primary key,
  config jsonb not null,
  revision integer not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table online_private.chicken_config enable row level security;
alter table online_private.chicken_config_history enable row level security;
revoke all on online_private.chicken_config, online_private.chicken_config_history from public, anon, authenticated;
grant all on online_private.chicken_config, online_private.chicken_config_history to service_role;

-- Application admin: app_metadata.access_level = 'admin' on a non-anonymous account (see lib/admin/access.ts).
create function online_private.require_admin() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=auth.uid(); claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
begin
  if u is null then raise exception 'UNAUTHORIZED' using errcode='42501'; end if;
  if coalesce((claims->>'is_anonymous')::boolean,false) or claims->'app_metadata'->>'access_level' is distinct from 'admin' then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;
  return u;
end $$;

create function public.chicken_config() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('config',c.config,'revision',c.revision,'updated_at',c.updated_at)
  from online_private.chicken_config c where c.id='player'
$$;

-- p_revision is the revision the editor started from (0 when nothing was saved yet): a save over a
-- newer revision fails with CONFIG_CONFLICT instead of silently discarding the other change.
create function public.chicken_config_save(p_config jsonb, p_revision integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_admin(); current_revision integer; saved online_private.chicken_config;
begin
  if p_config is null or jsonb_typeof(p_config) is distinct from 'object' or jsonb_typeof(p_config->'params') is distinct from 'object' or jsonb_typeof(p_config->'look') is distinct from 'object' then
    raise exception 'INVALID_CONFIG' using errcode='22023';
  end if;
  if octet_length(p_config::text) > 60000 then raise exception 'CONFIG_TOO_LARGE' using errcode='22023'; end if;
  select revision into current_revision from online_private.chicken_config where id='player' for update;
  if coalesce(current_revision,0) <> coalesce(p_revision,-1) then
    raise exception 'CONFIG_CONFLICT' using errcode='40001';
  end if;
  insert into online_private.chicken_config(id,config,revision,updated_by,updated_at)
  values('player',p_config,1,u,clock_timestamp())
  on conflict(id) do update set config=excluded.config, revision=online_private.chicken_config.revision+1, updated_by=excluded.updated_by, updated_at=excluded.updated_at
  returning * into saved;
  insert into online_private.chicken_config_history(config,revision,updated_by,updated_at) values(saved.config,saved.revision,u,saved.updated_at);
  delete from online_private.chicken_config_history where id not in (select id from online_private.chicken_config_history order by id desc limit 50);
  return jsonb_build_object('config',saved.config,'revision',saved.revision,'updated_at',saved.updated_at);
end $$;

revoke all on function online_private.require_admin() from public, anon, authenticated;
grant execute on function online_private.require_admin() to service_role;
revoke all on function public.chicken_config(), public.chicken_config_save(jsonb,integer) from public, anon;
grant execute on function public.chicken_config() to anon, authenticated, service_role;
grant execute on function public.chicken_config_save(jsonb,integer) to authenticated, service_role;
