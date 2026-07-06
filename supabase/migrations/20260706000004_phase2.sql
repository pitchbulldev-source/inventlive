-- =============================================================================
-- Fase 2 · PK battles, ranking (leaderboards), follows, agencias
-- =============================================================================

-- ---------- FOLLOWS ----------
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  host_id     uuid not null references hosts(user_id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, host_id)
);
create index follows_host_idx on follows (host_id);

alter table follows enable row level security;
create policy "follows readable"    on follows for select using (true);
create policy "follows insert own"  on follows for insert with check (auth.uid() = follower_id);
create policy "follows delete own"  on follows for delete using (auth.uid() = follower_id);
grant select on follows to anon, authenticated;
grant insert, delete on follows to authenticated;

-- ---------- AGENCIAS: policies (la tabla existe desde migración 1, con RLS pero sin policy) ----------
create policy "agencies readable"     on agencies for select using (true);
create policy "agencies insert own"   on agencies for insert with check (auth.uid() = owner_id);
create policy "agencies owner update" on agencies for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant select on agencies to anon, authenticated;
grant insert, update on agencies to authenticated;
-- relación owner↔agencia 1-1 (evita romper .maybeSingle) + rango de comisión válido
create unique index agencies_owner_uq on agencies (owner_id);
alter table agencies add constraint default_split_bps_range check (default_split_bps between 0 and 10000);

-- ---------- PK BATTLES ----------
create type pk_status as enum ('active', 'finished');

create table pk_battles (
  id               uuid primary key default gen_random_uuid(),
  challenger_host  uuid not null references hosts(user_id) on delete cascade,
  opponent_host    uuid not null references hosts(user_id) on delete cascade,
  challenger_room  uuid not null references rooms(id) on delete cascade,
  opponent_room    uuid not null references rooms(id) on delete cascade,
  status           pk_status not null default 'active',
  duration_secs    int not null default 300,
  started_at       timestamptz not null default now(),
  ends_at          timestamptz not null,
  winner_host      uuid references hosts(user_id),
  created_at       timestamptz not null default now()
);
create index pk_active_idx on pk_battles (status) where status = 'active';
create index pk_rooms_idx  on pk_battles (challenger_room, opponent_room);
-- un host no puede estar en dos batallas activas a la vez
create unique index pk_one_active_challenger on pk_battles (challenger_host) where status = 'active';
create unique index pk_one_active_opponent   on pk_battles (opponent_host)   where status = 'active';

alter table pk_battles enable row level security;
create policy "pk readable" on pk_battles for select using (true);
grant select on pk_battles to anon, authenticated;

-- start_pk: el caller (host en vivo) desafía a otra sala en vivo. Solo por función.
create or replace function start_pk(p_opponent_room uuid, p_duration_secs int default 300)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_ch uuid := auth.uid();
  v_ch_room rooms%rowtype;
  v_op_room rooms%rowtype;
  v_id uuid;
begin
  if v_ch is null then raise exception 'not_authenticated'; end if;
  if p_duration_secs < 30 or p_duration_secs > 1800 then raise exception 'invalid_duration'; end if;

  select * into v_ch_room from rooms where host_id = v_ch and status = 'live';
  if not found then raise exception 'you_are_not_live'; end if;

  select * into v_op_room from rooms where id = p_opponent_room and status = 'live';
  if not found then raise exception 'opponent_not_live'; end if;
  if v_op_room.host_id = v_ch then raise exception 'cannot_pk_self'; end if;

  -- Serializar por AMBOS hosts (orden estable para evitar deadlock). Cierra la
  -- carrera cruzada de roles que los unique index parciales por-columna no cubren.
  perform pg_advisory_xact_lock(hashtextextended(least(v_ch::text, v_op_room.host_id::text), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_ch::text, v_op_room.host_id::text), 0));

  -- Ahora bajo lock: ya no es TOCTOU.
  if exists (
    select 1 from pk_battles
    where status = 'active'
      and (v_ch = challenger_host or v_ch = opponent_host
           or v_op_room.host_id = challenger_host or v_op_room.host_id = opponent_host)
  ) then
    raise exception 'battle_in_progress';
  end if;

  insert into pk_battles (challenger_host, opponent_host, challenger_room, opponent_room, duration_secs, started_at, ends_at)
  values (v_ch, v_op_room.host_id, v_ch_room.id, p_opponent_room, p_duration_secs, now(), now() + make_interval(secs => p_duration_secs))
  returning id into v_id;
  return v_id;
