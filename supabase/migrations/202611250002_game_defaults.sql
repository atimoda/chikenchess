-- The game's defaults of the Pátio panels with "Salvar no game" (Configurações do Pátio, Camadas, Câmera de Mira and
-- Ajustes, Volume, Grade de blocos, Itens, Escalas, Controles and Biblioteca de almas), one row per part. Until now
-- they were files of the repository (data/pigchicken/default-*.json, data/chicken/default-controls.json) written by
-- the local Admin; those files stay as what the game uses while a part has no saved row. Anyone, guests included,
-- reads them; only the admin account saves (online_private.require_admin). Every save lands in a history of the
-- last 50 versions of its part, which the admin lists and restores (a restore is a new save of an old value).
create table online_private.game_defaults (
  part text primary key check (part in ('settings','layers','camera','volume','mineGrid','items','scales','controls','souls')),
  value jsonb not null check (jsonb_typeof(value) in ('object','array') and octet_length(value::text) <= 400000),
  revision integer not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table online_private.game_defaults_history (
  id bigint generated always as identity primary key,
  part text not null,
  value jsonb not null,
  revision integer not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index game_defaults_history_part on online_private.game_defaults_history(part, id desc);
alter table online_private.game_defaults enable row level security;
alter table online_private.game_defaults_history enable row level security;
revoke all on online_private.game_defaults, online_private.game_defaults_history from public, anon, authenticated;
grant all on online_private.game_defaults, online_private.game_defaults_history to service_role;

-- p_known: {part: revision} the browser already holds. A part still at that revision comes back without its value
-- (egress: the items alone are about 180 kB).
create function public.game_defaults(p_known jsonb default null) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(d.part,
    jsonb_build_object('revision',d.revision,'updated_at',d.updated_at)
    || case when (p_known->>d.part) is not null and (p_known->>d.part) = d.revision::text then '{}'::jsonb else jsonb_build_object('value',d.value) end
  ), '{}'::jsonb)
  from online_private.game_defaults d
$$;

-- p_revision is the revision the editor started from (0 when the part was never saved): a save over a newer one fails
-- with CONFIG_CONFLICT instead of discarding the other change.
create function public.game_defaults_save(p_part text, p_value jsonb, p_revision integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_admin(); current_revision integer; saved online_private.game_defaults;
begin
  if p_part is null or p_part not in ('settings','layers','camera','volume','mineGrid','items','scales','controls','souls') then
    raise exception 'INVALID_PART' using errcode='22023';
  end if;
  if p_value is null or jsonb_typeof(p_value) not in ('object','array') then raise exception 'INVALID_CONFIG' using errcode='22023'; end if;
  if octet_length(p_value::text) > 400000 then raise exception 'CONFIG_TOO_LARGE' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtext('game_defaults:' || p_part));
  select revision into current_revision from online_private.game_defaults where part=p_part for update;
  if coalesce(current_revision,0) <> coalesce(p_revision,-1) then
    raise exception 'CONFIG_CONFLICT' using errcode='PT409';
  end if;
  insert into online_private.game_defaults(part,value,revision,updated_by,updated_at)
  values(p_part,p_value,1,u,clock_timestamp())
  on conflict(part) do update set value=excluded.value, revision=online_private.game_defaults.revision+1, updated_by=excluded.updated_by, updated_at=excluded.updated_at
  returning * into saved;
  insert into online_private.game_defaults_history(part,value,revision,updated_by,updated_at) values(saved.part,saved.value,saved.revision,u,saved.updated_at);
  delete from online_private.game_defaults_history h where h.part=p_part
    and h.id not in (select id from online_private.game_defaults_history where part=p_part order by id desc limit 50);
  return jsonb_build_object('revision',saved.revision,'updated_at',saved.updated_at,'value',saved.value);
end $$;

-- the admin's list of saved versions of a part (newest first, without the values) and one version's value
create function public.game_defaults_versions(p_part text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_admin();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'revision',h.revision,'updated_at',h.updated_at,
      'by',(select p.display_name from public.online_profiles p where p.id=h.updated_by)) order by h.id desc)
    from online_private.game_defaults_history h where h.part=p_part), '[]'::jsonb);
end $$;
create function public.game_defaults_version(p_id bigint) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_admin();
begin
  return (select jsonb_build_object('part',h.part,'revision',h.revision,'updated_at',h.updated_at,'value',h.value)
    from online_private.game_defaults_history h where h.id=p_id);
end $$;

-- the same for the Personagem panel (online_private.chicken_config_history, kept since 202611010001)
create function public.chicken_config_versions() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_admin();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'revision',h.revision,'updated_at',h.updated_at,
      'by',(select p.display_name from public.online_profiles p where p.id=h.updated_by)) order by h.id desc)
    from online_private.chicken_config_history h), '[]'::jsonb);
end $$;
create function public.chicken_config_version(p_id bigint) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_admin();
begin
  return (select jsonb_build_object('revision',h.revision,'updated_at',h.updated_at,'config',h.config)
    from online_private.chicken_config_history h where h.id=p_id);
end $$;

revoke all on function public.game_defaults(jsonb), public.game_defaults_save(text,jsonb,integer), public.game_defaults_versions(text),
  public.game_defaults_version(bigint), public.chicken_config_versions(), public.chicken_config_version(bigint) from public, anon;
grant execute on function public.game_defaults(jsonb) to anon, authenticated, service_role;
grant execute on function public.game_defaults_save(text,jsonb,integer), public.game_defaults_versions(text), public.game_defaults_version(bigint),
  public.chicken_config_versions(), public.chicken_config_version(bigint) to authenticated, service_role;
