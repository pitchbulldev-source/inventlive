"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

/**
 * Compra de fichas — versión DEV (sin pasarela real).
 * Ejercita el camino REAL del ledger: crea una purchase y la acredita vía
 * credit_purchase (idempotente). Reemplazar por el redirect + webhook de Wompi.
 */
export async function buyCoins(packageId: string): Promise<{ error?: string; coins?: number }> {
  const user = await getUser();
  if (!user) return { error: "Necesitás iniciar sesión." };

  const admin = createAdmin();
  const { data: pkg } = await admin.from("coin_packages").select("*").eq("id", packageId).single();
  if (!pkg) return { error: "Paquete no encontrado." };

  const totalCoins = pkg.coins + pkg.bonus_coins;
  const { data: purchase, error: pErr } = await admin
    .from("purchases")
    .insert({
      user_id: user.id,
      package_id: pkg.id,
      coins: totalCoins,
      price_cents_cop: pkg.price_cents_cop,
      provider: "dev",
      provider_ref: "dev_" + randomUUID(),
      status: "pending",
    })
    .select()
    .single();
  if (pErr || !purchase) return { error: pErr?.message ?? "No se pudo crear la compra." };

  const { error } = await admin.rpc("credit_purchase", { p_purchase_id: purchase.id });
  if (error) return { error: error.message };

  revalidatePath("/wallet");
  return { coins: totalCoins };
}
