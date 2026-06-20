import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Peer, { type MediaConnection } from "peerjs";

const envSocketUrl = import.meta.env.VITE_SOCKET_SERVER_URL?.trim();
const defaultSocketUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
const SOCKET_SERVER_URL = envSocketUrl || defaultSocketUrl;

if (typeof window !== "undefined" && !envSocketUrl) {
  console.warn(
    "[WARN] VITE_SOCKET_SERVER_URL no está definido. En producción esto probablemente causa un timeout al conectar Socket.IO/PeerJS.",
    "Usando fallback:",
    SOCKET_SERVER_URL,
  );
}

console.info("Socket server config: ", {
  envUrl: envSocketUrl,
  computedUrl: SOCKET_SERVER_URL,
});
const url = new URL(SOCKET_SERVER_URL);
const peerHost = url.hostname;
let peerPort;
if (url.port) {
  peerPort = Number.parseInt(url.port);
} else if (url.protocol === "https:") {
  peerPort = 443;
} else {
  peerPort = 80;
}
console.info("Socket peer config:", { host: peerHost, port: peerPort, secure: url.protocol === "https:" });

const PEERJS_CONFIG = {
  host: peerHost,
  port: peerPort,
  path: "/peerjs",
  secure: url.protocol === "https:",
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  },
};

export type Participant = {
  id: string;
  name: string;
  avatar?: string | null;
  peerId?: string;
  micOn: boolean; // ← nuevo
  camOn: boolean; // ← nuevo (útil para indicador visual futuro)
};

