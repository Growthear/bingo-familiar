-- ─────────────────────────────────────────────
-- MIGRACIÓN: soporte para pausa y fixes varios
-- Ejecutar en el SQL Editor del dashboard de Supabase
-- ─────────────────────────────────────────────

-- 1. Agregar 'paused' y 'cancelled' al constraint de rooms.status
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check
  check (status in ('waiting', 'playing', 'paused', 'finished', 'cancelled'));

-- 2. Agregar draw_order_at_claim a la tabla wins (si no existe)
alter table public.wins add column if not exists draw_order_at_claim integer;

-- 3. Actualizar claim_prize: guarda draw_order_at_claim y pausa la sala en terno/línea
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
begin
  v_player_id := auth.uid();

  select numbers into v_card_numbers
  from public.bingo_cards
  where id = p_card_id and room_id = p_room_id and player_id = v_player_id;

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

  if exists (
    select 1 from public.wins
    where room_id = p_room_id and player_id = v_player_id and prize_type = p_prize_type
  ) then
    return jsonb_build_object('success', false, 'error', 'Ya ganaste este premio');
  end if;

  insert into public.wins (room_id, player_id, card_id, prize_type, draw_order_at_claim)
  values (p_room_id, v_player_id, p_card_id, p_prize_type, v_draw_order);

  -- Pausar la sala para terno/línea de forma atómica
  if p_prize_type in ('terno', 'linea') then
    update public.rooms set status = 'paused'
    where id = p_room_id and status = 'playing';
  end if;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;
