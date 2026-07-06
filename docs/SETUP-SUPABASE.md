# Setup Supabase — plataforma live streaming + gifting

Capa de datos modelada: **wallet con ledger append-only + balances lockeables**, catálogo,
salas y las funciones transaccionales (`send_gift`, `credit_purchase`, `request_payout`).

## Estructura

```
supabase/
  config.toml
  migrations/
    20260706000001_core_schema.sql     # enums, tablas, RLS, trigger de signup
    20260706000002_ledger_functions.sql# funciones SECURITY DEFINER (dinero)
  seed.sql                             # coin_packages + gifts
lib/supabase/
  browser.ts   # Client Components (anon key)
  server.ts    # RSC / Route Handlers / Server Actions (cookies async)
  admin.ts     # service_role, server-only (bypassa RLS)
lib/database.types.ts                  # placeholder → regenerar (ver abajo)
proxy.ts                               # refresco de sesión (Next 16)
```

## Opción A — Local (requiere Docker)

```bash
supabase start                 # levanta Postgres + Studio; imprime las claves
# copiá anon/service_role al .env.local si difieren de las de por defecto
supabase db reset              # aplica migraciones + seed (valida TODO el SQL)
supabase gen types typescript --local > lib/database.types.ts
npm run dev
```

## Opción B — Cloud

```bash
# 1. Creá el proyecto en supabase.com (tu cuenta)
# 2. Poné URL + claves (Project Settings → API) en .env.local
supabase link --project-ref <TU_REF>
supabase db push               # sube las migraciones
supabase gen types typescript --linked > lib/database.types.ts
npm run dev
```

## Verificación

`GET /` (home) hace un smoke test: lee `gifts` y `coin_packages` vía el cliente
server y muestra el estado de conexión + el catálogo.

## Uso de las funciones (patrón correcto)

```ts
// Server Action / Route Handler — mutación transaccional del wallet
const supabase = await createClient();
const { data, error } = await supabase.rpc('send_gift', {
  p_room_id: roomId,
  p_gift_id: giftId,
  p_idempotency_key: crypto.randomUUID(),
});

// Webhook de Wompi (server, service_role) — acreditar fichas
const admin = createAdmin();
await admin.rpc('credit_purchase', { p_purchase_id: purchaseId });
```

> Nunca escribas `balances`, `ledger_entries`, `gift_events` ni `purchases`
> directo desde el cliente: no tienen policy de INSERT a propósito. Todo pasa
> por las funciones `SECURITY DEFINER`.
