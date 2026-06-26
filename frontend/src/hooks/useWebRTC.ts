import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Peer, { type MediaConnection } from "peerjs";

// ENVIRONMENT & CONFIGURATION

const envSocketUrl = import.meta.env.VITE_SOCKET_SERVER_URL?.trim();

// Safe global object check for SSR compatibility
const defaultSocketUrl = import.meta.env.DEV
  ? "http://localhost:3000"
  : globalThis.window
    ? globalThis.window.location.origin
    : "http://localhost:3000";

const SOCKET_SERVER_URL = envSocketUrl || defaultSocketUrl;

if (import.meta.env.DEV && !envSocketUrl) {
  console.info(
    "[WebRTC] Desarrollo detectado. Apuntando el servidor de señalización a:",
    SOCKET_SERVER_URL,
  );
}

const url = new URL(SOCKET_SERVER_URL);

// Dynamic port resolution for PeerJS
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
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ],
  },
};

// TYPES & INTERFACES

export type RemoteStreamType = "camera" | "screen";

export interface RemoteStream {
  id: string; // Peer ID of the sender
  stream: MediaStream;
  type: RemoteStreamType;
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

/**
 * Custom Hook to manage WebRTC connections via PeerJS and Signaling via Socket.IO.
 * Handles the complexities of multiple peers, screen sharing, and media state sync.
 */
export const useWebRTC = (
  roomId: string,
  localStream: MediaStream | null,
  screenStream: MediaStream | null,
  currentUser: CurrentUserPayload,
  onRoomEnded?: () => void,
) => {
  // STATES
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  // Used as a dependency trigger to force UI re-renders when tracks change under the hood
  const [remoteTracksUpdate, setRemoteTracksUpdate] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // REFS
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  // Keeps track of active PeerJS calls to avoid duplicates and allow cleanups
  const callsRef = useRef<Record<string, MediaConnection>>({});

  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenStreamRef = useRef<MediaStream | null>(screenStream);

  // Referencias para los Dummy Tracks (Mantienen la conexión SDP viva cuando apagamos el hardware)
  const dummyAudioRef = useRef<MediaStreamTrack | null>(null);
  const dummyVideoRef = useRef<MediaStreamTrack | null>(null);

  // Keep refs synced with React state for callbacks that run outside the render cycle
  useEffect(() => {
    localStreamRef.current = localStream;
    screenStreamRef.current = screenStream;
  }, [localStream, screenStream]);

  // ── INICIALIZACIÓN DE DUMMY STREAMS ──
  useEffect(() => {
    // 1. Crear un track de video falso (1x1 pixel negro)
    if (!dummyVideoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 1, 1);
      }
      const dummyVideo = canvas.captureStream(1).getVideoTracks()[0];
      dummyVideo.enabled = false;
      dummyVideoRef.current = dummyVideo;
    }

    // 2. Crear un track de audio falso (Silencio total)
    if (!dummyAudioRef.current) {
      try {
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        oscillator.connect(dst);
        oscillator.start();
        const dummyAudio = dst.stream.getAudioTracks()[0];
        dummyAudio.enabled = false;
        dummyAudioRef.current = dummyAudio;
      } catch (e) {
        console.warn("[WebRTC] No se pudo crear el dummy audio context", e);
      }
    }
  }, []);

  // HELPERS

  /**
   * Garantiza que SIEMPRE se devuelva 1 track de audio y 1 de video.
   * Si el usuario apagó su cámara o micrófono, usa los Dummy Tracks.
   */
  const getCombinedStream = useCallback((): MediaStream => {
    const combined = new MediaStream();

    // Priorizar Audio Real -> Audio Falso
    const realAudio = localStreamRef.current
      ?.getAudioTracks()
      .find((t) => t.readyState === "live");
    if (realAudio) combined.addTrack(realAudio);
    else if (dummyAudioRef.current) combined.addTrack(dummyAudioRef.current);

    // Priorizar Pantalla -> Cámara Real -> Video Falso
    const realScreen = screenStreamRef.current
      ?.getVideoTracks()
      .find((t) => t.readyState === "live");
    const realCamera = localStreamRef.current
      ?.getVideoTracks()
      .find((t) => t.readyState === "live");

    if (realScreen) {
      realScreen.contentHint = "detail";
      combined.addTrack(realScreen);
    } else if (realCamera) {
      realCamera.contentHint = "motion";
      combined.addTrack(realCamera);
    } else if (dummyVideoRef.current) {
      combined.addTrack(dummyVideoRef.current);
    }

    return combined;
  }, []);

  /**
   * Closes all connections and cleans up memory to prevent leaks when leaving the room.
   */
  const cleanup = useCallback(() => {
    console.info("[WebRTC] Limpiando conexiones...");
    Object.values(callsRef.current).forEach((call) => call.close());
    callsRef.current = {};

    if (peerRef.current) {
      peerRef.current.disconnect();
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setRemoteStreams([]);
    setParticipants([]);
    setSocket(null);
  }, []);

  /**
   * SUSTITUYE LAS PISTAS "AL VUELO" USANDO LA API NATIVA.
   * Nunca corta la llamada. Si prendes la cámara, cambia el cuadro negro por tu cámara en tiempo real.
   */
  const updatePeerTracks = useCallback(() => {
    const combinedStream = getCombinedStream();
    const newAudioTrack = combinedStream.getAudioTracks()[0];
    const newVideoTrack = combinedStream.getVideoTracks()[0];

    Object.values(callsRef.current).forEach((call) => {
      const pc = call.peerConnection;
      if (!pc) return;

      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === "audio" && newAudioTrack) {
          if (sender.track !== newAudioTrack) {
            sender
              .replaceTrack(newAudioTrack)
              .catch((e) => console.warn("[WebRTC] Error swap audio", e));
            console.debug("[WebRTC] Track de audio actualizado en vivo.");
          }
        } else if (sender.track?.kind === "video" && newVideoTrack) {
          if (sender.track !== newVideoTrack) {
            sender
              .replaceTrack(newVideoTrack)
              .catch((e) => console.warn("[WebRTC] Error swap video", e));
            console.debug("[WebRTC] Track de video actualizado en vivo.");
          }
        }
      });
    });

    setRemoteTracksUpdate((prev) => prev + 1);
  }, [getCombinedStream]);

  /**
   * Broadcasts the user's microphone and camera hardware state to the room for UI updates.
   */
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

  // CORE INITIALIZATION (MOUNT)

  useEffect(() => {
    if (!roomId || !currentUser.uid) {
      console.warn(
        "[WebRTC] Missing roomId or currentUser UID. Skipping initialization.",
      );
      return;
    }

    // 1. Initialize Socket.IO
    const newSocket = io(SOCKET_SERVER_URL, {});
    socketRef.current = newSocket;

    // React strict rule: only update state in response to external events
    newSocket.on("connect", () => {
      setSocket(newSocket);
      console.info(`[Socket.IO] Conectado con ID: ${newSocket.id}`);
    });

    // 2. Initialize PeerJS
    const peer = new Peer(PEERJS_CONFIG);
    peerRef.current = peer;

    peer.on("open", (myPeerId) => {
      console.info(`[PeerJS] PeerID local: ${myPeerId}`);
      newSocket.emit("join-room", {
        roomId,
        user: {
          uid: currentUser.uid,
          name: currentUser.name,
          avatar: currentUser.avatar,
          peerId: myPeerId,
        },
      });
    });

    // PEERJS EVENT LISTENERS

    const callRemotePeer = (targetPeerId: string) => {
      if (!targetPeerId || callsRef.current[targetPeerId]) return;

      const combinedStream = getCombinedStream(); // Siempre tiene 1A/1V
      console.debug(
        `[WebRTC] Estableciendo conexión inicial con: ${targetPeerId}...`,
      );

      const call = peer.call(targetPeerId, combinedStream);
      callsRef.current[targetPeerId] = call;

      call.on("stream", (userVideoStream) => {
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.id === call.peer)) return prev;
          return [
            ...prev,
            { id: call.peer, stream: userVideoStream, type: "camera" },
          ];
        });
      });
    };

    // When someone else calls US
    peer.on("call", (incomingCall) => {
      console.info(`[WebRTC] Llamada entrante de: ${incomingCall.peer}`);

      // Solo cerramos llamadas si hay una duplicación por reconexión de red
      if (callsRef.current[incomingCall.peer]) {
        callsRef.current[incomingCall.peer].close();
      }

      const answerStream = getCombinedStream(); // Siempre tiene 1A/1V
      incomingCall.answer(answerStream);

      incomingCall.on("stream", (userVideoStream) => {
        setRemoteStreams((prev) => {
          const filtered = prev.filter((s) => s.id !== incomingCall.peer);
          return [
            ...filtered,
            { id: incomingCall.peer, stream: userVideoStream, type: "camera" },
          ];
        });
      });

      callsRef.current[incomingCall.peer] = incomingCall;
    });

    peer.on("error", (err) => {
      console.error("[PeerJS] Error crítico:", err);
    });

    // SOCKET.IO EVENT LISTENERS

    // Late Joiner resolution: Receiving the current state of the room
    newSocket.on("room-users", (users: any[]) => {
      console.info(
        `[Socket.IO] Sincronizando estado: ${users.length} participantes existentes.`,
      );
      const mappedUsers: Participant[] = users.map((u) => ({
        id: u.socketId, // <- SOLUCIÓN AL BUG DEL FANTASMA
        peerId: u.peerId,
        name: u.name,
        avatar: u.avatar,
        micOn: u.micOn,
        camOn: u.camOn,
        isScreenSharing: u.isScreenSharing,
      }));
      setParticipants(mappedUsers);
    });

    newSocket.on("user-connected", (user: any) => {
      console.info(
        `[Socket.IO] Usuario unido: ${user.name} (Socket: ${user.socketId})`,
      );
      const mappedUser: Participant = {
        id: user.socketId, // <- SOLUCIÓN AL BUG DEL FANTASMA
        peerId: user.peerId,
        name: user.name,
        avatar: user.avatar,
        micOn: user.micOn,
        camOn: user.camOn,
        isScreenSharing: user.isScreenSharing,
      };

      setParticipants((prev) => {
        if (prev.some((p) => p.id === mappedUser.id)) return prev;
        return [...prev, mappedUser];
      });

      if (mappedUser.peerId && mappedUser.peerId !== peer.id) {
        callRemotePeer(mappedUser.peerId);
      }
    });

    newSocket.on("media-state", ({ socketId, micOn, camOn }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === socketId ? { ...p, micOn, camOn } : p)),
      );
    });

    newSocket.on(
      "user-disconnected",
      (socketId: string, disconnectedPeerId: string) => {
        console.info(`[Socket.IO] Usuario desconectado. Socket: ${socketId}`);

        setParticipants((prev) => prev.filter((p) => p.id !== socketId));

        if (disconnectedPeerId && callsRef.current[disconnectedPeerId]) {
          callsRef.current[disconnectedPeerId].close();
          delete callsRef.current[disconnectedPeerId];
          setRemoteStreams((prev) =>
            prev.filter((s) => s.id !== disconnectedPeerId),
          );
        }
      },
    );

    newSocket.on("room-ended", () => {
      console.warn("[Socket.IO] El anfitrión ha finalizado la sala.");
      cleanup();
      if (onRoomEnded) onRoomEnded();
    });

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUser.uid]);

  // DYNAMIC TRACK UPDATER

  // This triggers renegotiation if the user toggles their hardware
  useEffect(() => {
    updatePeerTracks();
  }, [localStream, screenStream, updatePeerTracks]);

  return {
    remoteStreams,
    remoteTracksUpdate,
    participants,
    socketRef,
    socket,
    cleanup,
    emitMediaState,
    updatePeerTracksCallback: updatePeerTracks,
  };
};
