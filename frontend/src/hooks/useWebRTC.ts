import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Peer, { type MediaConnection } from "peerjs";

// ENVIRONMENT & CONFIG

const envSocketUrl = import.meta.env.VITE_SOCKET_SERVER_URL?.trim();
const defaultSocketUrl = "http://localhost:3000";
const SOCKET_SERVER_URL = envSocketUrl || defaultSocketUrl;

if (globalThis.window && !envSocketUrl) {
  console.warn(
    "[WARN] VITE_SOCKET_SERVER_URL no está definido. Usando fallback de entorno local:",
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

export type RemoteStreamType = "camera" | "screen";

export interface RemoteStream {
  id: string; // Peer ID of the sender
  stream: MediaStream;
  type: RemoteStreamType;
  trackId?: string;
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
  const [remoteTracksUpdate, setRemoteTracksUpdate] = useState(0); // Forces re-renders on track changes
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // REFS
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const callsRef = useRef<Record<string, MediaConnection>>({});

  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenStreamRef = useRef<MediaStream | null>(screenStream);

  // Keep refs synced with React state for callbacks
  useEffect(() => {
    localStreamRef.current = localStream;
    screenStreamRef.current = screenStream;
  }, [localStream, screenStream]);

  // HELPERS

  const getCombinedStream = useCallback((): MediaStream => {
    const combined = new MediaStream();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState === "live" && track.enabled) {
          track.contentHint = "motion";
          combined.addTrack(track);
        }
      });
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState === "live") {
          track.contentHint = "detail";
          combined.addTrack(track);
        }
      });
    }

    return combined;
  }, []);

  const processIncomingStream = useCallback(
    (targetPeerId: string, incomingStream: MediaStream) => {
      const newStreams: RemoteStream[] = [];
      const audioTracks = incomingStream.getAudioTracks();
      const videoTracks = incomingStream.getVideoTracks();

      // Separar usando el contentHint que configuraste
      const screenTrack = videoTracks.find(
        (track) => track.contentHint === "detail",
      );
      const cameraTrack = videoTracks.find(
        (track) => track.contentHint !== "detail",
      );

      // 1. Armar el stream de la cámara (Video + Audio)
      if (cameraTrack || audioTracks.length > 0) {
        const cameraMediaStream = new MediaStream();
        if (cameraTrack) cameraMediaStream.addTrack(cameraTrack);
        audioTracks.forEach((track) => cameraMediaStream.addTrack(track));

        newStreams.push({
          id: targetPeerId,
          stream: cameraMediaStream,
          type: "camera",
        });
      }

      // 2. Armar el stream de la pantalla (Solo Video usualmente)
      if (screenTrack) {
        const screenMediaStream = new MediaStream();
        screenMediaStream.addTrack(screenTrack);

        newStreams.push({
          id: targetPeerId,
          stream: screenMediaStream,
          type: "screen",
        });
      }

      // Actualizar el estado limpiando los streams anteriores de este usuario
      setRemoteStreams((prev) => {
        const filtered = prev.filter((s) => s.id !== targetPeerId);
        return [...filtered, ...newStreams];
      });
    },
    [],
  );

  const cleanup = useCallback(() => {
    console.info("Limpiando conexiones WebRTC y Sockets...");
    Object.values(callsRef.current).forEach((call) => call.close());
    callsRef.current = {};

    if (peerRef.current) {
      peerRef.current.disconnect();
      peerRef.current.destroy();
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setRemoteStreams([]);
    setParticipants([]);
    setSocket(null);
  }, []);

  const updatePeerTracks = useCallback(() => {
    if (!peerRef.current) return;

    const combinedStream = getCombinedStream();
    console.info("Renegociando llamadas con el nuevo stream multimedia...");

    // Iterate over active connections and replace calls with new stream
    Object.keys(callsRef.current).forEach((targetPeerId) => {
      if (callsRef.current[targetPeerId]) {
        callsRef.current[targetPeerId].close();
      }

      const newCall = peerRef.current!.call(targetPeerId, combinedStream);

      newCall.on("stream", (userVideoStream) => {
        processIncomingStream(targetPeerId, userVideoStream);
      });

      newCall.on("error", (err) => {
        console.error(`Error renegociando llamada con ${targetPeerId}:`, err);
      });

      callsRef.current[targetPeerId] = newCall;
    });

    setRemoteTracksUpdate((prev) => prev + 1);
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

  // CORE WEBRTC & SOCKET INITIALIZATION

  useEffect(() => {
    if (!roomId || !currentUser.uid) return;

    // Initialize Socket.IO
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = newSocket;
    newSocket.on("connect", () => {
      setSocket(newSocket);
    });

    // Initialize PeerJS
    const peer = new Peer(PEERJS_CONFIG);
    peerRef.current = peer;

    peer.on("open", (myPeerId) => {
      console.info(`Conectado a PeerJS. Mi ID: ${myPeerId}`);

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

      const combinedStream = getCombinedStream();
      console.info(`Llamando al participante con PeerID: ${targetPeerId}...`);

      const call = peer.call(targetPeerId, combinedStream);
      callsRef.current[targetPeerId] = call;

      call.on("stream", (userVideoStream) => {
        processIncomingStream(targetPeerId, userVideoStream);
      });

      // NO OLVIDES agregar el listener de cierre para evitar cámaras congeladas
      call.on("close", () => {
        console.info(`Llamada con ${targetPeerId} finalizada.`);
        setRemoteStreams((prev) => prev.filter((s) => s.id !== targetPeerId));
      });
    };

    peer.on("call", (incomingCall) => {
      console.info(`Llamada entrante de PeerID: ${incomingCall.peer}`);

      const answerStream = getCombinedStream();
      if (answerStream.getTracks().length > 0) {
        incomingCall.answer(answerStream);
      } else {
        incomingCall.answer();
      }

      incomingCall.on("stream", (userVideoStream) => {
        processIncomingStream(incomingCall.peer, userVideoStream);
      });

      // Limpieza al cerrar la llamada entrante
      incomingCall.on("close", () => {
        setRemoteStreams((prev) =>
          prev.filter((s) => s.id !== incomingCall.peer),
        );
      });

      callsRef.current[incomingCall.peer] = incomingCall;
    });

    peer.on("error", (err) => {
      console.error("Error en PeerJS:", err);
    });

    // SOCKET.IO EVENT LISTENERS

    newSocket.on("room-users", (users: Participant[]) => {
      console.info(
        `Sincronizando estado de sala: ${users.length} participantes encontrados.`,
      );
      setParticipants(users);
    });

    newSocket.on("user-connected", (user: Participant) => {
      console.info(`Usuario unido: ${user.name} (Socket: ${user.id})`);

      setParticipants((prev) => {
        if (prev.some((p) => p.id === user.id)) return prev;
        return [...prev, user];
      });

      if (user.peerId && user.peerId !== peer.id) {
        callRemotePeer(user.peerId);
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
        console.info(`Usuario desconectado. Socket: ${socketId}`);

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
      console.info("El anfitrión ha finalizado la sala.");
      cleanup();
      if (onRoomEnded) onRoomEnded();
    });

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUser.uid]);

  // DYNAMIC TRACK UPDATER

  // This triggers renegotiation if the user toggles their camera or screen share on/off
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
