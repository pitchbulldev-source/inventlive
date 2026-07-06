import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cop, n } from "@/lib/format";
import BuyButton from "./BuyButton";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: bals }, { data: packages }, { data: entries }] = await Promise.all([
    supabase.from("balances").select("currency,balance").eq("user_id", user.id),
    supabase.from("coin_packages").select("*").eq("is_active", true).order("sort"),
    supabase.from("ledger_entries").select("*").eq("user_id", user.id).order("id", { ascending: false }).limit(12),
  ]);

  const coins = bals?.find((b) => b.currency === "coin")?.balance ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Tu billetera</h1>
          <p className="mt-1 text-muted">Comprá fichas para enviar regalos en los streams.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-5 py-3">
          <div className="text-xs uppercase tracking-wide text-faint">Saldo</div>
          <div className="font-mono text-2xl font-bold text-brand">🪙 {n(coins)}</div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Paquetes</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {packages?.map((pkg) => (
            <div key={pkg.id} className="flex flex-col rounded-2xl border border-line bg-surface p-4">
              <div className="font-mono text-2xl font-bold text-brand">🪙 {n(pkg.coins)}</div>
              {pkg.bonus_coins > 0 && <div className="text-xs text-live">+{n(pkg.bonus_coins)} bonus</div>}
              <div className="mt-2 text-muted">{cop(pkg.price_cents_cop)}</div>
              <div className="mt-4"><BuyButton packageId={pkg.id} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Movimientos recientes</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-faint">
              <tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Moneda</th><th className="px-4 py-3">Δ</th><th className="px-4 py-3">Saldo</th></tr>
            </thead>
            <tbody className="font-mono">
              {entries?.length ? entries.map((e) => (
                <tr key={e.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-sans text-muted">{e.kind}</td>
                  <td className="px-4 py-2.5">{e.currency}</td>
                  <td className={`px-4 py-2.5 ${e.delta < 0 ? "text-danger" : "text-ok"}`}>{e.delta > 0 ? "+" : ""}{n(e.delta)}</td>
                  <td className="px-4 py-2.5">{n(e.balance_after)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Todavía no hay movimientos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
