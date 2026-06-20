import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Peer, { type MediaConnection } from "peerjs";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL || "http://localhost:3000";

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
        if (track.readyState !== "live") return;
        if (!track.enabled) return;
        combined.addTrack(track);
      });
    }

    if (currentScreenStreamRef.current) {
      currentScreenStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState !== "live") return;
        combined.addTrack(track);
      });
    }

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
      transports: ["websocket", "polling"],
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
      if (!targetPeerId || callsRef.current[targetPeerId]) return;

      const combinedStream = getCombinedStream();
      console.info(`Iniciando llamada a peer ${targetPeerId}`);
      console.debug("Combined stream tracks:", combinedStream.getTracks().map(t=>({kind: t.kind, enabled: t.enabled, id: t.id})));
      const call = peer.call(targetPeerId, combinedStream);
      callsRef.current[targetPeerId] = call;

      call.on("stream", (userVideoStream) => {
        console.info(`call.stream from ${call.peer}: tracks=`, userVideoStream.getTracks().map(t=>({kind:t.kind, enabled:t.enabled, id:t.id})));
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.id === call.peer)) {
            console.debug(`Stream de ${call.peer} ya existe, ignorando`);
            return prev;
          }
          const next = [...prev, { id: call.peer, stream: userVideoStream }];
          console.debug("RemoteStreams ahora:", next.map(n=>n.id));
          return next;
        });
      });

      call.on("close", () => {
        console.info(`call to ${targetPeerId} closed`);
      });

      call.on("error", (err:any) => {
        console.error(`call error with ${targetPeerId}:`, err);
      });
    };

    peer.on("call", (call) => {
      console.info(`Llamada entrante desde peer ${call.peer}. Respondiendo...`);
      const answerStream = getCombinedStream();
      if (answerStream.getTracks().length > 0) {
        console.debug("Respondiendo con stream local combinado (audio/video)");
        call.answer(answerStream);
      } else {
        console.debug("Respondiendo sin stream (sin pistas locales activas)");
        call.answer();
      }

      call.on("stream", (userVideoStream) => {
        console.info(`Recibido stream remoto de ${call.peer} id=${userVideoStream.id} tracks=`, userVideoStream.getTracks().map(t=>({kind:t.kind, enabled:t.enabled, id:t.id})));
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.id === call.peer)) {
            console.debug(`Stream remoto de ${call.peer} ya existe, ignorando`);
            return prev;
          }
          const next = [...prev, { id: call.peer, stream: userVideoStream }];
          console.debug("RemoteStreams ahora:", next.map(n=>n.id));
          return next;
        });
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
    if (!peerRef.current) return;

    const combined = getCombinedStream();
    const newAudio = combined.getAudioTracks()[0] || null;
    const newVideo = combined.getVideoTracks()[0] || null;

    Object.values(callsRef.current).forEach((existingCall) => {
      try {
        const pc: any = (existingCall as any).peerConnection;
        if (!pc || typeof pc.getSenders !== "function") return;

        const senders: RTCRtpSender[] = pc.getSenders();
        const audioSender = senders.find((sender) => sender?.track?.kind === "audio");
        const videoSender = senders.find((sender) => sender?.track?.kind === "video");

        if (newAudio) {
          if (audioSender) {
            audioSender.replaceTrack(newAudio);
          } else {
            pc.addTrack(newAudio, currentLocalStreamRef.current!);
          }
        }

        if (newVideo) {
          if (videoSender) {
            videoSender.replaceTrack(newVideo);
          } else {
            pc.addTrack(newVideo, currentLocalStreamRef.current!);
          }
        }
      } catch (err) {
        console.warn("No se pudo actualizar tracks en la conexión existente:", err);
      }
    });
  }, [localStream, screenStream, getCombinedStream]);

  return {
    remoteStreams,
    participants,
    socketRef,
    cleanupPeerConnections,
    emitMediaState, // ← exportar para usarlo en Room.tsx
  };
};
