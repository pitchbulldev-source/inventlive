-- =============================================================================
-- Plataforma live streaming + gifting (tipo Bigo) — MVP
-- Migración 1/2 · Schema core: identidades, catálogo, salas, wallet y ledger
-- Convenciones Invent: RLS como frontera real, dinero/fichas en ENTEROS,
-- ledger append-only + balances lockeables. Mutations de dinero SOLO por
-- funciones SECURITY DEFINER (ver migración 2), nunca desde el cliente.
-- =============================================================================

-- ---------- Extensiones ----------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ---------- Enums ----------
create type user_role       as enum ('viewer','host','agency','admin');
create type kyc_status       as enum ('none','pending','approved','rejected');
create type room_status      as enum ('offline','live','banned');
create type currency_kind    as enum ('coin','bean');          -- coin: compra el viewer · bean: gana el host
create type ledger_kind      as enum ('purchase','signup_bonus','gift_sent','gift_recv','payout_hold','payout_paid','refund','adjust');
create type purchase_status  as enum ('pending','approved','declined','error','refunded');
create type payout_status    as enum ('requested','processing','paid','rejected');

-- =============================================================================
-- IDENTIDAD
-- =============================================================================

-- profiles: 1–1 con auth.users (Supabase Auth es la fuente de identidad)
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique not null,
  display_name  text not null default '',
  avatar_url    text,
  role          user_role not null default 'viewer',
  created_at    timestamptz not null default now()
);
comment on table profiles is 'Perfil público 1-1 con auth.users';

create table agencies (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  owner_id           uuid not null references profiles(id) on delete restrict,
  default_split_bps  int  not null default 1000,   -- comisión de la AGENCIA sobre los beans del host (bps): 10.00%
  created_at         timestamptz not null default now()
);

-- hosts: subconjunto de profiles que transmiten y cobran
create table hosts (
  user_id      uuid primary key references profiles(id) on delete cascade,
  agency_id    uuid references agencies(id) on delete set null,
  kyc_status   kyc_status not null default 'none',
  split_bps    int not null default 4000,           -- % del valor del gift que gana el host (beans)
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint split_bps_range check (split_bps between 0 and 10000)
);

-- =============================================================================
-- CATÁLOGO (compra de fichas + regalos)
-- =============================================================================

create table coin_packages (
  id               uuid primary key default gen_random_uuid(),
  coins            bigint not null check (coins > 0),
  bonus_coins      bigint not null default 0 check (bonus_coins >= 0),
  price_cents_cop  bigint not null check (price_cents_cop > 0),   -- COP en centavos, entero
  is_active        boolean not null default true,
  sort             int not null default 0
);

create table gifts (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  coin_cost   bigint not null check (coin_cost > 0),    -- lo que gasta el viewer
  bean_value  bigint not null check (bean_value >= 0),  -- lo que gana el host (ya con comisión aplicada)
  svga_url    text,                                     -- animación (SVGA/Lottie)
  tier        int not null default 1,
  is_active   boolean not null default true,
  sort        int not null default 0
);
comment on column gifts.bean_value is 'Beans que recibe el host; la comisión de plataforma = coin_cost - bean_value';

-- =============================================================================
-- SALAS / STREAMS
-- =============================================================================

create table rooms (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references hosts(user_id) on delete cascade,
  title       text not null default '',
  status      room_status not null default 'offline',
  viewers     int not null default 0,
  started_at  timestamptz,
  ended_at    timestamptz,
  created_at  timestamptz not null default now()
);
create index rooms_live_idx on rooms (status) where status = 'live';
create index rooms_host_idx on rooms (host_id);

-- =============================================================================
-- WALLET: ledger (auditoría) + balances (saldo vivo lockeable)
-- =============================================================================

-- Saldo vivo: se lockea con FOR UPDATE en las funciones para evitar doble gasto.
create table balances (
  user_id   uuid not null references profiles(id) on delete cascade,
  currency  currency_kind not null,
  balance   bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, currency)
);

-- Ledger append-only: fuente de verdad auditable. Nunca se UPDATE/DELETE.
create table ledger_entries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  currency    currency_kind not null,
  delta       bigint not null,                 -- + entra, - sale
  kind        ledger_kind not null,
  ref_type    text,                            -- 'purchase' | 'gift_event' | 'payout' ...
  ref_id      text,                            -- id de la entidad que originó el movimiento
  balance_after bigint not null,
  created_at  timestamptz not null default now()
);
create index ledger_user_cur_idx on ledger_entries (user_id, currency, id desc);
-- Idempotencia dura: un mismo origen no puede generar dos veces el mismo tipo de movimiento
create unique index ledger_idem_idx on ledger_entries (kind, ref_type, ref_id)
  where ref_type is not null and ref_id is not null;

-- =============================================================================
-- COMPRAS (fichas) y REGALOS (eventos) y PAYOUTS
-- =============================================================================

