# InventLive — live streaming + gifting (MVP)

Plataforma de streaming social monetizada con **regalos virtuales**, estilo Bigo/TikTok Live.
La tesis: *no es una app de video, es una economía de fichas con video en vivo encima.*

Construido por **Invent Agency** · Next.js 16 · Supabase · Tailwind v4.

## El loop económico (funcionando)

```
comprar fichas (coins) → enviar regalo en un stream → ledger debita al viewer y
acredita beans al host (atómico) → host retira beans (payout)
```

- **Ledger append-only + balances lockeables** (`SELECT … FOR UPDATE`) → sin doble gasto.
- **Idempotencia** en regalos y compras → los reintentos no duplican.
- Toda mutación de dinero pasa por funciones **`SECURITY DEFINER`**; el cliente nunca escribe saldos.
- **RLS** como frontera; `role` no es auto-editable (grant a nivel de columna).

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router, RSC, Server Actions), React 19, Tailwind v4 |
| Datos/Auth/Realtime | Supabase (Postgres + RLS + Auth + Realtime) |
| Pagos | Wompi (webhook en `app/api/webhooks/wompi`) — *scaffold* |
| Video en vivo | placeholder → Amazon IVS / LiveKit (ver `docs/bigo-mvp-arquitectura.html`) |

## Correr en local

Requiere **Docker** (para Supabase) y Node ≥ 22.

```bash
supabase start                 # levanta Postgres + Auth + Realtime + Studio
supabase db reset              # aplica migraciones + seed de catálogo
node --env-file=.env.local scripts/seed-dev.mjs   # usuarios + salas de prueba
npm install
npm run dev                    # http://localhost:3000
```

### Usuarios de prueba

| Email | Password | Rol |
|-------|----------|-----|
| `viewer@invent.test` | `password123` | viewer (5.000 fichas) |
| `host@invent.test` | `password123` | host con sala en vivo |
| `host2@invent.test` | `password123` | host con sala en vivo |
| `admin@invent.test` | `password123` | moderación en `/admin` |
| `agency@invent.test` | `password123` | panel de agencia en `/agency` |

### Probar el corazón transaccional

```bash
node --env-file=.env.local scripts/test-gift.mjs
```
Verifica débito/crédito, idempotencia, saldo insuficiente y auto-regalo.

## Estructura

```
app/
  login, signup           # auth (server actions)
  rooms                   # salas en vivo
  room/[id]               # sala: video + chat realtime + gifting animado
  wallet                  # saldo, comprar fichas, movimientos
  host                    # panel host: salir en vivo, beans, payout
  admin                   # moderación (reportes) — solo rol admin
  leaderboard             # ranking: top hosts (beans) + top supporters (fichas)
  agency                  # panel de agencia: hosts + comisión
  api/webhooks/wompi      # acreditación de compras (idempotente)
lib/supabase/             # clientes browser / server / admin
proxy.ts                  # refresco de sesión (Next 16)
supabase/migrations/      # schema + ledger + funciones + RLS + realtime
docs/                     # plan de arquitectura + réplica de referencia
```

## Documentación

- **Plan de arquitectura del MVP** (decisiones, costos de streaming, roadmap): `docs/bigo-mvp-arquitectura.html`
- **Setup de Supabase**: `docs/SETUP-SUPABASE.md`

## Fase 2 (hecha)

**PK battles** (batallas en vivo con puntaje por sala + countdown), **ranking** (top hosts/supporters),
**niveles** (XP por actividad), **follows**, y **agencias** (comisión sobre beans de sus hosts).
Todo con RLS y funciones transaccionales, auditado por revisión adversarial.

## Próximos pasos

Conectar los servicios de terceros (ver `docs/CUENTAS-TERCEROS.md`): streaming real
(LiveKit/IVS), Wompi productivo (checkout + firma), Stripe Connect (payout), KYC/AML
(Truora, SARLAFT), moderación con IA (Hive), y apps móviles.
