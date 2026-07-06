import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { n } from "@/lib/format";
import { createAgency } from "./actions";

export const dynamic = "force-dynamic";

export default async function AgencyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: agency } = await supabase.from("agencies").select("*").eq("owner_id", user.id).maybeSingle();

  if (!agency) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-5xl">🏢</div>
        <h1 className="mt-4 text-2xl font-extrabold">Creá tu agencia</h1>
        <p className="mt-2 text-muted">Gestioná hosts y cobrá una comisión sobre lo que generan.</p>
        <form action={createAgency} className="mt-6 grid gap-2">
          <input name="name" placeholder="Nombre de la agencia" required
            className="h-11 rounded-lg border border-line bg-bg px-3 outline-none focus:border-brand" />
          <button className="h-11 rounded-lg bg-brand font-semibold text-brand-ink">Crear agencia</button>
        </form>
      </main>
    );
  }

  const { data: hosts } = await supabase.from("hosts").select("user_id, profiles!hosts_user_id_fkey(display_name,handle)").eq("agency_id", agency.id);
  const ids = (hosts ?? []).map((h: any) => h.user_id);
  const { data: earnings } = ids.length
    ? await supabase.from("top_hosts").select("user_id,beans_total,gifts_received").in("user_id", ids)
    : { data: [] as any[] };
  const earnMap = Object.fromEntries((earnings ?? []).map((e: any) => [e.user_id, e]));
  const totalBeans = (earnings ?? []).reduce((s: number, e: any) => s + Number(e.beans_total), 0);
  const commission = Math.round((totalBeans * agency.default_split_bps) / 10000);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{agency.name}</h1>
      <p className="mt-1 text-muted">Panel de agencia</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4"><div className="text-xs uppercase text-faint">Hosts</div><div className="mt-1 font-mono text-2xl font-bold">{n(ids.length)}</div></div>
        <div className="rounded-2xl border border-line bg-surface p-4"><div className="text-xs uppercase text-faint">Beans generados</div><div className="mt-1 font-mono text-2xl font-bold text-live">💎 {n(totalBeans)}</div></div>
        <div className="rounded-2xl border border-line bg-surface p-4"><div className="text-xs uppercase text-faint">Comisión de agencia ({agency.default_split_bps / 100}%)</div><div className="mt-1 font-mono text-2xl font-bold text-brand">💎 {n(commission)}</div></div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Mis hosts</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-faint">
              <tr><th className="px-4 py-3">Host</th><th className="px-4 py-3">Beans</th><th className="px-4 py-3">Regalos</th></tr>
            </thead>
            <tbody className="font-mono">
              {hosts?.length ? hosts.map((h: any) => (
                <tr key={h.user_id} className="border-t border-line">
                  <td className="px-4 py-3 font-sans">{h.profiles?.display_name ?? "—"}</td>
                  <td className="px-4 py-3 text-live">💎 {n(earnMap[h.user_id]?.beans_total ?? 0)}</td>
                  <td className="px-4 py-3 text-muted">{n(earnMap[h.user_id]?.gifts_received ?? 0)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted">Todavía no tenés hosts asignados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
