import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Peer, { type MediaConnection } from "peerjs";

// ENVIRONMENT & CONFIG

const envSocketUrl = import.meta.env.VITE_SOCKET_SERVER_URL?.trim();
const defaultSocketUrl = "http://localhost:3000";
const SOCKET_SERVER_URL = envSocketUrl || defaultSocketUrl;

if (globalThis.window && !envSocketUrl) {
  console.warn(
    "[WARN] VITE_SOCKET_SERVER_URL no está definido. Usando fallback:",
    SOCKET_SERVER_URL,
  );
}

const url = new URL(SOCKET_SERVER_URL);

let computedPort = 80;
if (url.port) {
  computedPort = Number.parseInt(url.port);
} else if (url.protocol === "https:") {
  computedPort = 443;
}

const PEERJS_CONFIG = {
  host: url.hostname,
  port: computedPort,
  path: "/peerjs",
  secure: url.protocol === "https:",
};

// TYPES & INTERFACES

/**
 * FIX #3: Se elimina el concepto de RemoteStreamType basado en contentHint,
 * ya que contentHint NO se transfiere por WebRTC. En su lugar, el servidor
 * notifica explícitamente via socket cuándo hay screen-share activo.
 */
export interface RemoteStream {
  peerId: string;
  stream: MediaStream;
}

export interface Participant {
  id: string; // Socket ID
  peerId: string;
  name: string;
  avatar?: string | null;
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
}

export interface CurrentUserPayload {
  uid: string;
  name: string;
  avatar?: string | null;
}

// MAIN HOOK

