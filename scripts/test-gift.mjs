// Prueba end-to-end del corazón transaccional (send_gift) autenticado como viewer.
// node --env-file=.env.local scripts/test-gift.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, svc, { auth: { persistSession: false } });

const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
const host = list.users.find((u) => u.email === "host@invent.test");
const viewer = list.users.find((u) => u.email === "viewer@invent.test");
const { data: room } = await admin.from("rooms").select("id").eq("host_id", host.id).single();
const bal = async (uid, cur) =>
  (await admin.from("balances").select("balance").eq("user_id", uid).eq("currency", cur).single()).data?.balance ?? 0;

const g = {};
for (const code of ["rocket", "castle"]) g[code] = (await admin.from("gifts").select("*").eq("code", code).single()).data;

console.log("ROOM", room.id);
console.log("ANTES        → viewer coin:", await bal(viewer.id, "coin"), "| host bean:", await bal(host.id, "bean"));

const v = createClient(url, anon, { auth: { persistSession: false } });
await v.auth.signInWithPassword({ email: "viewer@invent.test", password: "password123" });

const key = randomUUID();
const r1 = await v.rpc("send_gift", { p_room_id: room.id, p_gift_id: g.rocket.id, p_idempotency_key: key });
console.log("send_gift 🚀  →", r1.error?.message ?? JSON.stringify(r1.data));
console.log("DESPUÉS #1   → viewer coin:", await bal(viewer.id, "coin"), "| host bean:", await bal(host.id, "bean"), "(esperado 4000 / 400)");

const r2 = await v.rpc("send_gift", { p_room_id: room.id, p_gift_id: g.rocket.id, p_idempotency_key: key });
console.log("send_gift 🚀 (misma key) →", JSON.stringify(r2.data), "idempotent?");
console.log("DESPUÉS #2   → viewer coin:", await bal(viewer.id, "coin"), "| host bean:", await bal(host.id, "bean"), "(DEBE seguir 4000 / 400)");

const r3 = await v.rpc("send_gift", { p_room_id: room.id, p_gift_id: g.castle.id, p_idempotency_key: randomUUID() });
console.log("send_gift 🏰 (5000 > 4000) →", r3.error?.message ?? "❌ NO FALLÓ (bug!)");

const h = createClient(url, anon, { auth: { persistSession: false } });
await h.auth.signInWithPassword({ email: "host@invent.test", password: "password123" });
const r4 = await h.rpc("send_gift", { p_room_id: room.id, p_gift_id: g.rocket.id, p_idempotency_key: randomUUID() });
console.log("send_gift auto-regalo →", r4.error?.message ?? "❌ NO FALLÓ (bug!)");
