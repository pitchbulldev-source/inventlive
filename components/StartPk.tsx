"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

const MSG: Record<string, string> = {
  you_are_not_live: "Primero tenés que estar en vivo.",
  opponent_not_live: "Esa sala ya no está en vivo.",
  cannot_pk_self: "No podés retarte a vos mismo.",
  battle_in_progress: "Ya hay una batalla activa.",
};

export default function StartPk({ otherRooms }: { otherRooms: { id: string; label: string }[] }) {
  const supabase = useRef(createClient()).current;
  const router = useRouter();
  const [sel, setSel] = useState(otherRooms[0]?.id ?? "");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  if (!otherRooms.length) return <p className="rounded-2xl border border-line bg-surface p-3 text-center text-xs text-faint">No hay otras salas en vivo para retar a un PK.</p>;

  function go() {
    setErr("");
    start(async () => {
      const { error } = await supabase.rpc("start_pk", { p_opponent_room: sel, p_duration_secs: 300 });
      if (error) setErr(MSG[error.message] ?? "No se pudo iniciar el PK.");
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 text-sm font-semibold text-muted">⚔️ Iniciar PK battle</div>
      <div className="flex gap-2">
        <select value={sel} onChange={(e) => setSel(e.target.value)}
          className="h-10 flex-1 rounded-lg border border-line bg-bg px-2 text-sm outline-none focus:border-live">
          {otherRooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button onClick={go} disabled={pending} className="rounded-lg bg-live px-4 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "…" : "Retar"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-danger">{err}</p>}
    </div>
  );
}
