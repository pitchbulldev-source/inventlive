-- =============================================================================
-- Migración 2/2 · Funciones transaccionales del wallet (SECURITY DEFINER)
-- Toda mutación de dinero/fichas pasa por acá. El cliente NUNCA escribe balances,
-- ledger_entries, gift_events ni purchases directo (no hay policies de INSERT).
-- Atomicidad + anti doble-gasto vía SELECT ... FOR UPDATE sobre `balances`.
-- =============================================================================

-- Conversión de negocio (parametrizable): 1 bean = 1 centavo USD al hacer payout.
-- Ajustar cuando se defina la tasa real host↔plataforma.
-- (Se usa inline en request_payout con un comentario, para el MVP.)

-- -----------------------------------------------------------------------------
-- Helper interno: aplica un movimiento al ledger + balance de forma atómica.
-- Lockea la fila de balance (FOR UPDATE) para serializar por (user,currency).
-- Rechaza si el saldo quedaría negativo. Idempotencia por (kind,ref_type,ref_id).
-- -----------------------------------------------------------------------------
create or replace function _apply_ledger(
  p_user uuid, p_currency currency_kind, p_delta bigint,
  p_kind ledger_kind, p_ref_type text, p_ref_id text
) returns bigint
language plpgsql
security definer set search_path = public
as $$
declare v_bal bigint;
begin
  insert into balances (user_id, currency, balance)
    values (p_user, p_currency, 0)
    on conflict (user_id, currency) do nothing;

  select balance into v_bal
    from balances where user_id = p_user and currency = p_currency
    for update;                              -- lock anti doble-gasto

  if v_bal + p_delta < 0 then
    raise exception 'insufficient_funds' using errcode = 'check_violation';
  end if;
  v_bal := v_bal + p_delta;

  update balances set balance = v_bal, updated_at = now()
    where user_id = p_user and currency = p_currency;

  insert into ledger_entries (user_id, currency, delta, kind, ref_type, ref_id, balance_after)
    values (p_user, p_currency, p_delta, p_kind, p_ref_type, p_ref_id, v_bal);

  return v_bal;
end;
$$;

-- -----------------------------------------------------------------------------
-- credit_purchase: acredita fichas al confirmarse una compra (webhook Wompi).
-- Idempotente: si ya está approved, no hace nada. SOLO server (service_role).
-- -----------------------------------------------------------------------------
create or replace function credit_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare v_p purchases%rowtype;
begin
  select * into v_p from purchases where id = p_purchase_id for update;
  if not found then raise exception 'purchase_not_found'; end if;
  if v_p.status = 'approved' then return; end if;          -- idempotente

  update purchases set status = 'approved', updated_at = now() where id = p_purchase_id;

  perform _apply_ledger(
    v_p.user_id, 'coin', v_p.coins,
    'purchase', 'purchase', p_purchase_id::text
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- send_gift: el corazón. Debita coins al emisor, acredita beans al host,
-- registra el evento. Todo atómico. Corre como el usuario autenticado.
-- Idempotente por p_idempotency_key (reintentos de red no duplican).
-- -----------------------------------------------------------------------------
create or replace function send_gift(
  p_room_id uuid, p_gift_id uuid, p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_gift   gifts%rowtype;
  v_room   rooms%rowtype;
  v_event  gift_events%rowtype;
  v_coin_bal bigint;
begin
  if v_sender is null then raise exception 'not_authenticated'; end if;

  -- Idempotencia: si ya se procesó esta key, devolver el resultado previo
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

  -- 1) registrar el evento (snapshots de coins/beans)
  insert into gift_events (room_id, sender_id, host_id, gift_id, coins, beans, idempotency_key)
    values (p_room_id, v_sender, v_room.host_id, p_gift_id, v_gift.coin_cost, v_gift.bean_value, p_idempotency_key)
    returning * into v_event;

  -- 2) debitar coins al emisor (falla acá si no alcanza -> rollback de todo)
  v_coin_bal := _apply_ledger(v_sender, 'coin', -v_gift.coin_cost, 'gift_sent', 'gift_event', v_event.id::text);

  -- 3) acreditar beans al host
  perform _apply_ledger(v_room.host_id, 'bean', v_gift.bean_value, 'gift_recv', 'gift_event', v_event.id::text);

  return jsonb_build_object(
    'gift_event_id', v_event.id,
    'coin_balance', v_coin_bal,
    'coins_spent', v_gift.coin_cost,
    'beans_awarded', v_gift.bean_value,
    'idempotent', false
  );
exception
  when unique_violation then
    -- reintento CONCURRENTE con la misma idempotency_key: la tx propia se revierte
    -- (sin doble débito) y devolvemos el resultado ya persistido por la primera.
    select * into v_event from gift_events where idempotency_key = p_idempotency_key;
    select balance into v_coin_bal from balances where user_id = v_sender and currency = 'coin';
    return jsonb_build_object('gift_event_id', v_event.id, 'coin_balance', v_coin_bal, 'idempotent', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- request_payout: el host reserva beans y crea una solicitud de payout.
-- Corre como el host autenticado. Retiene los beans en el mismo acto (hold).
-- -----------------------------------------------------------------------------
create or replace function request_payout(p_beans bigint)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_host uuid := auth.uid();
  v_payout_id uuid;
  v_cents_usd bigint;
begin
  if v_host is null then raise exception 'not_authenticated'; end if;
  -- serializar por host: evita payouts duplicados por doble-click o reintento de red
  perform pg_advisory_xact_lock(hashtextextended(v_host::text, 0));
  if not exists (select 1 from hosts where user_id = v_host and is_active) then
    raise exception 'not_a_host';
  end if;
  if p_beans <= 0 then raise exception 'invalid_amount'; end if;
  -- un solo retiro pendiente por host a la vez (dedup de intención de pago)
  if exists (select 1 from payouts where host_id = v_host and status in ('requested', 'processing')) then
    raise exception 'payout_already_pending';
  end if;

  -- Tasa MVP: 1 bean = 1 centavo USD (parametrizar según acuerdo con el host)
  v_cents_usd := p_beans * 1;

  insert into payouts (host_id, beans, cents_usd, status)
    values (v_host, p_beans, v_cents_usd, 'requested')
    returning id into v_payout_id;

  -- retener beans (falla si no alcanza -> rollback)
  perform _apply_ledger(v_host, 'bean', -p_beans, 'payout_hold', 'payout', v_payout_id::text);

  return v_payout_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants: cerrar por defecto, abrir lo justo.
-- -----------------------------------------------------------------------------
revoke all on function _apply_ledger(uuid, currency_kind, bigint, ledger_kind, text, text) from public;
revoke all on function credit_purchase(uuid) from public;
revoke all on function send_gift(uuid, uuid, text) from public;
revoke all on function request_payout(bigint) from public;

-- send_gift y request_payout: los ejecuta el usuario logueado
grant execute on function send_gift(uuid, uuid, text) to authenticated;
grant execute on function request_payout(bigint) to authenticated;
-- credit_purchase: SOLO el server (webhook con service_role). _apply_ledger: nadie directo.
grant execute on function credit_purchase(uuid) to service_role;
