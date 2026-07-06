import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { n } from "@/lib/format";

export default async function TopBar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let coins = 0;
  let beans = 0;
  let isHost = false;
  let ownsAgency = false;
  if (user) {
    const { data: bals } = await supabase.from("balances").select("currency,balance").eq("user_id", user.id);
    coins = bals?.find((b) => b.currency === "coin")?.balance ?? 0;
    beans = bals?.find((b) => b.currency === "bean")?.balance ?? 0;
    const { data: host } = await supabase.from("hosts").select("user_id").eq("user_id", user.id).maybeSingle();
    isHost = !!host;
    const { data: ag } = await supabase.from("agencies").select("id").eq("owner_id", user.id).maybeSingle();
    ownsAgency = !!ag;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link href="/rooms" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-brand text-brand-ink text-xs">◆</span>
          <span>Invent<span className="text-live">Live</span></span>
        </Link>
        <nav className="ml-2 flex items-center gap-1 text-sm text-muted">
          <Link href="/rooms" className="rounded-md px-2.5 py-1.5 hover:bg-surface hover:text-ink">Salas</Link>
          <Link href="/leaderboard" className="rounded-md px-2.5 py-1.5 hover:bg-surface hover:text-ink">Ranking</Link>
          {isHost && <Link href="/host" className="rounded-md px-2.5 py-1.5 hover:bg-surface hover:text-ink">Host</Link>}
          {ownsAgency && <Link href="/agency" className="rounded-md px-2.5 py-1.5 hover:bg-surface hover:text-ink">Agencia</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link href="/wallet" className="rounded-full border border-line bg-surface px-3 py-1.5 font-mono hover:border-brand/60">
                🪙 {n(coins)}
              </Link>
              {isHost && (
                <span className="rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-live">💎 {n(beans)}</span>
              )}
              <form action={signOut}>
                <button className="rounded-md px-2.5 py-1.5 text-muted hover:text-ink">Salir</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-md bg-brand px-3 py-1.5 font-semibold text-brand-ink">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