end;
$$;

-- pk_scores: puntaje EN VIVO = beans recibidos por cada host dentro de la ventana.
create or replace function pk_scores(p_battle uuid)
returns table(host_id uuid, score bigint)
language sql stable security definer set search_path = public
as $$
  -- Puntaje atado a la SALA de la batalla (no al host), y ventana semiabierta
  -- [started_at, ends_at): impide inflar el score desde otra sala del mismo host.
  with b as (select * from pk_battles where id = p_battle)
  select b.challenger_host,
         coalesce((select sum(ge.beans) from gift_events ge, b
                   where ge.room_id = b.challenger_room and ge.created_at >= b.started_at and ge.created_at < b.ends_at), 0)::bigint
  from b
  union all
  select b.opponent_host,
         coalesce((select sum(ge.beans) from gift_events ge, b
                   where ge.room_id = b.opponent_room and ge.created_at >= b.started_at and ge.created_at < b.ends_at), 0)::bigint
  from b;
$$;

-- resolve_pk: si venció, declara ganador (empate → winner null). Idempotente.
create or replace function resolve_pk(p_battle uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare b pk_battles%rowtype; s_ch bigint; s_op bigint;
begin
  select * into b from pk_battles where id = p_battle for update;
  if not found or b.status <> 'active' then return; end if;
  if now() < b.ends_at then return; end if;

  select score into s_ch from pk_scores(p_battle) where host_id = b.challenger_host;
  select score into s_op from pk_scores(p_battle) where host_id = b.opponent_host;

  update pk_battles set status = 'finished',
    winner_host = case
      when coalesce(s_ch,0) = coalesce(s_op,0) then null
      when coalesce(s_ch,0) >  coalesce(s_op,0) then b.challenger_host
      else b.opponent_host end
  where id = p_battle;
end;
$$;

revoke all on function start_pk(uuid, int) from public;
revoke all on function pk_scores(uuid) from public;
revoke all on function resolve_pk(uuid) from public;
grant execute on function start_pk(uuid, int) to authenticated;
grant execute on function pk_scores(uuid) to anon, authenticated;
grant execute on function resolve_pk(uuid) to anon, authenticated;

-- ---------- LEADERBOARDS (vistas, respetan RLS del invocador) ----------
create view top_hosts
  with (security_invoker = true) as
  select h.user_id, p.display_name, p.handle, p.avatar_url,
         coalesce(sum(ge.beans), 0)::bigint as beans_total,
         count(ge.id)::bigint as gifts_received
  from hosts h
  join profiles p on p.id = h.user_id
  left join gift_events ge on ge.host_id = h.user_id
  group by h.user_id, p.display_name, p.handle, p.avatar_url;

create view top_supporters
  with (security_invoker = true) as
  select ge.sender_id, p.display_name, p.handle, p.avatar_url,
         sum(ge.coins)::bigint as coins_spent,
         count(*)::bigint as gifts_sent
  from gift_events ge
  join profiles p on p.id = ge.sender_id
  group by ge.sender_id, p.display_name, p.handle, p.avatar_url;

grant select on top_hosts, top_supporters to anon, authenticated;

-- ---------- Realtime + grants de sistema (cubre las tablas NUEVAS de esta migración) ----------
alter publication supabase_realtime add table pk_battles;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
