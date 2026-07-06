-- =============================================================================
-- Press-hold gifting: enviar N regalos del mismo tipo en un combo, atómico.
-- =============================================================================

alter table gift_events add column qty int not null default 1;

create or replace function send_gift_combo(
  p_room_id uuid, p_gift_id uuid, p_qty int, p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_gift   gifts%rowtype;
  v_room   rooms%rowtype;
  v_event  gift_events%rowtype;
  v_coin_bal bigint;
  v_total_coins bigint;
  v_total_beans bigint;
begin
  if v_sender is null then raise exception 'not_authenticated'; end if;
  if p_qty < 1 or p_qty > 99 then raise exception 'invalid_qty'; end if;

  -- idempotencia
  if p_idempotency_key is not null then
    select * into v_event from gift_events where idempotency_key = p_idempotency_key;
    if found then
      select balance into v_coin_bal from balances where user_id = v_sender and currency = 'coin';
      return jsonb_build_object('gift_event_id', v_event.id, 'coin_balance', v_coin_bal, 'idempotent', true);
    end if;
  end if;

  select * into v_gift from gifts where id = p_gift_id and is_active;
  if not found then raise exception 'gift_not_found'; end if;
  select * into v_room from rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.status <> 'live' then raise exception 'room_not_live'; end if;
  if v_room.host_id = v_sender then raise exception 'cannot_gift_self'; end if;

  v_total_coins := v_gift.coin_cost * p_qty;
  v_total_beans := v_gift.bean_value * p_qty;

  insert into gift_events (room_id, sender_id, host_id, gift_id, coins, beans, qty, idempotency_key)
    values (p_room_id, v_sender, v_room.host_id, p_gift_id, v_total_coins, v_total_beans, p_qty, p_idempotency_key)
    returning * into v_event;

  v_coin_bal := _apply_ledger(v_sender, 'coin', -v_total_coins, 'gift_sent', 'gift_event', v_event.id::text);
  perform _apply_ledger(v_room.host_id, 'bean', v_total_beans, 'gift_recv', 'gift_event', v_event.id::text);

  return jsonb_build_object('gift_event_id', v_event.id, 'coin_balance', v_coin_bal,
    'coins_spent', v_total_coins, 'beans_awarded', v_total_beans, 'qty', p_qty, 'idempotent', false);
exception
  when unique_violation then
    select * into v_event from gift_events where idempotency_key = p_idempotency_key;
    select balance into v_coin_bal from balances where user_id = v_sender and currency = 'coin';
    return jsonb_build_object('gift_event_id', v_event.id, 'coin_balance', v_coin_bal, 'idempotent', true);
end;
$$;

revoke all on function send_gift_combo(uuid, uuid, int, text) from public;
grant execute on function send_gift_combo(uuid, uuid, int, text) to authenticated;
grant execute on function send_gift_combo(uuid, uuid, int, text) to service_role;
