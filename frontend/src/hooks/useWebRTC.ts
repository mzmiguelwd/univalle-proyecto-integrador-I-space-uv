import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const envSocketUrl = import.meta.env.VITE_SOCKET_SERVER_URL?.trim();
const defaultSocketUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";
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
console.info("Socket peer config:", {
  host: peerHost,
  port: peerPort,
  secure: url.protocol === "https:",
});

export type RemoteStreamType = "camera" | "screen";

export type RemoteStream = {
  id: string;
  stream: MediaStream;
  type: RemoteStreamType;
  trackId?: string;
};

export type Participant = {
  id: string;
  name: string;
  avatar?: string | null;
};

const markStreamType = (stream: MediaStream, type: RemoteStreamType) => {
  stream.getTracks().forEach((track) => {
    track.contentHint = type === "screen" ? "detail" : "motion";
  });
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
  const [socket, setSocket] = useState<Socket | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenStreamRef = useRef<MediaStream | null>(screenStream);
  const onRoomEndedRef = useRef(onRoomEnded);

  const screenSharersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStreamRef.current = localStream;
    screenStreamRef.current = screenStream;
  }, [localStream, screenStream]);

  const getCombinedStream = useCallback(() => {
    const combined = new MediaStream();

    if (currentLocalStreamRef.current) {
      currentLocalStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState !== "live") {
          console.warn("Track no está live, ignorando:", {
            kind: track.kind,
            id: track.id,
            readyState: track.readyState,
          });
          return;
        }
        if (!track.enabled) {
          console.debug("Track deshabilitado, ignorando:", {
            kind: track.kind,
            id: track.id,
          });
          return;
        }
        combined.addTrack(track);
      });
    }

    if (currentScreenStreamRef.current) {
      currentScreenStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState !== "live") {
          console.warn("Screen track no está live, ignorando:", {
            kind: track.kind,
            id: track.id,
          });
          return;
        }
        combined.addTrack(track);
      });
    }

    console.debug(
      "getCombinedStream: combinado contiene",
      combined
        .getTracks()
        .map((t) => ({ kind: t.kind, enabled: t.enabled, id: t.id })),
    );
    return combined;
  }, []);

  const addStreamTracksToPeer = useCallback(
    (pc: RTCPeerConnection, stream: MediaStream | null) => {
      if (!stream) return;

      stream.getTracks().forEach((track) => {
        const alreadySending = pc
          .getSenders()
          .some((sender) => sender.track?.id === track.id);

        if (!alreadySending) {
          pc.addTrack(track, stream);
        }
      });
    },
    [],
  );

  const createPeerConnection = useCallback((userId: string, socket: Socket) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          candidate: event.candidate,
          to: userId,
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      const track = event.track;

      if (track.kind !== "video") return;

      console.log("TRACK REMOTO RECIBIDO", {
        userId,
        kind: track.kind,
        label: track.label,
        contentHint: track.contentHint,
        streamId: stream.id,
        trackId: track.id,
      });

      const isolatedStream = new MediaStream([track]);

      setRemoteStreams((prev) => {
        const userStreams = prev.filter((s) => s.id === userId);

        const sameTrackExists = userStreams.some((s) => s.trackId === track.id);

        if (sameTrackExists) return prev;

        const type: RemoteStreamType =
          userStreams.length === 0 ? "camera" : "screen";

        return [
          ...prev,
          {
            id: userId,
            stream: isolatedStream,
            type,
            trackId: track.id,
          },
        ];
      });

      track.onended = () => {
        setRemoteStreams((prev) =>
          prev.filter((s) => !(s.id === userId && s.trackId === track.id)),
        );
      };
    };

    return pc;
  }, []);

  const cleanup = useCallback(() => {
    socketRef.current?.disconnect();
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams([]);
    setParticipants([]);
  }, []);

  const updatePeerTracks = useCallback(() => {
    if (!peerRef.current) {
      console.warn("updatePeerTracks: peerRef no inicializado");
      return;
    }

    const combinedStream = getCombinedStream();
    console.info("updatePeerTracks: Reiniciando llamadas con el nuevo stream");

    // Recorremos todos los peers conectados actualmente
    Object.keys(callsRef.current).forEach((targetPeerId) => {
      // 1. Cerramos la conexión antigua
      if (callsRef.current[targetPeerId]) {
        callsRef.current[targetPeerId].close();
      }

      // 2. Iniciamos una llamada nueva e inyectamos el stream actualizado
      const newCall = peerRef.current!.call(targetPeerId, combinedStream);

      newCall.on("stream", (userVideoStream) => {
        setRemoteStreams((prev) => {
          const filtered = prev.filter((s) => s.id !== targetPeerId);
          return [...filtered, { id: targetPeerId, stream: userVideoStream }];
        });
      });

      newCall.on("error", (err: any) => {
        console.error(
          `Error en la renegociación de llamada con ${targetPeerId}:`,
          err,
        );
      });

      // 3. Sobrescribimos la referencia con la nueva llamada
      callsRef.current[targetPeerId] = newCall;
    });

    // Forzamos el renderizado de la UI
    setRemoteTracksUpdate((prev) => prev + 1);
    console.info("updatePeerTracks: actualización completada");
  }, [getCombinedStream]);

  // ── Emitir estado de micrófono/cámara al resto de la sala ──
  // Llama esto desde Room.tsx cada vez que toggleMicrophone o toggleCamera cambie
  const emitMediaState = useCallback(
    (microphoneOn: boolean, cameraOn: boolean) => {
      socketRef.current?.emit("media-state", {
        roomId,
        micOn: microphoneOn,
        camOn: cameraOn,
      });
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
        console.info(
          "Solicitando presencia (request-presence) para asegurar lista de participantes...",
        );
        socket.emit("request-presence", { roomId });
      }, 300);
    });

    const callPeer = (targetPeerId: string) => {
      if (!targetPeerId || callsRef.current[targetPeerId]) {
        console.warn(
          "callPeer: targetPeerId inválido o conexión ya existe",
          targetPeerId,
        );
        return;
      }

      const combinedStream = getCombinedStream();
      console.info(`callPeer: iniciando llamada a peer ${targetPeerId}`);
      console.debug("callPeer: stream combined", {
        numTracks: combinedStream.getTracks().length,
        tracks: combinedStream
          .getTracks()
          .map((t) => ({ kind: t.kind, enabled: t.enabled, id: t.id })),
      });

      const call = peer.call(targetPeerId, combinedStream);
      callsRef.current[targetPeerId] = call;

      call.on("stream", (userVideoStream) => {
        console.info(`callPeer: stream recibido de ${call.peer}`, {
          streamId: userVideoStream.id,
          tracks: userVideoStream
            .getTracks()
            .map((t) => ({ kind: t.kind, enabled: t.enabled, id: t.id })),
        });
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.id === call.peer)) {
            console.debug(
              `Stream de ${call.peer} ya existe en remoteStreams, ignorando`,
            );
            return prev;
          }
          const next = [...prev, { id: call.peer, stream: userVideoStream }];
          console.debug(
            "setRemoteStreams: estado actualizado con",
            next.map((s) => s.id),
          );
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
        tracks: answerStream
          .getTracks()
          .map((t) => ({ kind: t.kind, enabled: t.enabled, id: t.id })),
      });

      if (answerStream.getTracks().length > 0) {
        console.info("peer.on('call'): respondiendo con stream activo");
        call.answer(answerStream);
      } else {
        console.info(
          "peer.on('call'): respondiendo sin stream (sin media local)",
        );
        call.answer();
      }

      call.on("stream", (userVideoStream) => {
        console.info(
          `peer.on("call"): stream actualizado recibido de ${call.peer}`,
        );
        setRemoteStreams((prev) => {
          // Ya no ignoramos el stream si existe, lo filtramos y lo reemplazamos
          const filtered = prev.filter((s) => s.id !== call.peer);
          return [...filtered, { id: call.peer, stream: userVideoStream }];
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

    peer.on("error", (err: any) => {
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
      console.debug(
        "Participants state actualizado con room-users:",
        participantsList.map((p) => ({ id: p.id, peerId: p.peerId })),
      );
    });

    // ── user-connected: nuevo participante entra ─────────────
    socket.on("user-connected", ({ socketId, name, avatar, peerId }) => {
      console.info(
        `user-connected: ${socketId} (peerId=${peerId}) nombre=${name}`,
      );
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
        console.debug(
          "Participants state tras user-connected:",
          next.map((p) => ({ id: p.id, peerId: p.peerId })),
        );
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
        console.info(
          `media-state de ${socketId}: micOn=${micOn} camOn=${camOn}`,
        );
        setParticipants((prev) =>
          prev.map((p) => (p.id === socketId ? { ...p, micOn, camOn } : p)),
        );
      },
    );

    socket.on(
      "user-disconnected",
      (userId: string, disconnectedPeerId: string) => {
        console.info(
          `user-disconnected: socket ${userId} peer ${disconnectedPeerId}`,
        );
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
    socket,
    cleanup,
    cleanupPeerConnections,
    emitMediaState,
    updatePeerTracksCallback: updatePeerTracks, // ← permitir que Room.tsx lo llame directamente
  };
};
