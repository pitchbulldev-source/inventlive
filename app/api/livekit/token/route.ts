import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

/**
 * Emite un token de LiveKit para una sala.
 * - El HOST de la sala puede publicar (cámara/mic).
 * - Cualquier otro (incl. anónimos) solo se suscribe (mira).
 * Si LiveKit no está configurado, devuelve { token: null } y la UI cae al placeholder.
 */
export async function GET(req: Request) {
  const roomId = new URL(req.url).searchParams.get("room");
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl || !roomId) return NextResponse.json({ token: null });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let canPublish = false;
  const identity = user?.id ?? `guest-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  if (user) {
    const { data: room } = await supabase.from("rooms").select("host_id").eq("id", roomId).maybeSingle();
    canPublish = !!room && room.host_id === user.id; // solo el host publica
  }

  const at = new AccessToken(apiKey, apiSecret, { identity, ttl: "1h" });
  at.addGrant({ room: roomId, roomJoin: true, canPublish, canSubscribe: true, canPublishData: false });
  const token = await at.toJwt();

  return NextResponse.json({ token, url: wsUrl });
}
