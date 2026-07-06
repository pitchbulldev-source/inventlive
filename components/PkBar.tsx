"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { n } from "@/lib/format";

export default function PkBar({ battle, aName, bName }: { battle: any; aName: string; bName: string }) {
  const supabase = useRef(createClient()).current;
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(battle.status === "finished");
  const [winner, setWinner] = useState<string | null>(battle.winner_host ?? null);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.round((new Date(battle.ends_at).getTime() - Date.now()) / 1000)));

  async function refreshScores() {
    const { data } = await supabase.rpc("pk_scores", { p_battle: battle.id });
    if (data) { const m: Record<string, number> = {}; for (const r of data as any[]) m[r.host_id] = Number(r.score); setScores(m); }
  }
  async function resolve() {
    await supabase.rpc("resolve_pk", { p_battle: battle.id });
    const { data } = await supabase.from("pk_battles").select("status,winner_host").eq("id", battle.id).maybeSingle();
    if (data?.status === "finished") { setFinished(true); setWinner(data.winner_host); router.refresh(); }
  }

  useEffect(() => {
    refreshScores();
    if (finished) return;
    const s = setInterval(refreshScores, 2500);
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((new Date(battle.ends_at).getTime() - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) { clearInterval(t); clearInterval(s); resolve(); }
    }, 1000);
    return () => { clearInterval(s); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.id, finished]);

  const a = scores[battle.challenger_host] ?? 0;
  const b = scores[battle.opponent_host] ?? 0;
  const total = a + b;
  const aPct = total ? Math.round((a / total) * 100) : 50;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const winnerName = winner ? (winner === battle.challenger_host ? aName : bName) : null;

  return (
    <div className="rounded-2xl border border-brand/40 bg-brand/5 p-3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-bold text-brand">{aName}</span>
        <span className="font-mono font-bold text-amber">
          {finished ? (winnerName ? `🏆 ${winnerName}` : "Empate") : `⚔️ PK ${mm}:${ss}`}
        </span>
        <span className="font-bold text-uv">{bName}</span>
      </div>
      <div className="flex h-4 overflow-hidden rounded-full bg-surface-2">
        <div className="flex items-center justify-start bg-gradient-to-r from-brand to-brand/70 pl-2 text-[10px] font-bold text-brand-ink transition-all" style={{ width: `${aPct}%` }}>{n(a)}</div>
        <div className="flex flex-1 items-center justify-end bg-gradient-to-r from-uv/70 to-uv pr-2 text-[10px] font-bold text-white">{n(b)}</div>
      </div>
    </div>
  );
}
