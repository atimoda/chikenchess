-- The Mesa de chickenchess in the middle of the Arena das Almas of the example Pátio "Arquipélago das Almas"
-- (lib/pigchicken/example-deadlock.ts, row 5e7a0c11-0008-4e5a-9c0d-ec5a3b1e0008), and west of it a locked Ativador
-- de grid that only its Chave de ouro turns on. The admin may have edited that Pátio in the editor since it was
-- seeded, so its layout is not replaced: the table and the activator are added at the end of its elements (each
-- once: nothing happens for one it already has), and the arena's Jukebox, Gongo and Baú move to the sides only while
-- they are still where the seed put them. The revision goes up so every browser takes it. Without that row (a local
-- database) nothing happens.
do $$
declare
  lobby uuid := '5e7a0c11-0008-4e5a-9c0d-ec5a3b1e0008';
  lay jsonb;
  els jsonb;
  -- id: the seed's position (ox, oy) and the new one (x, y)
  moved jsonb := '{
    "jukebox-arq382": {"ox": 9284, "oy": 686, "x": 9064, "y": 660.4},
    "gong-arq383": {"ox": 9528, "oy": 630, "x": 9888, "y": 630},
    "chest-arq384": {"ox": 9884, "oy": 830, "x": 10174, "y": 759.6}
  }';
  activator jsonb := '{"id":"mineactivator-arq470","kind":"mineactivator","x":8080,"y":687.6,"w":240,"h":200,"rot":0,"layer":"scene","locked":false,"solid":false,"shots":false,"notes":false,"hidden":false,"opacity":1,"params":{"mineActivator":{"notes":48,"damage":1500,"lock":true,"cell":448,"gap":32,"corner":30}}}';
  chess jsonb := '{"id":"chesstable-arq469","kind":"chesstable","x":9380,"y":710,"w":440,"h":190,"rot":0,"layer":"scene","locked":false,"solid":false,"shots":false,"notes":false,"hidden":false,"opacity":1,"params":{"chessTable":{"city":"random","radius":1200}}}';
begin
  select layout into lay from online_private.patio_lobbies where id = lobby;
  if lay is null or jsonb_typeof(lay->'elements') <> 'array' then return; end if;
  if exists (select 1 from jsonb_array_elements(lay->'elements') e where e->>'kind' = 'chesstable') then
    -- the table is there already: only the activator, when it has none
    if exists (select 1 from jsonb_array_elements(lay->'elements') e where e->>'kind' = 'mineactivator') then return; end if;
    update online_private.patio_lobbies
      set layout = jsonb_set(lay, '{elements}', (lay->'elements') || jsonb_build_array(activator)),
        revision = revision + 1, updated_at = clock_timestamp(), last_edited_at = clock_timestamp()
      where id = lobby;
    return;
  end if;
  select coalesce(jsonb_agg(
      case when m is not null and (e->>'x')::numeric = (m->>'ox')::numeric and (e->>'y')::numeric = (m->>'oy')::numeric
        then e || jsonb_build_object('x', m->'x', 'y', m->'y') else e end
      order by i), '[]'::jsonb)
    into els
    from jsonb_array_elements(lay->'elements') with ordinality as t(e, i), lateral (select moved->(e->>'id') as m) mm;
  update online_private.patio_lobbies
    set layout = jsonb_set(lay, '{elements}', els || jsonb_build_array(chess)
        || (case when exists (select 1 from jsonb_array_elements(lay->'elements') e where e->>'kind' = 'mineactivator') then '[]'::jsonb else jsonb_build_array(activator) end)),
      revision = revision + 1, updated_at = clock_timestamp(), last_edited_at = clock_timestamp()
    where id = lobby;
end $$;
