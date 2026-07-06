import { createClient } from "@supabase/supabase-js";
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: b } = await a.from("pk_battles").select("id,started_at,ends_at,challenger_host,opponent_host,status").limit(1).single();
console.log("battle:", JSON.stringify(b));
const g = await a.from("gift_events").select("host_id,beans");
console.log("gift_events:", JSON.stringify(g.data), "| err:", g.error?.message);
const r = await a.rpc("pk_scores", { p_battle: b.id });
console.log("pk_scores data:", JSON.stringify(r.data), "| err:", JSON.stringify(r.error));
