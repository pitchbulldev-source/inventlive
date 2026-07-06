import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdmin } from "@/lib/supabase/admin";

/**
 * Webhook de Wompi (punto de integración real de pagos).
 * Verifica el checksum del evento (constant-time), y si la transacción está
 * APPROVED, acredita las fichas vía credit_purchase (idempotente).
 *
 * La `purchase` se crea cuando el usuario inicia el checkout, con
 * provider_ref = referencia enviada a Wompi. Configurar WOMPI_EVENTS_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook no configurado" }, { status: 500 });

  const raw = await req.text();
  let evt: any;
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ error: "json inválido" }, { status: 400 }); }

  // 1) Verificar firma: SHA256( valores de signature.properties + timestamp + secret )
  const props: string[] = evt?.signature?.properties ?? [];
  const concat =
    props.map((p) => p.split(".").reduce((o: any, k: string) => o?.[k], evt.data)).join("") +
    String(evt?.timestamp ?? "") + secret;
  const expected = crypto.createHash("sha256").update(concat).digest("hex").toUpperCase();
  const got = String(evt?.signature?.checksum ?? "").toUpperCase();

  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  // 2) Acreditar si la transacción fue aprobada (idempotente por provider_ref + credit_purchase)
  const tx = evt?.data?.transaction;
  if (tx?.status === "APPROVED" && tx?.reference) {
    const admin = createAdmin();
    const { data: purchase } = await admin
      .from("purchases").select("id,status").eq("provider_ref", tx.reference).maybeSingle();
    if (purchase && purchase.status !== "approved") {
      await admin.rpc("credit_purchase", { p_purchase_id: purchase.id });
    }
  }

  return NextResponse.json({ ok: true });
}
