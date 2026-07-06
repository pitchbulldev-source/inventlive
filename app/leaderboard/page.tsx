import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { n } from "@/lib/format";
import { levelInfo } from "@/lib/levels";

export const dynamic = "force-dynamic";

const MEDAL = ["🥇", "🥈", "🥉"];

function Row({ i, name, handle, value, unit, xp }: any) {
  const lvl = levelInfo(xp);
  return (
    <div className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
      <span className="w-6 text-center font-mono text-sm text-faint">{MEDAL[i] ?? i + 1}</span>
      <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-sm font-bold text-brand">{(name ?? "?").charAt(0).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{name}</div>
        <div className="text-xs text-faint">Nv.{lvl.level} · {lvl.title}</div>
      </div>
      <div className="font-mono text-sm">{unit} {n(value)}</div>
    </div>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const [{ data: hosts }, { data: supporters }] = await Promise.all([
    supabase.from("top_hosts").select("*").order("beans_total", { ascending: false }).limit(15),
    supabase.from("top_supporters").select("*").order("coins_spent", { ascending: false }).limit(15),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Ranking</h1>
      <p className="mt-1 text-muted">Los que más brillan en weeto.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 font-bold">💎 Top hosts <span className="text-faint">(beans)</span></h2>
          {hosts?.length ? hosts.map((h: any, i: number) => (
            <Row key={h.user_id} i={i} name={h.display_name} handle={h.handle} value={h.beans_total} unit="💎" xp={h.beans_total} />
          )) : <p className="px-4 py-6 text-center text-muted">Sin datos aún.</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 font-bold">🪙 Top supporters <span className="text-faint">(fichas)</span></h2>
          {supporters?.length ? supporters.map((s: any, i: number) => (
            <Row key={s.sender_id} i={i} name={s.display_name} handle={s.handle} value={s.coins_spent} unit="🪙" xp={s.coins_spent} />
          )) : <p className="px-4 py-6 text-center text-muted">Sin datos aún.</p>}
        </section>
      </div>

      <p className="mt-8 text-center text-sm text-muted"><Link href="/rooms" className="font-semibold text-brand">← Volver a las salas</Link></p>
    </main>
  );
}
