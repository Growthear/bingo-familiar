-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'paused', 'finished', 'cancelled')),
  interval_seconds integer not null default 5 check (interval_seconds between 3 and 60),
  cards_per_player integer not null default 1 check (cards_per_player between 1 and 6),
  current_prize text check (current_prize in ('terno', 'linea', 'bingo')),
  show_drawn boolean not null default true,
  price_per_card integer not null default 0,
  terno_enabled boolean not null default true,
  linea_enabled boolean not null default true,
  shared_prizes boolean not null default false,
  game_number integer not null default 1,
  created_at timestamptz default now() not null,
  started_at timestamptz,
  finished_at timestamptz
);

create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now() not null,
  unique(room_id, player_id)
);

create table public.bingo_cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  card_number integer not null check (card_number between 1 and 6),
  numbers jsonb not null,
  game_number integer not null default 1,
  created_at timestamptz default now() not null
);

create table public.drawn_numbers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  number integer not null check (number between 1 and 90),
  draw_order integer not null,
  drawn_at timestamptz default now() not null,
  unique(room_id, number)
);

create table public.wins (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  card_id uuid references public.bingo_cards(id) on delete cascade not null,
  prize_type text not null check (prize_type in ('terno', 'linea', 'bingo')),
  draw_order_at_claim integer,
  game_number integer not null default 1,
  won_at timestamptz default now() not null,
  unique(room_id, player_id, prize_type, game_number)
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.bingo_cards enable row level security;
alter table public.drawn_numbers enable row level security;
alter table public.wins enable row level security;

-- profiles
create policy "Profiles viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- rooms
create policy "Rooms viewable by authenticated" on public.rooms
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can create rooms" on public.rooms
  for insert with check (auth.uid() = host_id);
create policy "Host can update room" on public.rooms
  for update using (auth.uid() = host_id);

-- room_players
create policy "Room players viewable by authenticated" on public.room_players
  for select using (auth.role() = 'authenticated');
create policy "Authenticated users can join rooms" on public.room_players
  for insert with check (auth.uid() = player_id);
create policy "Players can leave rooms" on public.room_players
  for delete using (auth.uid() = player_id);
create policy "Host can remove players from room" on public.room_players
  for delete using (
    auth.uid() = (select host_id from public.rooms where id = room_id)
  );

-- bingo_cards
create policy "Players can see own cards" on public.bingo_cards
  for select using (auth.uid() = player_id);
create policy "Players can insert own cards" on public.bingo_cards
  for insert with check (auth.uid() = player_id);
create policy "Host can insert cards for room" on public.bingo_cards
  for insert with check (
    auth.uid() = (select host_id from public.rooms where id = room_id)
  );
create policy "Host can delete room cards" on public.bingo_cards
  for delete using (
    auth.uid() = (select host_id from public.rooms where id = room_id)
  );

-- drawn_numbers
create policy "Drawn numbers viewable by authenticated" on public.drawn_numbers
  for select using (auth.role() = 'authenticated');
create policy "Host can insert drawn numbers" on public.drawn_numbers
  for insert with check (
    auth.uid() = (select host_id from public.rooms where id = room_id)
  );
create policy "Host can delete drawn numbers" on public.drawn_numbers
  for delete using (
    auth.uid() = (select host_id from public.rooms where id = room_id)
  );

-- wins
create policy "Wins viewable by authenticated" on public.wins
  for select using (auth.role() = 'authenticated');
create policy "Players can claim own wins" on public.wins
  for insert with check (auth.uid() = player_id);

-- ─────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- ─────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- DRAW NUMBER FUNCTION
-- ─────────────────────────────────────────────

create or replace function public.draw_next_number(p_room_id uuid)
returns integer as $$
declare
  v_number integer;
  v_draw_order integer;
begin
  if not exists (
    select 1 from public.rooms
    where id = p_room_id and status = 'playing' and host_id = auth.uid()
  ) then
    raise exception 'Solo el host puede sacar números';
  end if;

  select coalesce(max(draw_order), 0) + 1 into v_draw_order
  from public.drawn_numbers where room_id = p_room_id;

  select n into v_number
  from generate_series(1, 90) as n
  where n not in (select number from public.drawn_numbers where room_id = p_room_id)
  order by random()
  limit 1;

  if v_number is null then
    return null;
  end if;

  insert into public.drawn_numbers (room_id, number, draw_order)
  values (p_room_id, v_number, v_draw_order);

  return v_number;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────
-- CLAIM PRIZE FUNCTION
-- ─────────────────────────────────────────────

create or replace function public.claim_prize(
  p_room_id uuid,
  p_card_id uuid,
  p_prize_type text
)
returns jsonb as $$
declare
  v_card_numbers jsonb;
  v_drawn_nums integer[];
  v_player_id uuid;
  v_row jsonb;
  v_drawn_count integer;
  v_total_count integer;
  v_is_valid boolean := false;
  v_draw_order integer;
  v_shared_prizes boolean;
  v_first_claim_order integer;
  v_game_number integer;
begin
  v_player_id := auth.uid();

  -- Get current game context first so we can scope the card lookup to the current game
  select shared_prizes, game_number into v_shared_prizes, v_game_number
  from public.rooms where id = p_room_id;

  select numbers into v_card_numbers
  from public.bingo_cards
  where id = p_card_id and room_id = p_room_id and player_id = v_player_id
    and game_number = v_game_number;

  if v_card_numbers is null then
    return jsonb_build_object('success', false, 'error', 'Cartón no encontrado');
  end if;

  select array_agg(number) into v_drawn_nums
  from public.drawn_numbers where room_id = p_room_id;

  select coalesce(max(draw_order), 0) into v_draw_order
  from public.drawn_numbers where room_id = p_room_id;

  if p_prize_type = 'terno' then
    for v_row in select * from jsonb_array_elements(v_card_numbers) loop
      select count(*) into v_drawn_count
      from jsonb_array_elements(v_row) as n
      where n::text != 'null' and (n::text)::integer = any(v_drawn_nums);

      if v_drawn_count >= 3 then
        v_is_valid := true;
        exit;
      end if;
    end loop;

  elsif p_prize_type = 'linea' then
    for v_row in select * from jsonb_array_elements(v_card_numbers) loop
      select count(*) into v_drawn_count
      from jsonb_array_elements(v_row) as n
      where n::text != 'null' and (n::text)::integer = any(v_drawn_nums);

      select count(*) into v_total_count
      from jsonb_array_elements(v_row) as n
      where n::text != 'null';

      if v_drawn_count = v_total_count and v_total_count = 5 then
        v_is_valid := true;
        exit;
      end if;
    end loop;

  elsif p_prize_type = 'bingo' then
    select count(*) into v_drawn_count
    from jsonb_array_elements(v_card_numbers) as row_arr,
         jsonb_array_elements(row_arr) as n
    where n::text != 'null' and (n::text)::integer = any(v_drawn_nums);

    select count(*) into v_total_count
    from jsonb_array_elements(v_card_numbers) as row_arr,
         jsonb_array_elements(row_arr) as n
    where n::text != 'null';

    v_is_valid := (v_drawn_count = v_total_count);
  else
    return jsonb_build_object('success', false, 'error', 'Tipo de premio inválido');
  end if;

  if not v_is_valid then
    return jsonb_build_object('success', false, 'error', 'Premio no válido todavía');
  end if;

  if not v_shared_prizes then
    -- Non-shared mode: only first claimer wins each prize (within current game)
    if exists (
      select 1 from public.wins
      where room_id = p_room_id and prize_type = p_prize_type and game_number = v_game_number
    ) then
      return jsonb_build_object('success', false, 'error', 'El premio ya fue cantado');
    end if;
  else
    -- Shared mode: multiple winners allowed but only within the same draw window
    select draw_order_at_claim into v_first_claim_order
    from public.wins
    where room_id = p_room_id and prize_type = p_prize_type and game_number = v_game_number
    order by won_at limit 1;

    if v_first_claim_order is not null and v_draw_order > v_first_claim_order then
      return jsonb_build_object('success', false, 'error', 'El premio ya fue cantado');
    end if;
  end if;

  if exists (
    select 1 from public.wins
    where room_id = p_room_id and player_id = v_player_id and prize_type = p_prize_type
    and game_number = v_game_number
  ) then
    return jsonb_build_object('success', false, 'error', 'Ya ganaste este premio');
  end if;

  insert into public.wins (room_id, player_id, card_id, prize_type, draw_order_at_claim, game_number)
  values (p_room_id, v_player_id, p_card_id, p_prize_type, v_draw_order, v_game_number);

  -- Pausar la sala para terno/línea de forma atómica (antes de que dispare el realtime)
  if p_prize_type in ('terno', 'linea') then
    update public.rooms set status = 'paused'
    where id = p_room_id and status = 'playing';
  end if;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────

alter publication supabase_realtime add table public.drawn_numbers;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.wins;