create table purchases (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete restrict,
  package_id       uuid references coin_packages(id) on delete set null,
  coins            bigint not null,
  price_cents_cop  bigint not null,
  provider         text not null default 'wompi',
  provider_ref     text unique,                 -- idempotencia del webhook (una ref = una compra)
  status           purchase_status not null default 'pending',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index purchases_user_idx on purchases (user_id, created_at desc);

create table gift_events (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references rooms(id) on delete cascade,
  sender_id      uuid not null references profiles(id) on delete restrict,
  host_id        uuid not null references hosts(user_id) on delete restrict,
  gift_id        uuid not null references gifts(id) on delete restrict,
  coins          bigint not null,               -- coins gastados (snapshot)
  beans          bigint not null,               -- beans otorgados (snapshot)
  idempotency_key text unique,                  -- evita doble envío por reintento de red
  created_at     timestamptz not null default now()
);
create index gift_events_room_idx on gift_events (room_id, created_at desc);
create index gift_events_host_idx on gift_events (host_id, created_at desc);

create table payouts (
  id           uuid primary key default gen_random_uuid(),
  host_id      uuid not null references hosts(user_id) on delete restrict,
  beans        bigint not null check (beans > 0),
  cents_usd    bigint not null,
  provider     text not null default 'stripe',
  provider_ref text,
  status       payout_status not null default 'requested',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index payouts_host_idx on payouts (host_id, created_at desc);

-- =============================================================================
-- TRIGGER: crear profile + balances al registrarse (auth.users -> profiles)
-- =============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'user') || '_' || substr(new.id::text, 1, 6),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.balances (user_id, currency, balance) values (new.id, 'coin', 0), (new.id, 'bean', 0);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- RLS — la frontera real (todo cerrado por defecto; funciones DEFINER escriben)
-- =============================================================================

alter table profiles       enable row level security;
alter table agencies       enable row level security;
alter table hosts          enable row level security;
alter table coin_packages  enable row level security;
alter table gifts          enable row level security;
alter table rooms          enable row level security;
alter table balances       enable row level security;
alter table ledger_entries enable row level security;
alter table purchases      enable row level security;
alter table gift_events    enable row level security;
alter table payouts        enable row level security;

-- Perfiles: lectura pública (campos de vitrina), escritura solo del dueño
create policy "profiles readable" on profiles for select using (true);
create policy "profiles self update" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Hosts + salas: vitrina pública; el host gestiona sus salas
create policy "hosts readable" on hosts for select using (true);
create policy "rooms readable" on rooms for select using (true);
create policy "rooms host insert" on rooms for insert with check (auth.uid() = host_id);
create policy "rooms host update" on rooms for update using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- Catálogo: lectura pública de lo activo (mutación solo admin/service_role)
create policy "packages readable" on coin_packages for select using (is_active);
create policy "gifts readable"    on gifts        for select using (is_active);

-- Dinero: el usuario ve LO SUYO; nadie escribe directo (solo funciones DEFINER)
create policy "balances self read" on balances       for select using (auth.uid() = user_id);
create policy "ledger self read"   on ledger_entries for select using (auth.uid() = user_id);
create policy "purchases self read" on purchases     for select using (auth.uid() = user_id);
create policy "payouts self read"  on payouts        for select using (auth.uid() = host_id);

-- Regalos: visibles para el emisor y el host receptor (el feed en vivo se sirve por Realtime/RPC)
create policy "gift_events participant read" on gift_events
  for select using (auth.uid() = sender_id or auth.uid() = host_id);

-- Nota: NO hay policies de INSERT/UPDATE en balances, ledger_entries, purchases,
-- gift_events ni payouts a propósito. Esos movimientos entran solo por las
-- funciones SECURITY DEFINER de la migración 2 (o service_role en el server).

-- =============================================================================
-- GRANTs base — RLS filtra FILAS, pero Postgres exige primero el privilegio de
-- TABLA para el rol. Sin esto: "permission denied for table ...".
-- =============================================================================
grant usage on schema public to anon, authenticated;

-- Vitrina pública (catálogo + perfiles + salas): lectura para todos
grant select on coin_packages, gifts, profiles, hosts, rooms to anon, authenticated;

-- Escrituras permitidas por RLS (dueño): perfil propio y salas del host.
-- OJO: grant a nivel de COLUMNA en profiles — el usuario NO puede tocar `role`
-- (si no, con la policy self-update se auto-asignaría 'admin'). role solo por service_role.
grant update (handle, display_name, avatar_url) on profiles to authenticated;
grant insert, update on rooms to authenticated;

-- Dinero: el usuario autenticado LEE lo suyo (RLS lo acota). Nadie inserta directo;
-- los movimientos entran por las funciones SECURITY DEFINER.
grant select on balances, ledger_entries, purchases, gift_events, payouts to authenticated;
