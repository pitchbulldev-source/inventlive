import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import { resolveReport, banRoom } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-2xl font-extrabold">Solo administradores</h1>
        <p className="mt-1 text-muted">Tu cuenta no tiene permisos de moderación.</p>
      </main>
    );
  }

  // Verificado admin → lectura con service_role (RLS de reports es self-read).
  const admin = createAdmin();
  const { data: reports } = await admin
    .from("reports")
    .select("id,reason,status,created_at,room_id, reporter:profiles!reports_reporter_id_fkey(display_name), room:rooms(title)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Moderación</h1>
      <p className="mt-1 text-muted">Reportes de la comunidad.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-3">Sala</th><th className="px-4 py-3">Reporta</th>
              <th className="px-4 py-3">Motivo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reports?.length ? reports.map((r: any) => (
              <tr key={r.id} className="border-t border-line align-middle">
                <td className="px-4 py-3">{r.room?.title ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{r.reporter?.display_name ?? "—"}</td>
                <td className="px-4 py-3">{r.reason}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "open" ? "bg-warn/15 text-warn" : "bg-ok/15 text-ok"}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {r.status === "open" && (
                      <form action={resolveReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="rounded-md border border-line px-2 py-1 text-xs hover:border-ok hover:text-ok">Resolver</button>
                      </form>
                    )}
                    {r.room_id && (
                      <form action={banRoom}>
                        <input type="hidden" name="room_id" value={r.room_id} />
                        <button className="rounded-md border border-line px-2 py-1 text-xs hover:border-danger hover:text-danger">Banear sala</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No hay reportes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