export const useWebRTC = (
  roomId: string,
  localStream: MediaStream | null,
  screenStream: MediaStream | null,
  currentUser: CurrentUserPayload,
  onRoomEnded?: () => void,
) => {
  // STATES
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // REFS
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const callsRef = useRef<Record<string, MediaConnection>>({});
  const hasJoinedRef = useRef(false); // FIX #1: Previene join-room duplicado

  /**
   * FIX #6: Refs centralizados para los streams.
   * La fuente de verdad para los callbacks de WebRTC son siempre los refs,
   * nunca los valores de estado de React (que son stale en closures).
   */
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenStreamRef = useRef<MediaStream | null>(screenStream);

  // Mantener refs sincronizados con los props entrantes
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // HELPERS

  /**
   * Combina el stream de cámara y pantalla en un único MediaStream
   * para enviarlo a través de PeerJS.
   * Los tracks de pantalla se marcan con contentHint="detail" para
   * identificarlos en el lado EMISOR (no receptor).
   */
  const getCombinedStream = useCallback((): MediaStream => {
    const combined = new MediaStream();

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        if (track.readyState === "live") {
          combined.addTrack(track);
        }
      }
    }

    if (screenStreamRef.current) {
      for (const track of screenStreamRef.current.getTracks()) {
        if (track.readyState === "live") {
          combined.addTrack(track);
        }
      }
    }

    return combined;
  }, []); // Sin dependencias: usa refs que siempre son actuales

  /**
   * FIX #3: processIncomingStream ya NO intenta separar cámara de pantalla
   * usando contentHint (que no viaja por WebRTC). Ahora almacena el stream
   * completo y la UI decide cómo mostrarlo según el estado de socket.
   */
  const processIncomingStream = useCallback(
    (remotePeerId: string, incomingStream: MediaStream) => {
      setRemoteStreams((prev) => {
        const filtered = prev.filter((s) => s.peerId !== remotePeerId);
        return [...filtered, { peerId: remotePeerId, stream: incomingStream }];
      });
    },
    [],
  );

  /**
   * FIX #11: Flag para evitar que cleanup dispare errores cuando
   * el componente se desmonta después de que el socket ya cerró.
   */
  const isCleanedUpRef = useRef(false);

  const cleanup = useCallback(() => {
    if (isCleanedUpRef.current) return;
    isCleanedUpRef.current = true;

    console.info("[WebRTC] Limpiando conexiones...");

    for (const call of Object.values(callsRef.current)) {
      call.close();
    }
    callsRef.current = {};

    peerRef.current?.destroy();
    peerRef.current = null;

    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }
    socketRef.current = null;

    setRemoteStreams([]);
    setParticipants([]);
    setSocket(null);
  }, []);

  /**
   * FIX #4 + FIX #5: updatePeerTracks ahora reemplaza los tracks
   * en las conexiones existentes usando RTCRtpSender.replaceTrack()
   * en lugar de cerrar y re-abrir llamadas completas.
   * Esto evita la ventana de "stream congelado" y es la forma estándar
   * de renegociar tracks en WebRTC.
   */
  const updatePeerTracks = useCallback(() => {
    if (!peerRef.current) return;

    const combinedStream = getCombinedStream();
    const newTracks = combinedStream.getTracks();

    for (const [targetPeerId, call] of Object.entries(callsRef.current)) {
      // Acceder al RTCPeerConnection subyacente de PeerJS
      const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
      if (!pc) continue;

      const senders = pc.getSenders();

      for (const newTrack of newTracks) {
        // Buscar un sender existente del mismo tipo (audio/video)
        const existingSender = senders.find(
          (s) => s.track?.kind === newTrack.kind,
        );

        if (existingSender) {
          // Reemplazar el track sin cerrar la conexión
          existingSender.replaceTrack(newTrack).catch((err) => {
            console.warn(
              `[WebRTC] replaceTrack falló para ${targetPeerId}:`,
              err,
            );
          });
        } else {
          // Si no hay sender para este tipo, añadir el track
          pc.addTrack(newTrack, combinedStream);
        }
      }

      // Si ya no hay video (cámara apagada y sin pantalla), enviar null
      const hasVideoTrack = newTracks.some((t) => t.kind === "video");
      if (!hasVideoTrack) {
        const videoSender = senders.find((s) => s.track?.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(null).catch(() => {});
        }
      }
    }
  }, [getCombinedStream]);

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

  // CORE: WEBRTC & SOCKET INITIALIZATION

  useEffect(() => {
    if (!roomId || !currentUser.uid) return;

    // Reset del flag de cleanup para esta instancia del hook
    isCleanedUpRef.current = false;
    hasJoinedRef.current = false;

    // --- Inicializar Socket.IO ---
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = newSocket;

    // --- Inicializar PeerJS ---
    const peer = new Peer(PEERJS_CONFIG);
    peerRef.current = peer;

    /**
     * FIX #1: La unión a la sala ocurre SOLO cuando AMBOS están listos:
     * el socket conectado Y PeerJS con su ID asignado.
     * Se usa una función coordinadora que solo ejecuta join-room una vez.
     */
    let socketReady = false;
    let myPeerId: string | null = null;

    const tryJoinRoom = () => {
      if (socketReady && myPeerId && !hasJoinedRef.current) {
        hasJoinedRef.current = true;

        newSocket.emit("join-room", {
          roomId,
          user: {
            name: currentUser.name,
            avatar: currentUser.avatar ?? null,
            peerId: myPeerId,
          },
        });

        setSocket(newSocket);
        console.info(
          `[WebRTC] Sala unida: ${roomId} | PeerID: ${myPeerId} | SocketID: ${newSocket.id}`,
        );
      }
    };

    newSocket.on("connect", () => {
      socketReady = true;
      tryJoinRoom();
    });

    peer.on("open", (id) => {
      myPeerId = id;
      tryJoinRoom();
    });

    // --- Helpers locales ---

    const callRemotePeer = (targetPeerId: string) => {
      if (!targetPeerId || callsRef.current[targetPeerId]) return;
      if (targetPeerId === peer.id) return; // No llamarse a sí mismo

      const combinedStream = getCombinedStream();
      console.info(`[WebRTC] Llamando a PeerID: ${targetPeerId}`);

      const call = peer.call(targetPeerId, combinedStream);
      callsRef.current[targetPeerId] = call;

      call.on("stream", (remoteStream) => {
        processIncomingStream(targetPeerId, remoteStream);
      });

      call.on("close", () => {
        console.info(`[WebRTC] Llamada con ${targetPeerId} cerrada.`);
        setRemoteStreams((prev) =>
          prev.filter((s) => s.peerId !== targetPeerId),
        );
        delete callsRef.current[targetPeerId];
      });

      call.on("error", (err) => {
        console.error(`[WebRTC] Error en llamada con ${targetPeerId}:`, err);
      });
    };

    // --- PeerJS: llamadas entrantes ---

    peer.on("call", (incomingCall) => {
      console.info(`[WebRTC] Llamada entrante de PeerID: ${incomingCall.peer}`);

      const answerStream = getCombinedStream();
      incomingCall.answer(answerStream);

      incomingCall.on("stream", (remoteStream) => {
        processIncomingStream(incomingCall.peer, remoteStream);
      });

      incomingCall.on("close", () => {
        setRemoteStreams((prev) =>
          prev.filter((s) => s.peerId !== incomingCall.peer),
        );
        delete callsRef.current[incomingCall.peer];
      });

      callsRef.current[incomingCall.peer] = incomingCall;
    });

    peer.on("error", (err) => {
      console.error("[PeerJS] Error:", err.type, err.message);
    });

    // --- Socket.IO: eventos de sala ---

    newSocket.on("room-users", (users) => {
      console.info(
        `[Socket] Presencia inicial: ${users.length} participantes.`,
      );
      setParticipants(
        users.map((u: { socketId: any; peerId: any; name: any; avatar: any; micOn: any; camOn: any; isScreenSharing: any; }) => ({
          id: u.socketId,
          peerId: u.peerId,
          name: u.name,
          avatar: u.avatar,
          micOn: u.micOn,
          camOn: u.camOn,
          isScreenSharing: u.isScreenSharing,
        })),
      );

      // Llamar a todos los participantes existentes al recibir la lista
      for (const user of users) {
        if (user.peerId && user.peerId !== peer.id) {
          callRemotePeer(user.peerId);
        }
      }
    });

    newSocket.on("user-connected", (user) => {
      console.info(`[Socket] Usuario conectado: ${user.name}`);

      setParticipants((prev) => {
        if (prev.some((p) => p.id === user.socketId)) return prev;
        return [
          ...prev,
          {
            id: user.socketId,
            peerId: user.peerId,
            name: user.name,
            avatar: user.avatar,
            micOn: user.micOn,
            camOn: user.camOn,
            isScreenSharing: user.isScreenSharing,
          },
        ];
      });

      if (user.peerId && user.peerId !== peer.id) {
        callRemotePeer(user.peerId);
      }
    });

    newSocket.on("user-disconnected", (socketId, disconnectedPeerId) => {
      console.info(`[Socket] Usuario desconectado: ${socketId}`);

      setParticipants((prev) => prev.filter((p) => p.id !== socketId));

      if (disconnectedPeerId && callsRef.current[disconnectedPeerId]) {
        callsRef.current[disconnectedPeerId].close();
        delete callsRef.current[disconnectedPeerId];
        setRemoteStreams((prev) =>
          prev.filter((s) => s.peerId !== disconnectedPeerId),
        );
      }
    });

    newSocket.on("media-state", ({ socketId, micOn, camOn }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === socketId ? { ...p, micOn, camOn } : p)),
      );
    });

    /**
     * FIX #10: Ahora sí escuchamos los eventos de pantalla y cámara del servidor
     * para mantener el estado de los participantes remotos actualizado.
     */
    newSocket.on("screen-share-started", ({ socketId }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === socketId ? { ...p, isScreenSharing: true } : p,
        ),
      );
    });

    newSocket.on("screen-share-stopped", ({ socketId }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === socketId ? { ...p, isScreenSharing: false } : p,
        ),
      );
    });

    newSocket.on("camera-stopped", ({ socketId }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === socketId ? { ...p, camOn: false } : p)),
      );
    });

    /**
     * FIX #11: room-ended llama a onRoomEnded() que a su vez navega,
     * lo que desmonta el componente. El cleanup del useEffect se disparará
     * después de eso. Con isCleanedUpRef.current evitamos doble limpieza.
     */
    newSocket.on("room-ended", () => {
      console.info("[Socket] Sala finalizada por el anfitrión.");
      onRoomEnded?.();
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("[Socket] Desconectado:", reason);
    });

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUser.uid]);

  /**
   * FIX #2 + #5: El efecto de renegociación ahora verifica que haya
   * peers activos antes de correr, y NO incluye updatePeerTracks en las deps
   * para evitar bucles. Se llama manualmente desde Room.tsx cuando corresponde.
   *
   * Este efecto solo actualiza los tracks cuando cambian los streams
   * y ya existen conexiones activas.
   */
  const localStreamStable = localStream;
  const screenStreamStable = screenStream;

  useEffect(() => {
    const hasActiveCalls = Object.keys(callsRef.current).length > 0;
    if (!hasActiveCalls) return; // No hacer nada si no hay peers

    updatePeerTracks();
    // Solo depende de los streams reales, no de la función
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStreamStable, screenStreamStable]);

  return {
    remoteStreams,
    participants,
    socketRef,
    socket,
    cleanup,
    emitMediaState,
    updatePeerTracksCallback: updatePeerTracks,
  };
};
