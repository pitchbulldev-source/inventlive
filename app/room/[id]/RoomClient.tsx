"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { n } from "@/lib/format";
import FollowButton from "@/components/FollowButton";
import PkBar from "@/components/PkBar";
import StartPk from "@/components/StartPk";

const EMOJI: Record<string, string> = { rose: "🌹", heart: "💖", crown: "👑", rocket: "🚀", castle: "🏰" };
const emojiFor = (code?: string) => (code && EMOJI[code]) || "🎁";

type Msg = { id: number | string; sender_id: string; body: string };
type Fly = { key: number; emoji: string };

export default function RoomClient({ room, gifts, initialMessages, initialGifts, userId, coinBalance, followerCount, isFollowing, battle, battleNames, otherLiveRooms }: any) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const giftById = useRef<Record<string, any>>(Object.fromEntries((gifts ?? []).map((g: any) => [g.id, g]))).current;

  const [coins, setCoins] = useState<number>(coinBalance);
  const [messages, setMessages] = useState<Msg[]>(initialMessages ?? []);
  const [names, setNames] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const x of initialMessages ?? []) if (x.profiles?.display_name) m[x.sender_id] = x.profiles.display_name;
    for (const x of initialGifts ?? []) if (x.profiles?.display_name) m[x.sender_id] = x.profiles.display_name;
    return m;
  });
  const [feed, setFeed] = useState<any[]>(initialGifts ?? []);
  const [flying, setFlying] = useState<Fly[]>([]);
  const [text, setText] = useState("");
  const [toast, setToast] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const flyId = useRef(0);

  const host = room.hosts?.profiles;
  const isHostSelf = userId && room.host_id === userId;

  const resolveName = (sid: string) => (sid === userId ? "Vos" : names[sid] ?? "…");

  async function fetchName(sid: string) {
    if (sid === userId || names[sid]) return;
    const { data } = await supabase.from("profiles").select("display_name").eq("id", sid).maybeSingle();
    if (data?.display_name) setNames((p) => ({ ...p, [sid]: data.display_name }));
  }

  function launchGift(giftId: string) {
    const g = giftById[giftId];
    const key = ++flyId.current;
    setFlying((f) => [...f, { key, emoji: emojiFor(g?.code) }]);
    setTimeout(() => setFlying((f) => f.filter((x) => x.key !== key)), 1700);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`room:${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${room.id}` },
        (payload: any) => { const msg = payload.new; setMessages((m) => [...m.slice(-80), msg]); fetchName(msg.sender_id); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_events", filter: `room_id=eq.${room.id}` },
        (payload: any) => { const ev = payload.new; setFeed((f) => [...f.slice(-12), ev]); launchGift(ev.gift_id); fetchName(ev.sender_id); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2600); }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !userId) return;
    setText("");
    const { error } = await supabase.from("room_messages").insert({ room_id: room.id, sender_id: userId, body });
    if (error) flash("No se pudo enviar el mensaje.");
  }

  async function sendGift(gift: any) {
    if (!userId) { flash("Iniciá sesión para regalar."); return; }
    if (coins < gift.coin_cost) { flash("No te alcanzan las fichas."); return; }
    const key = (globalThis.crypto?.randomUUID?.() ?? String(Math.random()));
    const { data, error } = await supabase.rpc("send_gift", { p_room_id: room.id, p_gift_id: gift.id, p_idempotency_key: key });
    if (error) {
      flash(error.message.includes("insufficient") ? "No te alcanzan las fichas." :
            error.message.includes("room_not_live") ? "La sala ya no está en vivo." :
            error.message.includes("cannot_gift_self") ? "No podés regalarte a vos mismo." : "No se pudo enviar el regalo.");
      return;
    }
    const res = data as any;
    if (res?.coin_balance != null) setCoins(res.coin_balance);
    router.refresh(); // sincroniza el saldo del TopBar
  }

  async function report() {
    if (!userId) { flash("Iniciá sesión para reportar."); return; }
    await supabase.from("reports").insert({ reporter_id: userId, room_id: room.id, target_user: room.host_id, reason: "Reporte de usuario" });
    flash("Gracias, recibimos tu reporte.");
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-4 py-6 lg:grid-cols-[1fr_340px]">
      {/* Video + gifts */}
      <section className="flex flex-col gap-3">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#2929C7] via-[#3a1f6e] to-[#FF4D7D]">
          <span className="absolute left-3 top-3 z-10 rounded-md bg-black/50 px-2 py-0.5 text-xs font-bold uppercase text-live backdrop-blur">● Live</span>
          <span className="absolute right-3 top-3 z-10 rounded-md bg-black/40 px-2 py-0.5 font-mono text-xs text-white backdrop-blur">👤 {n(room.viewers)}</span>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/15 text-3xl font-bold text-white backdrop-blur">
                {(host?.display_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <p className="mt-3 text-sm text-white/80">Stream de {host?.display_name ?? "el host"}</p>
              <p className="mt-1 text-xs text-white/50">▶︎ Acá va el player de Amazon IVS / LiveKit</p>
            </div>
          </div>
          {/* Gift animations */}
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
            {flying.map((f) => <span key={f.key} className="gift-fly absolute text-4xl">{f.emoji}</span>)}
          </div>
        </div>

        {battle ? <PkBar battle={battle} aName={battleNames?.a} bName={battleNames?.b} />
          : isHostSelf ? <StartPk otherRooms={otherLiveRooms ?? []} /> : null}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold">{room.title}</h1>
            <p className="text-sm text-muted">{host?.display_name ?? "Host"} · @{host?.handle} · <span className="text-faint">{n(followerCount ?? 0)} seguidores</span></p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isHostSelf && <FollowButton hostId={room.host_id} userId={userId} initialFollowing={!!isFollowing} />}
            <button onClick={report} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:border-danger hover:text-danger">Reportar</button>
          </div>
        </div>

        {/* Gift bar */}
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted">Enviar regalo</span>
            <Link href="/wallet" className="rounded-full border border-line px-3 py-1 font-mono text-sm text-brand hover:border-brand/60">🪙 {n(coins)}</Link>
          </div>
          {isHostSelf ? (
            <p className="py-2 text-center text-sm text-muted">Sos el host de esta sala.</p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {gifts.map((g: any) => (
                <button key={g.id} onClick={() => sendGift(g)} title={`${g.name} · ${g.coin_cost} fichas`}
                  className="flex flex-col items-center gap-1 rounded-xl border border-line bg-bg p-2 transition hover:border-live/60 active:scale-95">
                  <span className="text-2xl">{emojiFor(g.code)}</span>
                  <span className="font-mono text-[11px] text-muted">{n(g.coin_cost)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Chat */}
      <section className="flex h-[420px] flex-col rounded-2xl border border-line bg-surface lg:h-auto">
        <div className="border-b border-line px-4 py-2.5 text-sm font-semibold text-muted">Chat en vivo</div>
        <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3 text-sm">
          {feed.length > 0 && feed.slice(-3).map((ev: any, i) => (
            <div key={`g${ev.id ?? i}`} className="rounded-lg bg-live/10 px-2 py-1 text-live">
              <b>{resolveName(ev.sender_id)}</b> envió {emojiFor(giftById[ev.gift_id]?.code)} {giftById[ev.gift_id]?.name}
            </div>
          ))}
          {messages.map((m) => (
            <div key={m.id}>
              <span className={`font-semibold ${m.sender_id === userId ? "text-brand" : "text-muted"}`}>{resolveName(m.sender_id)}</span>
              <span className="text-faint">: </span><span className="text-ink">{m.body}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendMessage} className="flex gap-2 border-t border-line p-2">
          <input value={text} onChange={(e) => setText(e.target.value)} disabled={!userId}
            placeholder={userId ? "Escribí un mensaje…" : "Iniciá sesión para escribir"} maxLength={500}
            className="h-10 flex-1 rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-brand disabled:opacity-60" />
          <button disabled={!userId} className="rounded-lg bg-brand px-3 text-sm font-semibold text-brand-ink disabled:opacity-60">Enviar</button>
        </form>
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-surface-2 px-4 py-2 text-sm shadow-lg ring-1 ring-line">{toast}</div>
      )}

      <style>{`
        .gift-fly { animation: giftfly 1.6s ease-out forwards; }
        @keyframes giftfly {
          0% { transform: translateY(0) scale(.6); opacity: 0; }
          15% { opacity: 1; transform: translateY(-12px) scale(1.15); }
          100% { transform: translateY(-170px) scale(1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .gift-fly { animation-duration: .01ms; } }
      `}</style>
    </main>
  );
}
