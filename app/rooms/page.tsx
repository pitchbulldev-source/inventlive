import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { n } from "@/lib/format";

export const dynamic = "force-dynamic";

const GRADIENTS = [
  "from-[#FF3A8A] to-[#8C4AFF]", "from-[#8C4AFF] to-[#241435]",
  "from-[#FF3A8A] to-[#FFA43A]", "from-[#241435] to-[#8C4AFF]",
];

export default async function RoomsPage() {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id,title,viewers,started_at, hosts(user_id, profiles!hosts_user_id_fkey(display_name,handle,avatar_url))")
    .eq("status", "live")
    .order("started_at", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-live/12 px-3 py-1 font-mono text-xs uppercase tracking-wider text-live">
          <span className="live-dot h-2 w-2" /> En vivo
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight">Salas</h1>
      </div>

      {rooms?.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room: any, i: number) => {
            const p = room.hosts?.profiles;
            return (
              <Link key={room.id} href={`/room/${room.id}`}
                className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-brand/60">
                <div className={`relative aspect-video bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}>
                  <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-xs font-bold uppercase text-live backdrop-blur">● Live</span>
                  <span className="absolute bottom-3 right-3 rounded-md bg-black/40 px-2 py-0.5 text-xs font-mono text-white backdrop-blur">👤 {n(room.viewers)}</span>
                  <div className="absolute inset-0 grid place-items-center text-5xl opacity-30 transition group-hover:scale-110">🎥</div>
                </div>
                <div className="flex items-center gap-3 p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-sm font-bold text-brand">
                    {(p?.display_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{room.title}</div>
                    <div className="truncate text-sm text-muted">{p?.display_name ?? "Host"}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-line p-12 text-center text-muted">
          No hay salas en vivo ahora. <Link href="/host" className="font-semibold text-brand">Transmití vos →</Link>
        </div>
      )}
    </main>
  );
}
