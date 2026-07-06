"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

/** Verifica que el usuario actual sea admin (rol en profiles). Devuelve el admin client o null. */
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return null;
  return createAdmin();
}

export async function resolveReport(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const id = String(formData.get("id") ?? "");
  await admin.from("reports").update({ status: "resolved" }).eq("id", id);
  revalidatePath("/admin");
}

export async function banRoom(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const roomId = String(formData.get("room_id") ?? "");
  if (!roomId) return;
  await admin.from("rooms").update({ status: "banned", ended_at: new Date().toISOString() }).eq("id", roomId);
  revalidatePath("/admin");
  revalidatePath("/rooms");
}