export const useWebRTC = (
  roomId: string,
  localStream: MediaStream | null,
  screenStream: MediaStream | null,
  currentUser: { uid: string; name: string; avatar?: string | null },
  onRoomEnded?: () => void,
) => {
  const [remoteStreams, setRemoteStreams] = useState<
    { id: string; stream: MediaStream }[]
  >([]);
  const [remoteTracksUpdate, setRemoteTracksUpdate] = useState(0); // ← forzar re-renders cuando cambian tracks
  const [participants, setParticipants] = useState<Participant[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const callsRef = useRef<{ [peerId: string]: MediaConnection }>({});

  const currentLocalStreamRef = useRef(localStream);
  const currentScreenStreamRef = useRef(screenStream);

  useEffect(() => {
    currentLocalStreamRef.current = localStream;
    currentScreenStreamRef.current = screenStream;
  }, [localStream, screenStream]);

  const getCombinedStream = useCallback(() => {
    const combined = new MediaStream();

    if (currentLocalStreamRef.current) {
      currentLocalStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState !== "live") {
          console.warn("Track no está live, ignorando:", { kind: track.kind, id: track.id, readyState: track.readyState });
          return;
        }
        if (!track.enabled) {
          console.debug("Track deshabilitado, ignorando:", { kind: track.kind, id: track.id });
          return;
        }
        combined.addTrack(track);
      });
    }

    if (currentScreenStreamRef.current) {
      currentScreenStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState !== "live") {
          console.warn("Screen track no está live, ignorando:", { kind: track.kind, id: track.id });
          return;
        }
        combined.addTrack(track);
      });
    }

    console.debug("getCombinedStream: combinado contiene", combined.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id })));
    return combined;
  }, []);

  const cleanupPeerConnections = useCallback(() => {
    socketRef.current?.disconnect();
    peerRef.current?.destroy();
    Object.values(callsRef.current).forEach((call) => call.close());
    callsRef.current = {};
    setRemoteStreams([]);
    setParticipants([]);
  }, []);

  const updatePeerTracks = useCallback(async () => {
    if (!peerRef.current) {
      console.warn("updatePeerTracks: peerRef no inicializado");
      return;
    }

    const combined = getCombinedStream();
    const newAudio = combined.getAudioTracks()[0] || null;
    const newVideo = combined.getVideoTracks()[0] || null;

    console.info("updatePeerTracks: iniciando actualización con", {
      numCalls: Object.keys(callsRef.current).length,
      hasAudio: !!newAudio,
      hasVideo: !!newVideo,
      audioId: newAudio?.id,
      videoId: newVideo?.id,
    });

    const updatePromises = Object.values(callsRef.current).map(async (existingCall) => {
      try {
        const pc: any = (existingCall as any).peerConnection;
        if (!pc || typeof pc.getSenders !== "function") {
          console.warn("updatePeerTracks: peerConnection no disponible para call", existingCall.peer);
          return;
        }

        const senders: RTCRtpSender[] = pc.getSenders();
        const audioSender = senders.find((sender) => sender?.track?.kind === "audio");
        const videoSender = senders.find((sender) => sender?.track?.kind === "video");

        console.info("updatePeerTracks: senders actuales para", existingCall.peer, {
          audioSender: audioSender ? { kind: audioSender.track?.kind, id: audioSender.track?.id } : null,
          videoSender: videoSender ? { kind: videoSender.track?.kind, id: videoSender.track?.id } : null,
        });

        // Actualizar audio
        if (newAudio) {
          if (audioSender) {
            console.info(`Reemplazando audio track en ${existingCall.peer}:`, {
              oldId: audioSender.track?.id,
              newId: newAudio.id,
            });
            await audioSender.replaceTrack(newAudio);
          } else {
            console.info(`Agregando audio track a ${existingCall.peer}:`, { id: newAudio.id });
            pc.addTrack(newAudio, combined);
          }
        } else if (audioSender) {
          console.info(`Removiendo audio track en ${existingCall.peer}`);
          await audioSender.replaceTrack(null);
        }

        // Actualizar video
        if (newVideo) {
          if (videoSender) {
            console.info(`Reemplazando video track en ${existingCall.peer}:`, {
              oldId: videoSender.track?.id,
              newId: newVideo.id,
            });
            await videoSender.replaceTrack(newVideo);
          } else {
            console.info(`Agregando video track a ${existingCall.peer}:`, { id: newVideo.id });
            pc.addTrack(newVideo, combined);
          }
        } else if (videoSender) {
          console.info(`Removiendo video track en ${existingCall.peer}`);
          await videoSender.replaceTrack(null);
        }
      } catch (err) {
        console.error(`Error actualizando tracks en la conexión`, existingCall.peer, ":", err);
      }
    });

    await Promise.all(updatePromises);
    // Forzar re-render de componentes que usan remoteStreams para que se recalcule hasActiveVideo
    setRemoteTracksUpdate((prev) => prev + 1);
    console.info("updatePeerTracks: actualización completada");
  }, [getCombinedStream]);

  // ── Emitir estado de micrófono/cámara al resto de la sala ──
  // Llama esto desde Room.tsx cada vez que toggleMicrophone o toggleCamera cambie
  const emitMediaState = useCallback(
    (micOn: boolean, camOn: boolean) => {
      socketRef.current?.emit("media-state", { roomId, micOn, camOn });
    },
    [roomId],
  );

  useEffect(() => {
    if (!roomId || !currentUser.uid) return;

    const socket = io(SOCKET_SERVER_URL, {
      transports: ["polling"],
      path: "/socket.io",
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.info(`Socket.IO connected (client) id=${socket.id}`);
    });

    socket.on("connect_error", (err: any) => {
      console.error("Socket.IO connect_error:", err);
    });

    socket.on("connect_timeout", (err: any) => {
      console.warn("Socket.IO connect_timeout:", err);
    });

    const peer = new Peer(PEERJS_CONFIG);
    peerRef.current = peer;

    peer.on("open", (myPeerId) => {
      console.info("PeerJS connected with ID:", myPeerId);

      console.info(`Emitiendo join-room con peerId=${myPeerId}`);
      socket.emit("join-room", {
        roomId,
        user: {
          uid: currentUser.uid,
          name: currentUser.name,
          avatar: currentUser.avatar,
          peerId: myPeerId,
        },
      });

      // Reintentar la obtención de participantes en caso de que la lista inicial venga vacía
      setTimeout(() => {
        console.info("Solicitando presencia (request-presence) para asegurar lista de participantes...");
        socket.emit("request-presence", { roomId });
      }, 300);
    });

    const callPeer = (targetPeerId: string) => {
      if (!targetPeerId || callsRef.current[targetPeerId]) {
        console.warn("callPeer: targetPeerId inválido o conexión ya existe", targetPeerId);
        return;
      }

      const combinedStream = getCombinedStream();
      console.info(`callPeer: iniciando llamada a peer ${targetPeerId}`);
      console.debug("callPeer: stream combined", {
        numTracks: combinedStream.getTracks().length,
        tracks: combinedStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id })),
      });

      const call = peer.call(targetPeerId, combinedStream);
      callsRef.current[targetPeerId] = call;

      call.on("stream", (userVideoStream) => {
        console.info(`callPeer: stream recibido de ${call.peer}`, {
          streamId: userVideoStream.id,
          tracks: userVideoStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id })),
        });
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.id === call.peer)) {
            console.debug(`Stream de ${call.peer} ya existe en remoteStreams, ignorando`);
            return prev;
          }
          const next = [...prev, { id: call.peer, stream: userVideoStream }];
          console.debug("setRemoteStreams: estado actualizado con", next.map(s => s.id));
          return next;
        });
      });

      call.on("close", () => {
        console.info(`callPeer: call a ${targetPeerId} cerrada`);
      });

      call.on("error", (err: any) => {
        console.error(`callPeer: error con ${targetPeerId}:`, err);
      });
    };

    peer.on("call", (call) => {
      console.info(`peer.on("call"): llamada entrante desde ${call.peer}`);
      const answerStream = getCombinedStream();

      console.debug("peer.on('call'): respondiendo con stream", {
        numTracks: answerStream.getTracks().length,
        tracks: answerStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id })),
      });

      if (answerStream.getTracks().length > 0) {
        console.info("peer.on('call'): respondiendo con stream activo");
        call.answer(answerStream);
      } else {
        console.info("peer.on('call'): respondiendo sin stream (sin media local)");
        call.answer();
      }

      call.on("stream", (userVideoStream) => {
        console.info(`peer.on("call"): stream recibido de ${call.peer}`, {
          streamId: userVideoStream.id,
          tracks: userVideoStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id })),
        });
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.id === call.peer)) {
            console.debug(`Stream de ${call.peer} ya existe, ignorando`);
            return prev;
          }
          const next = [...prev, { id: call.peer, stream: userVideoStream }];
          console.debug("setRemoteStreams: actualizado con", next.map(s => s.id));
          return next;
        });
      });

      call.on("close", () => {
        console.info(`peer.on("call"): call de ${call.peer} cerrada`);
      });

      call.on("error", (err: any) => {
        console.error(`peer.on("call"): error con ${call.peer}:`, err);
      });

      callsRef.current[call.peer] = call;
    });

    peer.on("error", (err:any) => {
      console.error("PeerJS error:", err);
    });

    peer.on("disconnected", () => {
      console.warn("PeerJS disconnected");
    });

    peer.on("close", () => {
      console.warn("PeerJS closed");
    });

    // ── room-users: lista inicial al unirse ─────────────────
    socket.on("room-users", (users: any[]) => {
      console.info(`room-users recibido con ${users.length} entradas`, users);
      const participantsList: Participant[] = users.map((u) => ({
        id: u.socketId,
        name: u.name || u.user?.name || "Usuario",
        avatar: u.avatar ?? u.user?.avatar ?? null,
        peerId: u.peerId,
        micOn: u.micOn ?? false, // respetar estado real si el servidor lo envía, sino false
        camOn: u.camOn ?? false,
      }));

      setParticipants(participantsList);
      console.debug("Participants state actualizado con room-users:", participantsList.map(p => ({id: p.id, peerId: p.peerId})));
    });

    // ── user-connected: nuevo participante entra ─────────────
    socket.on("user-connected", ({ socketId, name, avatar, peerId }) => {
      console.info(`user-connected: ${socketId} (peerId=${peerId}) nombre=${name}`);
      setParticipants((prev) => {
        if (prev.some((p) => p.id === socketId)) return prev;
        const next = [
          ...prev,
          {
            id: socketId,
            name: name || "Usuario",
            avatar,
            peerId,
            micOn: false, // apagado por defecto hasta que el participante active
            camOn: false,
          },
        ];
        console.debug("Participants state tras user-connected:", next.map(p => ({id: p.id, peerId: p.peerId})));
        return next;
      });

      if (peerId && peerId !== peer.id) {
        console.info(`Solicitando conexión a peerId ${peerId}`);
        callPeer(peerId);
      }
    });

    // ── media-state: alguien cambió su mic o cámara ──────────
    socket.on(
      "media-state",
      ({
        socketId,
        micOn,
        camOn,
      }: {
        socketId: string;
        micOn: boolean;
        camOn: boolean;
      }) => {
        console.info(`media-state de ${socketId}: micOn=${micOn} camOn=${camOn}`);
        setParticipants((prev) =>
          prev.map((p) => (p.id === socketId ? { ...p, micOn, camOn } : p)),
        );
      },
    );

    socket.on(
      "user-disconnected",
      (userId: string, disconnectedPeerId: string) => {
        console.info(`user-disconnected: socket ${userId} peer ${disconnectedPeerId}`);
        setParticipants((prev) => prev.filter((p) => p.id !== userId));

        if (disconnectedPeerId && callsRef.current[disconnectedPeerId]) {
          callsRef.current[disconnectedPeerId].close();
          delete callsRef.current[disconnectedPeerId];
          setRemoteStreams((prev) =>
            prev.filter((s) => s.id !== disconnectedPeerId),
          );
        }
      },
    );

    socket.on("room-ended", () => {
      cleanupPeerConnections();
      onRoomEnded?.();
    });

    return () => {
      cleanupPeerConnections();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUser.uid]);

  useEffect(() => {
    updatePeerTracks();
  }, [localStream, screenStream, getCombinedStream, updatePeerTracks]);

  return {
    remoteStreams,
    remoteTracksUpdate, // ← usar como dependency para forzar re-renders
    participants,
    socketRef,
    cleanupPeerConnections,
    emitMediaState,
    updatePeerTracksCallback: updatePeerTracks, // ← permitir que Room.tsx lo llame directamente
  };
};
