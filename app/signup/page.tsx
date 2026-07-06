"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, {});

  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Crear cuenta</h1>
        <p className="mt-1 text-muted">Sumate a InventLive en segundos.</p>
      </div>
      <form action={action} className="grid gap-4 rounded-2xl border border-line bg-surface p-6">
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-muted">Nombre</span>
          <input name="display_name" type="text"
            className="h-11 rounded-lg border border-line bg-bg px-3 outline-none focus:border-brand" placeholder="Tu nombre" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-muted">Email</span>
          <input name="email" type="email" required autoComplete="username"
            className="h-11 rounded-lg border border-line bg-bg px-3 outline-none focus:border-brand" placeholder="vos@ejemplo.com" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-muted">Contraseña</span>
          <input name="password" type="password" required autoComplete="new-password" minLength={6}
            className="h-11 rounded-lg border border-line bg-bg px-3 outline-none focus:border-brand" placeholder="mín. 6 caracteres" />
        </label>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <button disabled={pending}
          className="h-11 rounded-lg bg-brand font-semibold text-brand-ink disabled:opacity-60">
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
      <p className="text-center text-sm text-muted">
        ¿Ya tenés cuenta? <Link href="/login" className="font-semibold text-brand">Entrar</Link>
      </p>
    </div>
  );
}
