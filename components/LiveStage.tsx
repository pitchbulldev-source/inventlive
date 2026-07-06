"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

function Placeholder({ hostName, note }: { hostName?: string; note: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/15 text-3xl font-bold text-white backdrop-blur">
          {(hostName ?? "?").charAt(0).toUpperCase()}
        </div>
        <p className="mt-3 text-sm text-white/80">Stream de {hostName ?? "el host"}</p>
        <p className="mt-1 text-xs text-white/50">{note}</p>
      </div>
    </div>
  );
}

function Stage({ isHostSelf, hostName }: { isHostSelf: boolean; hostName?: string }) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: !isHostSelf });
  const cam = tracks.find((t) => !!t.publication);
  if (cam) return <VideoTrack trackRef={cam as any} className="absolute inset-0 h-full w-full object-cover" />;
  return <Placeholder hostName={hostName} note={isHostSelf ? "Activá tu cámara para salir en vivo" : "Esperando al host…"} />;
}

export default function LiveStage({ roomId, isHostSelf, hostName }: { roomId: string; isHostSelf: boolean; hostName?: string }) {
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let ok = true;
    fetch(`/api/livekit/token?room=${roomId}`)
      .then((r) => r.json())
      .then((d) => { if (ok) { setConn(d?.token ? d : null); setReady(true); } })
      .catch(() => { if (ok) setReady(true); });
    return () => { ok = false; };
  }, [roomId]);

  if (!ready) return <Placeholder hostName={hostName} note="Conectando…" />;
  if (!conn) return <Placeholder hostName={hostName} note="▶︎ Video en vivo — configurá LiveKit" />;

  return (
    <LiveKitRoom token={conn.token} serverUrl={conn.url} connect audio={isHostSelf} video={isHostSelf} className="absolute inset-0">
      <Stage isHostSelf={isHostSelf} hostName={hostName} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
