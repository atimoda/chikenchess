-- "Piece present in this global section" was retired: a piece is present in a
-- section when the section names one of its MIDI variations, and a null
-- variation leaves it resting there. Saved account kits keep their sound:
-- unchecked sections become null, then the old flag is dropped everywhere.
-- The client applies the same rewrite when it reads an older kit.
create function online_private.migrate_piece_sections(p_kit jsonb) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_set(p_kit, '{instruments}', coalesce((
    select jsonb_object_agg(i.key, case
      when jsonb_typeof(i.value->'arrangement'->'sections') = 'object' then jsonb_set(i.value, '{arrangement,sections}', coalesce((
        select jsonb_object_agg(s.key, case
          when jsonb_typeof(s.value) <> 'object' then s.value
          when s.value->'active' = 'false'::jsonb then jsonb_set(s.value, '{variation}', 'null'::jsonb) - 'active'
          else s.value - 'active' end)
        from jsonb_each(i.value->'arrangement'->'sections') s), '{}'::jsonb))
      else i.value end)
    from jsonb_each(p_kit->'instruments') i), '{}'::jsonb))
$$;

update online_private.creative_kits k
set kit = online_private.migrate_piece_sections(k.kit)
where jsonb_typeof(k.kit->'instruments') = 'object'
  and exists (
    select 1 from jsonb_each(k.kit->'instruments') i
    cross join lateral jsonb_each(case when jsonb_typeof(i.value->'arrangement'->'sections') = 'object' then i.value->'arrangement'->'sections' else '{}'::jsonb end) s
    where jsonb_typeof(s.value) = 'object' and s.value ? 'active');

drop function online_private.migrate_piece_sections(jsonb);
