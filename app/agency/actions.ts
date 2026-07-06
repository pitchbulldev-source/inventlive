"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function createAgency(formData: FormData) {
  const user = await getUser();
  if (!user) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  // RLS: insert own (owner_id = auth.uid())
  await supabase.from("agencies").insert({ name, owner_id: user.id, default_split_bps: 4000 });
  revalidatePath("/agency");
}
