// Verifica los 3 fixes de la revisión adversarial.
// node --env-file=.env.local scripts/test-fixes.mjs
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, svc, { auth: { persistSession: false } });
const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
const host = list.users.find((u) => u.email === "host@invent.test");
const viewer = list.users.find((u) => u.email === "viewer@invent.test");
const { data: room } = await admin.from("rooms").select("id,status").eq("host_id", host.id).single();
const bal = async (uid, cur) => (await admin.from("balances").select("balance").eq("user_id", uid).eq("currency", cur).single()).data?.balance ?? 0;
const rocket = (await admin.from("gifts").select("*").eq("code", "rocket").single()).data;

const v = createClient(url, anon, { auth: { persistSession: false } });
await v.auth.signInWithPassword({ email: "viewer@invent.test", password: "password123" });

console.log("== FIX #2: send_gift concurrente con la MISMA idempotency_key ==");
console.log("antes  : viewer coin", await bal(viewer.id, "coin"), "| host bean", await bal(host.id, "bean"));
const key = randomUUID();
const [a, b] = await Promise.all([
  v.rpc("send_gift", { p_room_id: room.id, p_gift_id: rocket.id, p_idempotency_key: key }),
  v.rpc("send_gift", { p_room_id: room.id, p_gift_id: rocket.id, p_idempotency_key: key }),
]);
console.log("call A :", a.error?.message ?? JSON.stringify(a.data));
console.log("call B :", b.error?.message ?? JSON.stringify(b.data));
console.log("después: viewer coin", await bal(viewer.id, "coin"), "| host bean", await bal(host.id, "bean"), "→ esperado 4000 / 400 (UN solo débito, sin error)");

console.log("\n== FIX #1: request_payout duplicado (doble-click) ==");
const h = createClient(url, anon, { auth: { persistSession: false } });
await h.auth.signInWithPassword({ email: "host@invent.test", password: "password123" });
const p1 = await h.rpc("request_payout", { p_beans: 200 });
console.log("payout #1:", p1.error?.message ?? "ok " + p1.data);
const p2 = await h.rpc("request_payout", { p_beans: 200 });
console.log("payout #2:", p2.error?.message ?? "❌ ok " + p2.data, "→ esperado payout_already_pending");
const { count } = await admin.from("payouts").select("*", { count: "exact", head: true }).eq("host_id", host.id);
console.log("filas payouts del host:", count, "→ esperado 1 | host bean:", await bal(host.id, "bean"), "→ esperado 200");

console.log("\n== FIX #3: chat en sala offline ==");
await admin.from("rooms").update({ status: "offline" }).eq("id", room.id);
const { error: chatErr } = await v.from("room_messages").insert({ room_id: room.id, sender_id: viewer.id, body: "no debería entrar" });
console.log("insert en sala offline:", chatErr?.message ?? "❌ SE INSERTÓ (bug)", "→ esperado rechazo por RLS");
await admin.from("rooms").update({ status: "live" }).eq("id", room.id);
