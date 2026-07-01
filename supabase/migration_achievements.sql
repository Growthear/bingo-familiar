-- ─────────────────────────────────────────────
-- MIGRACIÓN: sistema de logros / badges
-- Ejecutar en el SQL Editor del dashboard de Supabase
-- ─────────────────────────────────────────────

-- ── TABLAS ───────────────────────────────────────────────────────────────────

create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  category text not null check (category in ('participation', 'wins', 'prizes', 'special', 'social', 'profile'))
);

-- Registra qué partidas jugó cada usuario (disparado por trigger cuando la sala termina)
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.profiles(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  game_number integer not null default 1,
  played_at timestamptz default now() not null,
  unique(player_id, room_id, game_number)
);

-- Logros desbloqueados por usuario
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id text references public.achievements(id) not null,
  earned_at timestamptz default now() not null,
  unique(player_id, achievement_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.achievements enable row level security;
alter table public.game_sessions enable row level security;
alter table public.user_achievements enable row level security;

create policy "Achievements viewable by everyone" on public.achievements
  for select using (true);

create policy "Game sessions viewable by authenticated" on public.game_sessions
  for select using (auth.role() = 'authenticated');

create policy "User achievements viewable by authenticated" on public.user_achievements
  for select using (auth.role() = 'authenticated');

-- ── SEED DE LOGROS ───────────────────────────────────────────────────────────

insert into public.achievements (id, name, description, icon, category) values
  ('first_game',       'Primera partida',  'Jugaste tu primera partida de bingo',               '🎱', 'participation'),
  ('five_games',       'Jugador habitual', 'Jugaste 5 partidas',                                 '🎯', 'participation'),
  ('ten_games',        'Veterano',         'Jugaste 10 partidas',                                '🏅', 'participation'),
  ('twentyfive_games', 'Adicto al bingo',  '25 partidas jugadas',                               '🎰', 'participation'),
  ('multi_card',       'Coleccionista',    'Jugaste una partida con 3 o más cartones',           '📋', 'participation'),
  ('first_win',        'Primer triunfo',   'Ganaste tu primer premio',                           '⭐', 'wins'),
  ('five_wins',        'Ganador',          'Ganaste 5 premios en total',                         '🌟', 'wins'),
  ('ten_wins',         'Campeón',          'Ganaste 10 premios en total',                        '🥇', 'wins'),
  ('twentyfive_wins',  'Leyenda',          '25 premios ganados',                                '👑', 'wins'),
  ('first_terno',      '¡Terno!',          'Cantaste tu primer terno',                           '3️⃣', 'prizes'),
  ('first_linea',      '¡Línea!',          'Completaste tu primera línea',                       '➡️',  'prizes'),
  ('first_bingo',      '¡BINGO!',          'Cantaste tu primer bingo',                           '🎉', 'prizes'),
  ('fast_bingo',       'Rayo',             'Bingo antes del número 20',                          '⚡', 'special'),
  ('lucky_terno',      'Suertudo',         'Terno en los primeros 15 números sorteados',         '🍀', 'special'),
  ('hat_trick',        'Hat trick',        'Ganaste terno, línea y bingo en la misma partida',   '🎩', 'special'),
  ('first_host',       'Anfitrión',        'Creaste tu primera sala de bingo',                   '🏠', 'social'),
  ('profile_complete', 'Perfil completo',  'Foto de perfil y alias de MP configurados',          '💎', 'profile')
on conflict (id) do nothing;

-- ── REALTIME ─────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.user_achievements;

-- ── TRIGGER: registrar partidas al terminar la sala ──────────────────────────

create or replace function public.record_game_sessions_on_finish()
returns trigger as $$
begin
  if new.status = 'finished' and old.status != 'finished' then
    insert into public.game_sessions (player_id, room_id, game_number)
    select player_id, new.id, new.game_number
    from public.room_players
    where room_id = new.id
    on conflict (player_id, room_id, game_number) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_room_finished_record_sessions on public.rooms;
create trigger on_room_finished_record_sessions
  after update on public.rooms
  for each row execute procedure public.record_game_sessions_on_finish();

-- ── FUNCIÓN: check_and_grant_achievements ────────────────────────────────────
-- Devuelve array con los IDs de logros recién desbloqueados

create or replace function public.check_and_grant_achievements(p_player_id uuid)
returns text[] as $$
declare
  v_new         text[] := '{}';
  v_games       integer;
  v_wins        integer;
  v_bingo_wins  integer;
  v_terno_wins  integer;
  v_linea_wins  integer;
  v_rooms_created integer;
  v_profile_done  boolean;
  v_fast_bingo    boolean;
  v_lucky_terno   boolean;
  v_hat_trick     boolean;
  v_multi_card    boolean;
begin
  -- Conteos básicos
  select count(*) into v_games        from public.game_sessions where player_id = p_player_id;
  select count(*) into v_wins         from public.wins where player_id = p_player_id;
  select count(*) into v_bingo_wins   from public.wins where player_id = p_player_id and prize_type = 'bingo';
  select count(*) into v_terno_wins   from public.wins where player_id = p_player_id and prize_type = 'terno';
  select count(*) into v_linea_wins   from public.wins where player_id = p_player_id and prize_type = 'linea';
  select count(*) into v_rooms_created from public.rooms where host_id = p_player_id;

  -- Perfil completo: tiene avatar_url y mp_alias
  select (avatar_url is not null and mp_alias is not null and length(trim(mp_alias)) > 0)
  into v_profile_done from public.profiles where id = p_player_id;

  -- Bingo rápido: antes del número 20
  select exists(
    select 1 from public.wins
    where player_id = p_player_id and prize_type = 'bingo'
      and draw_order_at_claim is not null and draw_order_at_claim < 20
  ) into v_fast_bingo;

  -- Terno suertudo: primeros 15 números
  select exists(
    select 1 from public.wins
    where player_id = p_player_id and prize_type = 'terno'
      and draw_order_at_claim is not null and draw_order_at_claim <= 15
  ) into v_lucky_terno;

  -- Hat trick: terno + línea + bingo en la misma partida
  select exists(
    select 1 from public.wins w
    where w.player_id = p_player_id and w.prize_type = 'bingo'
      and exists(select 1 from public.wins where player_id = p_player_id and prize_type = 'terno' and room_id = w.room_id and game_number = w.game_number)
      and exists(select 1 from public.wins where player_id = p_player_id and prize_type = 'linea' and room_id = w.room_id and game_number = w.game_number)
  ) into v_hat_trick;

  -- Coleccionista: 3+ cartones en alguna partida
  select exists(
    select 1 from public.bingo_cards
    where player_id = p_player_id
    group by room_id, game_number
    having count(*) >= 3
  ) into v_multi_card;

  -- ── OTORGAR LOGROS ───────────────────────────────────────────────────────

  -- Participación
  if v_games >= 1 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'first_game') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'first_game');
    v_new := array_append(v_new, 'first_game');
  end if;

  if v_games >= 5 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'five_games') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'five_games');
    v_new := array_append(v_new, 'five_games');
  end if;

  if v_games >= 10 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'ten_games') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'ten_games');
    v_new := array_append(v_new, 'ten_games');
  end if;

  if v_games >= 25 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'twentyfive_games') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'twentyfive_games');
    v_new := array_append(v_new, 'twentyfive_games');
  end if;

  if v_multi_card and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'multi_card') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'multi_card');
    v_new := array_append(v_new, 'multi_card');
  end if;

  -- Victorias
  if v_wins >= 1 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'first_win') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'first_win');
    v_new := array_append(v_new, 'first_win');
  end if;

  if v_wins >= 5 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'five_wins') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'five_wins');
    v_new := array_append(v_new, 'five_wins');
  end if;

  if v_wins >= 10 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'ten_wins') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'ten_wins');
    v_new := array_append(v_new, 'ten_wins');
  end if;

  if v_wins >= 25 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'twentyfive_wins') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'twentyfive_wins');
    v_new := array_append(v_new, 'twentyfive_wins');
  end if;

  -- Premios por tipo
  if v_terno_wins >= 1 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'first_terno') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'first_terno');
    v_new := array_append(v_new, 'first_terno');
  end if;

  if v_linea_wins >= 1 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'first_linea') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'first_linea');
    v_new := array_append(v_new, 'first_linea');
  end if;

  if v_bingo_wins >= 1 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'first_bingo') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'first_bingo');
    v_new := array_append(v_new, 'first_bingo');
  end if;

  -- Especiales
  if v_fast_bingo and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'fast_bingo') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'fast_bingo');
    v_new := array_append(v_new, 'fast_bingo');
  end if;

  if v_lucky_terno and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'lucky_terno') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'lucky_terno');
    v_new := array_append(v_new, 'lucky_terno');
  end if;

  if v_hat_trick and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'hat_trick') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'hat_trick');
    v_new := array_append(v_new, 'hat_trick');
  end if;

  -- Social
  if v_rooms_created >= 1 and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'first_host') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'first_host');
    v_new := array_append(v_new, 'first_host');
  end if;

  -- Perfil
  if v_profile_done and not exists(select 1 from public.user_achievements where player_id = p_player_id and achievement_id = 'profile_complete') then
    insert into public.user_achievements (player_id, achievement_id) values (p_player_id, 'profile_complete');
    v_new := array_append(v_new, 'profile_complete');
  end if;

  return v_new;
end;
$$ language plpgsql security definer;
