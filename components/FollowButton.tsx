"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export default function FollowButton({ hostId, userId, initialFollowing }: { hostId: string; userId: string | null; initialFollowing: boolean }) {
  const supabase = useRef(createClient()).current;
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();

  if (!userId) {
    return <Link href="/login" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-ink">Seguir</Link>;
  }

  function toggle() {
    start(async () => {
      if (following) {
        await supabase.from("follows").delete().eq("follower_id", userId!).eq("host_id", hostId);
        setFollowing(false);
      } else {
        await supabase.from("follows").insert({ follower_id: userId!, host_id: hostId });
        setFollowing(true);
      }
      router.refresh();
    });
  }

  return (
    <button onClick={toggle} disabled={pending}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${following ? "border border-line text-muted hover:border-danger hover:text-danger" : "bg-brand text-brand-ink"}`}>
      {following ? "Siguiendo" : "Seguir"}
    </button>
  );
}
