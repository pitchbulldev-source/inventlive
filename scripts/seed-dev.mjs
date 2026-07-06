// Seed de escenario de desarrollo: crea usuarios reales (Auth), un par de hosts
// con salas EN VIVO, y le da fichas a un viewer — para poder probar el loop.
// Correr:  node --env-file=.env.local scripts/seed-dev.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Faltan envs NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function ensureUser(email, password, meta) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (!error) return data.user;
  // ya existe → buscarlo
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const found = list.users.find((u) => u.email === email);
  if (found) return found;
  throw error;
}

async function makeHost(userId, title) {
  const { error: hErr } = await admin.from("hosts").upsert({ user_id: userId, kyc_status: "approved", split_bps: 4000, is_active: true });
  if (hErr) throw new Error("hosts upsert: " + hErr.message);
  // una sala en vivo (idempotente por host)
  const { data: existing } = await admin.from("rooms").select("id").eq("host_id", userId).maybeSingle();
  if (existing) { await admin.from("rooms").update({ status: "live", title, started_at: new Date().toISOString() }).eq("id", existing.id); return existing.id; }
  const { data: room, error: rErr } = await admin.from("rooms").insert({ host_id: userId, title, status: "live", started_at: new Date().toISOString() }).select("id").single();
  if (rErr) throw new Error("rooms insert: " + rErr.message);
  return room.id;
}

async function creditCoins(userId, coins) {
  const { data: p } = await admin.from("purchases").insert({
    user_id: userId, coins, price_cents_cop: 0, provider: "seed", provider_ref: "seed_" + randomUUID(), status: "pending",
  }).select().single();
  await admin.rpc("credit_purchase", { p_purchase_id: p.id });
}

const viewer = await ensureUser("viewer@invent.test", "password123", { display_name: "Vale Viewer" });
const host1  = await ensureUser("host@invent.test",   "password123", { display_name: "Dahiana Host" });
const host2  = await ensureUser("host2@invent.test",  "password123", { display_name: "Kevin Host" });
const admin1 = await ensureUser("admin@invent.test",  "password123", { display_name: "Admin" });

const room1 = await makeHost(host1.id, "🎵 Noche de música en vivo");
const room2 = await makeHost(host2.id, "🎮 Gaming & charla");
await creditCoins(viewer.id, 5000);
await admin.from("profiles").update({ role: "admin" }).eq("id", admin1.id);

// --- Fase 2: agencia + follows ---
const agencyOwner = await ensureUser("agency@invent.test", "password123", { display_name: "Agencia Invent" });
let { data: agency } = await admin.from("agencies").select("id").eq("owner_id", agencyOwner.id).maybeSingle();
if (!agency) {
  ({ data: agency } = await admin.from("agencies").insert({ name: "Agencia Invent", owner_id: agencyOwner.id, default_split_bps: 1000 }).select("id").single());
}
await admin.from("hosts").update({ agency_id: agency.id }).in("user_id", [host1.id, host2.id]);
await admin.from("follows").upsert({ follower_id: viewer.id, host_id: host1.id });

// --- demo: batalla PK activa + regalos reales (para ver la UI) ---
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const rocketId = (await admin.from("gifts").select("id").eq("code", "rocket").single()).data.id;
const heartId = (await admin.from("gifts").select("id").eq("code", "heart").single()).data.id;
const hc = createClient(url, anonKey, { auth: { persistSession: false } });
await hc.auth.signInWithPassword({ email: "host@invent.test", password: "password123" });
await hc.rpc("start_pk", { p_opponent_room: room2, p_duration_secs: 600 });
const vc = createClient(url, anonKey, { auth: { persistSession: false } });
await vc.auth.signInWithPassword({ email: "viewer@invent.test", password: "password123" });
await vc.rpc("send_gift", { p_room_id: room1, p_gift_id: rocketId, p_idempotency_key: randomUUID() });
await vc.rpc("send_gift", { p_room_id: room2, p_gift_id: heartId, p_idempotency_key: randomUUID() });

console.log("OK seed:");
console.log("  viewer@invent.test / password123  (5.000 fichas)");
console.log("  host@invent.test   / password123  -> room", room1);
console.log("  host2@invent.test  / password123  -> room", room2);
console.log("  admin@invent.test  / password123  (moderación en /admin)");
