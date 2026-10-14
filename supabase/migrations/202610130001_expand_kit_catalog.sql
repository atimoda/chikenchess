-- Expand online kit catalog with Brazilian and African expansion cities.
insert into online_private.kit_catalog(id) values
  ('recife-1975'),
  ('rio-1995'),
  ('luanda-1982'),
  ('luanda-1965'),
  ('lagos-1975'),
  ('essaouira-1980'),
  ('maputo-1978'),
  ('dakar-1985'),
  ('luanda-1996'),
  ('harare-1981'),
  ('kinshasa-1978'),
  ('lagos-1982'),
  ('gaza-1987'),
  ('kisumu-1980')
on conflict (id) do nothing;

-- Expose public kit catalog RPC for dynamic client queries.
create or replace function public.online_kit_catalog() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from online_private.kit_catalog;
$$;

grant execute on function public.online_kit_catalog() to authenticated, anon;
