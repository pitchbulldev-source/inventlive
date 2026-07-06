"use client";

import { useTransition } from "react";
import { buyCoins } from "./actions";

export default function BuyButton({ packageId }: { packageId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await buyCoins(packageId); })}
      className="h-10 w-full rounded-lg bg-brand font-semibold text-brand-ink disabled:opacity-60"
    >
      {pending ? "Comprando…" : "Comprar"}
    </button>
  );
}
