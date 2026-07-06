"use client";

import { useTransition } from "react";
import { buyCoins } from "./actions";

export default function BuyButton({ packageId }: { packageId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await buyCoins(packageId);
          if (res?.url) window.location.href = res.url; // → Wompi Web Checkout
        })
      }
      className="cta h-10 w-full rounded-lg disabled:opacity-60"
    >
      {pending ? "Procesando…" : "Comprar"}
    </button>
  );
}
