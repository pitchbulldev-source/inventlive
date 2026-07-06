// Prueba de PK battles: start_pk, pk_scores en vivo, resolve_pk (ganador).
// node --env-file=.env.local scripts/test-pk.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, svc, { auth: { persistSession: false } });
const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
const host1 = list.users.find((u) => u.email === "host@invent.test");
const host2 = list.users.find((u) => u.email === "host2@invent.test");
const viewer = list.users.find((u) => u.email === "viewer@invent.test");
const room1 = (await admin.from("rooms").select("id").eq("host_id", host1.id).single()).data;
const room2 = (await admin.from("rooms").select("id").eq("host_id", host2.id).single()).data;
const gift = async (code) => (await admin.from("gifts").select("*").eq("code", code).single()).data;
const rocket = await gift("rocket"), heart = await gift("heart");

const h1 = createClient(url, anon, { auth: { persistSession: false } });
await h1.auth.signInWithPassword({ email: "host@invent.test", password: "password123" });
const start = await h1.rpc("start_pk", { p_opponent_room: room2.id, p_duration_secs: 300 });
console.log("start_pk →", start.error?.message ?? start.data);
const battleId = start.data;

const v = createClient(url, anon, { auth: { persistSession: false } });
await v.auth.signInWithPassword({ email: "viewer@invent.test", password: "password123" });
await v.rpc("send_gift", { p_room_id: room1.id, p_gift_id: rocket.id, p_idempotency_key: randomUUID() }); // host1 +400
await v.rpc("send_gift", { p_room_id: room2.id, p_gift_id: heart.id,  p_idempotency_key: randomUUID() }); // host2 +20

const { data: scores } = await admin.rpc("pk_scores", { p_battle: battleId });
console.log("pk_scores →", JSON.stringify(scores), "(host1 debe ir 400, host2 20)");

// forzar vencimiento SIN sacar los regalos de la ventana: started_at atrás, ends_at = ahora
await admin.from("pk_battles").update({ started_at: new Date(Date.now() - 3600000).toISOString(), ends_at: new Date().toISOString() }).eq("id", battleId);
await admin.rpc("resolve_pk", { p_battle: battleId });
const { data: b } = await admin.from("pk_battles").select("status,winner_host").eq("id", battleId).single();
console.log("resolve_pk →", b.status, "| ganador es host1?", b.winner_host === host1.id, "(esperado true)");

// no se puede iniciar otra batalla si el host ya está en una activa (probamos con una nueva)
const start2 = await h1.rpc("start_pk", { p_opponent_room: room2.id, p_duration_secs: 60 });
console.log("start_pk tras finalizar (debe permitir de nuevo) →", start2.error?.message ?? "ok " + start2.data);
