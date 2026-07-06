"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

/** Registrarse como host. Vía admin para fijar el split de comisión (no self-elegible). */
export async function becomeHost() {
  const user = await getUser();
  if (!user) return;
  const admin = createAdmin();
  await admin.from("hosts").upsert(
    { user_id: user.id, split_bps: 4000, kyc_status: "pending", is_active: true },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  revalidatePath("/host");
}

export async function goLive(formData: FormData) {
  const user = await getUser();
  if (!user) return;
  const title = String(formData.get("title") ?? "").trim() || "En vivo";
  const supabase = await createClient();
  const { data: existing } = await supabase.from("rooms").select("id").eq("host_id", user.id).maybeSingle();
  if (existing) {
    await supabase.from("rooms").update({ status: "live", title, started_at: new Date().toISOString(), ended_at: null }).eq("id", existing.id);
  } else {
    await supabase.from("rooms").insert({ host_id: user.id, title, status: "live", started_at: new Date().toISOString() });
  }
  revalidatePath("/host");
  revalidatePath("/rooms");
}

export async function endLive() {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("rooms").update({ status: "offline", ended_at: new Date().toISOString() }).eq("host_id", user.id);
  revalidatePath("/host");
  revalidatePath("/rooms");
}

export async function requestPayout(formData: FormData) {
  const beans = Number(formData.get("beans") ?? 0);
  if (!beans || beans <= 0) return;
  const supabase = await createClient();
  await supabase.rpc("request_payout", { p_beans: beans });
  revalidatePath("/host");
}
