import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { n } from "@/lib/format";
import { becomeHost, goLive, endLive, requestPayout } from "./actions";

export const dynamic = "force-dynamic";

export default async function HostPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: host } = await supabase.from("hosts").select("*").eq("user_id", user.id).maybeSingle();

  if (!host) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-5xl">🎥</div>
        <h1 className="mt-4 text-2xl font-extrabold">Convertite en host</h1>
        <p className="mt-2 text-muted">Transmití en vivo y recibí regalos de tu audiencia. Ganás el 40% del valor de cada regalo en beans, canjeables por dinero.</p>
        <form action={becomeHost} className="mt-6">
          <button className="h-11 w-full rounded-lg bg-live font-semibold text-white">Activar mi cuenta de host</button>
        </form>
      </main>
    );
  }

  const [{ data: room }, { data: bal }, { data: recent }] = await Promise.all([
    supabase.from("rooms").select("*").eq("host_id", user.id).maybeSingle(),
    supabase.from("balances").select("balance").eq("user_id", user.id).eq("currency", "bean").maybeSingle(),
    supabase.from("gift_events").select("id,coins,beans,created_at, profiles!gift_events_sender_id_fkey(display_name)").eq("host_id", user.id).order("id", { ascending: false }).limit(10),
  ]);

  const beans = bal?.balance ?? 0;
  const isLive = room?.status === "live";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Panel de host</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Transmisión */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted">Transmisión</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${isLive ? "bg-live/15 text-live" : "bg-surface-2 text-faint"}`}>
              {isLive ? "● En vivo" : "Offline"}
            </span>
          </div>
          {isLive ? (
            <form action={endLive} className="mt-4">
              <p className="mb-3 truncate text-sm text-muted">{room?.title}</p>
              <button className="h-10 w-full rounded-lg border border-line font-semibold hover:border-danger hover:text-danger">Terminar transmisión</button>
            </form>
          ) : (
            <form action={goLive} className="mt-4 grid gap-2">
              <input name="title" placeholder="Título del stream" defaultValue={room?.title ?? ""}
                className="h-10 rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-brand" />
              <button className="h-10 rounded-lg bg-live font-semibold text-white">🔴 Salir en vivo</button>
            </form>
          )}
        </div>

        {/* Ganancias */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <span className="text-sm font-semibold text-muted">Ganancias (beans)</span>
          <div className="mt-2 font-mono text-3xl font-bold text-live">💎 {n(beans)}</div>
          <form action={requestPayout} className="mt-4 flex gap-2">
            <input name="beans" type="number" min={1} max={beans} defaultValue={beans || 0}
              className="h-10 w-full rounded-lg border border-line bg-bg px-3 font-mono text-sm outline-none focus:border-brand" />
            <button disabled={!beans} className="shrink-0 rounded-lg bg-brand px-3 text-sm font-semibold text-brand-ink disabled:opacity-50">Retirar</button>
          </form>
          <p className="mt-2 text-xs text-faint">Tasa MVP: 1 bean = 1¢ USD.</p>
        </div>
      </div>

      {/* Regalos recibidos */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">Regalos recibidos</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-faint">
              <tr><th className="px-4 py-3">De</th><th className="px-4 py-3">Fichas</th><th className="px-4 py-3">Beans</th></tr>
            </thead>
            <tbody className="font-mono">
              {recent?.length ? recent.map((g: any) => (
                <tr key={g.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-sans">{g.profiles?.display_name ?? "Alguien"}</td>
                  <td className="px-4 py-2.5 text-muted">{n(g.coins)}</td>
                  <td className="px-4 py-2.5 text-live">+{n(g.beans)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted">Todavía no recibiste regalos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
