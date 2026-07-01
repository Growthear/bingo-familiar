-- ─────────────────────────────────────────────
-- MIGRACIÓN: política para que el host pueda expulsar jugadores
-- Ejecutar en el SQL Editor del dashboard de Supabase
-- ─────────────────────────────────────────────

-- Permite al host eliminar filas de room_players (expulsar jugadores)
drop policy if exists "Host can remove players from room" on public.room_players;
create policy "Host can remove players from room" on public.room_players
  for delete using (
    auth.uid() = (select host_id from public.rooms where id = room_id)
  );
