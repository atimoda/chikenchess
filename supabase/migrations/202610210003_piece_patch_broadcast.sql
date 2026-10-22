-- Piece edits reach the opponent as small Realtime broadcasts on the private
-- match topic (only the changed parameters). The database keeps the whole
-- piece for reloads and reconnects.
create policy chicken_match_broadcast_read on realtime.messages for select to authenticated
using (extension='broadcast' and online_private.can_join_match_topic((select realtime.topic())));
create policy chicken_match_broadcast_write on realtime.messages for insert to authenticated
with check (extension='broadcast' and online_private.can_join_match_topic((select realtime.topic())));
