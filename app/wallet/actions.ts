"use server";

import { randomUUID, createHash } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

/**
 * Compra de fichas.
 * - PROD (llaves Wompi cargadas): crea la purchase pendiente, firma la integridad
 *   y devuelve la URL del Web Checkout de Wompi. El webhook acredita al APPROVED.
 * - DEV (sin llaves): acredita directo vía credit_purchase (para probar el loop).
 */
export async function buyCoins(packageId: string): Promise<{ error?: string; coins?: number; url?: string }> {
  const user = await getUser();
  if (!user) return { error: "Necesitás iniciar sesión." };

  const admin = createAdmin();
  const { data: pkg } = await admin.from("coin_packages").select("*").eq("id", packageId).single();
  if (!pkg) return { error: "Paquete no encontrado." };

  const totalCoins = pkg.coins + pkg.bonus_coins;
  const amount = pkg.price_cents_cop; // COP en centavos (entero)
  const ref = "wt_" + randomUUID().replace(/-/g, "");

  const pub = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  const integrity = process.env.WOMPI_INTEGRITY_SECRET;
  const provider = pub && integrity ? "wompi" : "dev";

  const { data: purchase, error: pErr } = await admin
    .from("purchases")
    .insert({
      user_id: user.id, package_id: pkg.id, coins: totalCoins,
      price_cents_cop: amount, provider, provider_ref: ref, status: "pending",
    })
    .select("id")
    .single();
  if (pErr || !purchase) return { error: pErr?.message ?? "No se pudo crear la compra." };

  if (provider === "wompi") {
    // Firma de integridad = SHA256(reference + amount + currency + integrity_secret)
    const currency = "COP";
    const signature = createHash("sha256").update(`${ref}${amount}${currency}${integrity}`).digest("hex");
    const h = await headers();
    const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    const q = [
      `public-key=${encodeURIComponent(pub!)}`,
      `currency=${currency}`,
      `amount-in-cents=${amount}`,
      `reference=${encodeURIComponent(ref)}`,
      `signature:integrity=${signature}`,
      `redirect-url=${encodeURIComponent(`${base}/wallet?ref=${ref}`)}`,
    ].join("&");
    return { url: `https://checkout.wompi.co/p/?${q}` };
  }

  // DEV: acreditar directo
  const { error } = await admin.rpc("credit_purchase", { p_purchase_id: purchase.id });
  if (error) return { error: error.message };
  revalidatePath("/wallet");
  return { coins: totalCoins };
}
