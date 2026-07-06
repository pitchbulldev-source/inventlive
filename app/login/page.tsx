"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/app/auth/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, {});

  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Entrar</h1>
        <p className="mt-1 text-muted">Bienvenido de vuelta a weeto.</p>
      </div>
      <form action={action} className="grid gap-4 rounded-2xl border border-line bg-surface p-6">
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-muted">Email</span>
          <input name="email" type="email" required autoComplete="username"
            className="h-11 rounded-lg border border-line bg-bg px-3 outline-none focus:border-brand" placeholder="vos@ejemplo.com" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-muted">Contraseña</span>
          <input name="password" type="password" required autoComplete="current-password"
            className="h-11 rounded-lg border border-line bg-bg px-3 outline-none focus:border-brand" placeholder="••••••••" />
        </label>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <button disabled={pending}
          className="h-11 rounded-lg bg-brand font-semibold text-brand-ink disabled:opacity-60">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="text-center text-sm text-muted">
        ¿No tenés cuenta? <Link href="/signup" className="font-semibold text-brand">Crear cuenta</Link>
      </p>
    </div>
  );
}
