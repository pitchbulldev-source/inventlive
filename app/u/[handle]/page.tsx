import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { n } from "@/lib/format";
import { levelInfo } from "@/lib/levels";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles").select("id,handle,display_name,avatar_url,role").eq("handle", handle).maybeSingle();
  if (!profile) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: host }, followRes, { data: hostStats }, { data: suppStats }, { data: room }] = await Promise.all([
    supabase.from("hosts").select("user_id").eq("user_id", profile.id).maybeSingle(),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("host_id", profile.id),
    supabase.from("top_hosts").select("beans_total,gifts_received").eq("user_id", profile.id).maybeSingle(),
    supabase.from("top_supporters").select("coins_spent,gifts_sent").eq("sender_id", profile.id).maybeSingle(),
    supabase.from("rooms").select("id,title,status").eq("host_id", profile.id).eq("status", "live").maybeSingle(),
  ]);

  const isHost = !!host;
  const followers = (followRes as any)?.count ?? 0;
  const beans = hostStats?.beans_total ?? 0;
  const coinsSpent = suppStats?.coins_spent ?? 0;
  const lvl = levelInfo(isHost ? beans : coinsSpent);

  let isFollowing = false;
  if (user && isHost && user.id !== profile.id) {
    const { data: f } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("host_id", profile.id).maybeSingle();
    isFollowing = !!f;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-uv/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-3xl font-extrabold text-brand ring-1 ring-line">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (profile.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-extrabold tracking-tight">{profile.display_name || handle}</h1>
            <p className="text-sm text-muted">@{profile.handle}</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-0.5 font-mono text-xs text-amber">
              Nv.{lvl.level} · {lvl.title}
            </div>
          </div>
          {isHost && user?.id !== profile.id && (
            <FollowButton hostId={profile.id} userId={user?.id ?? null} initialFollowing={isFollowing} />
          )}
        </div>
      </div>

      {/* Sala en vivo */}
      {room && (
        <Link href={`/room/${room.id}`} className="mt-4 flex items-center gap-3 rounded-2xl border border-live/40 bg-live/5 p-4 transition hover:border-live">
          <span className="live-dot h-2.5 w-2.5" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] uppercase tracking-wider text-live">EN VIVO ahora</div>
            <div className="truncate font-semibold">{room.title}</div>
          </div>
          <span className="cta rounded-lg px-4 py-2 text-sm">Ver stream</span>
        </Link>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-surface p-4 text-center">
          <div className="font-mono text-2xl font-bold">{n(followers)}</div>
          <div className="text-xs uppercase tracking-wide text-faint">Seguidores</div>
        </div>
        {isHost ? (
          <>
            <div className="rounded-2xl border border-line bg-surface p-4 text-center">
              <div className="font-mono text-2xl font-bold text-amber">💎 {n(beans)}</div>
              <div className="text-xs uppercase tracking-wide text-faint">Beans ganados</div>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 text-center">
              <div className="font-mono text-2xl font-bold">{n(hostStats?.gifts_received ?? 0)}</div>
              <div className="text-xs uppercase tracking-wide text-faint">Regalos recibidos</div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-line bg-surface p-4 text-center">
              <div className="font-mono text-2xl font-bold text-amber">🪙 {n(coinsSpent)}</div>
              <div className="text-xs uppercase tracking-wide text-faint">Fichas regaladas</div>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 text-center">
              <div className="font-mono text-2xl font-bold">{n(suppStats?.gifts_sent ?? 0)}</div>
              <div className="text-xs uppercase tracking-wide text-faint">Regalos enviados</div>
            </div>
          </>
        )}
      </div>

      <p className="mt-8 text-center text-sm text-muted"><Link href="/rooms" className="font-semibold text-brand">← Explorar salas</Link></p>
    </main>
  );
}
