create or replace function online_private.initial_state() returns jsonb language sql immutable set search_path = '' as $$
  select '{"schema":1,"actions":[],"usage":{"freeze":0,"shield":0,"undo":0,"redo":0,"best":0,"worst":0},"redo":null,"eggs":{"w":1,"b":1},"collected":{"w":0,"b":0},"rewarded":[],"suggestions":null,"seen":[],"result":null,"drawOffer":null,"rematchOffer":null}'::jsonb
$$;
