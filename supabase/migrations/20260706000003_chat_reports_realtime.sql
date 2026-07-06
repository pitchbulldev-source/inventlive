-- =============================================================================
-- Migración 3/3 · Chat en vivo, moderación (reports), y Realtime
-- =============================================================================

-- ---------- Chat de la sala ----------
create table room_messages (
  id         bigint generated always as identity primary key,
  room_id    uuid not null references rooms(id) on delete cascade,
  sender_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index room_messages_room_idx on room_messages (room_id, id desc);

alter table room_messages enable row level security;
create policy "messages readable"   on room_messages for select using (true);
-- Insertar solo como uno mismo Y solo en salas EN VIVO (banear/cerrar corta el chat).
create policy "messages insert own" on room_messages for insert
  with check (auth.uid() = sender_id and exists (select 1 from rooms r where r.id = room_id and r.status = 'live'));
grant select on room_messages to anon, authenticated;
grant insert on room_messages to authenticated;

-- ---------- Reportes (moderación) ----------
create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  room_id     uuid references rooms(id) on delete cascade,
  target_user uuid references profiles(id) on delete set null,
  reason      text not null,
  status      text not null default 'open',
  created_at  timestamptz not null default now()
);
alter table reports enable row level security;
create policy "reports insert own" on reports for insert with check (auth.uid() = reporter_id);
create policy "reports self read"  on reports for select using (auth.uid() = reporter_id);
grant insert, select on reports to authenticated;

-- ---------- Feed de regalos: visible para toda la sala (no solo emisor/host) ----------
drop policy if exists "gift_events participant read" on gift_events;
create policy "gift_events readable" on gift_events for select using (true);
grant select on gift_events to anon;

-- ---------- Realtime: publicar los cambios que el cliente escucha ----------
alter publication supabase_realtime add table room_messages;
alter publication supabase_realtime add table gift_events;

-- ---------- service_role: rol de sistema (webhooks, jobs, seed, admin). ----------
-- Bypassa RLS por diseño, pero igual necesita privilegio de tabla. Se otorga acá,
-- al final, para cubrir TODAS las tablas de la app (incluidas las de migración 1/2).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
