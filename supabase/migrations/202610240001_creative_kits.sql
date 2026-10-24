-- Creative kits saved by signed-in players. "Save kit" in Creative writes here
-- for accounts (guests keep the browser-only library), so the kit follows the
-- login across reloads and computers. Only the owner reads or writes its rows.
create table online_private.creative_kits (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kit jsonb not null check (jsonb_typeof(kit)='object' and octet_length(kit::text) <= 1500000),
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);
alter table online_private.creative_kits enable row level security;
revoke all on online_private.creative_kits from public, anon, authenticated;
grant all on online_private.creative_kits to service_role;

create function online_private.require_account() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_user();
begin
  if coalesce((nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'is_anonymous')::boolean,false) then
    raise exception 'ACCOUNT_REQUIRED' using errcode='42501';
  end if;
  return u;
end $$;

-- Metadata only: the library lists names without downloading every kit.
create function public.creative_kits() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_account();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('name',k.name,'updated_at',k.updated_at) order by k.updated_at)
    from online_private.creative_kits k where k.user_id=u), '[]'::jsonb);
end $$;

create function public.creative_kit(p_name text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid:=online_private.require_account();
begin
  return (select k.kit from online_private.creative_kits k where k.user_id=u and k.name=p_name);
end $$;

create function public.creative_kit_save(p_name text, p_kit jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_account(); saved timestamptz;
begin
  if p_name is null or char_length(p_name) not between 1 and 80 or p_kit is null or jsonb_typeof(p_kit)<>'object' or p_kit->>'name' is distinct from p_name then
    raise exception 'INVALID_KIT' using errcode='22023';
  end if;
  if octet_length(p_kit::text) > 1500000 then raise exception 'KIT_TOO_LARGE' using errcode='22023'; end if;
  perform 1 from online_private.creative_kits where user_id=u for update;
  if not exists(select 1 from online_private.creative_kits where user_id=u and name=p_name)
    and (select count(*) from online_private.creative_kits where user_id=u) >= 30 then
    raise exception 'KIT_LIMIT' using errcode='22023';
  end if;
  insert into online_private.creative_kits(user_id,name,kit,updated_at) values(u,p_name,p_kit,clock_timestamp())
  on conflict(user_id,name) do update set kit=excluded.kit, updated_at=excluded.updated_at
  returning updated_at into saved;
  return jsonb_build_object('name',p_name,'updated_at',saved);
end $$;

revoke all on function online_private.require_account() from public, anon, authenticated;
grant execute on function online_private.require_account() to service_role;
revoke all on function public.creative_kits(), public.creative_kit(text), public.creative_kit_save(text,jsonb) from public, anon;
grant execute on function public.creative_kits(), public.creative_kit(text), public.creative_kit_save(text,jsonb) to authenticated, service_role;
