import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RoomClient from "./RoomClient";

export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("id,title,status,viewers,host_id, hosts(user_id, profiles!hosts_user_id_fkey(display_name,handle,avatar_url))")
    .eq("id", id)
    .maybeSingle();
  if (!room) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isHostSelf = user?.id === room.host_id;

  const [{ data: gifts }, { data: messages }, { data: recentGifts }, bal, followRes] = await Promise.all([
    supabase.from("gifts").select("*").eq("is_active", true).order("sort"),
    supabase.from("room_messages").select("id,body,sender_id, profiles!room_messages_sender_id_fkey(display_name)").eq("room_id", id).order("id", { ascending: false }).limit(30),
    supabase.from("gift_events").select("id,gift_id,sender_id,coins, profiles!gift_events_sender_id_fkey(display_name)").eq("room_id", id).order("id", { ascending: false }).limit(8),
    user ? supabase.from("balances").select("balance").eq("user_id", user.id).eq("currency", "coin").maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("host_id", room.host_id),
  ]);

  // Batalla PK activa de esta sala (resolver si ya venció)
  let { data: battle } = await supabase.from("pk_battles")
    .select("*").eq("status", "active").or(`challenger_room.eq.${id},opponent_room.eq.${id}`)
    .order("started_at", { ascending: false }).maybeSingle();
  if (battle && new Date(battle.ends_at).getTime() < Date.now()) {
    await supabase.rpc("resolve_pk", { p_battle: battle.id });
    ({ data: battle } = await supabase.from("pk_battles").select("*").eq("id", battle.id).maybeSingle());
  }
  let battleNames = { a: "Host A", b: "Host B" };
  if (battle) {
    const { data: ps } = await supabase.from("profiles").select("id,display_name").in("id", [battle.challenger_host, battle.opponent_host]);
    const m = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p.display_name]));
    battleNames = { a: m[battle.challenger_host] ?? "Host A", b: m[battle.opponent_host] ?? "Host B" };
  }

  let isFollowing = false;
  if (user && !isHostSelf) {
    const { data: f } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("host_id", room.host_id).maybeSingle();
    isFollowing = !!f;
  }

  let otherLiveRooms: any[] = [];
  if (isHostSelf) {
    const { data: others } = await supabase.from("rooms").select("id, hosts(profiles!hosts_user_id_fkey(display_name))").eq("status", "live").neq("id", id);
    otherLiveRooms = (others ?? []).map((r: any) => ({ id: r.id, label: r.hosts?.profiles?.display_name ?? "Sala" }));
  }

  return (
    <RoomClient
      room={room as any}
      gifts={gifts ?? []}
      initialMessages={((messages as any[]) ?? []).slice().reverse()}
      initialGifts={((recentGifts as any[]) ?? []).slice().reverse()}
      userId={user?.id ?? null}
      coinBalance={(bal as any)?.data?.balance ?? 0}
      followerCount={(followRes as any)?.count ?? 0}
      isFollowing={isFollowing}
      battle={battle ?? null}
      battleNames={battleNames}
      otherLiveRooms={otherLiveRooms}
    />
  );
}
