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

  // Keep refs synced with React state for callbacks that run outside the render cycle
  useEffect(() => {
    localStreamRef.current = localStream;
    screenStreamRef.current = screenStream;
  }, [localStream, screenStream]);

  // HELPERS

  /**
   * Combines Camera and Screen Share streams into a single payload to send via WebRTC.
   */
  const getCombinedStream = useCallback((): MediaStream => {
    const combined = new MediaStream();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState === "live" && track.enabled) {
          track.contentHint = "motion"; // Optimizes for camera movement
          combined.addTrack(track);
        }
      });
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        if (track.readyState === "live") {
          track.contentHint = "detail"; // Optimizes for crisp text in screen sharing
          combined.addTrack(track);
        }
      });
    }

    console.debug(
      `[WebRTC] Combined stream created with ${combined.getTracks().length} tracks.`,
    );
    return combined;
  }, []);

  /**
   * Closes all connections and cleans up memory to prevent leaks when leaving the room.
   */
  const cleanup = useCallback(() => {
    console.info("[WebRTC] Cleaning up connections and sockets...");

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

  /**
   * Triggers a renegotiation. Called automatically when the user toggles their camera or screen share.
   */
  const updatePeerTracks = useCallback(() => {
    if (!peerRef.current) return;

    const combinedStream = getCombinedStream();
    console.info("[WebRTC] Renegotiating calls with updated media stream...");

    Object.keys(callsRef.current).forEach((targetPeerId) => {
      // Close the old connection for this peer
      if (callsRef.current[targetPeerId]) {
        callsRef.current[targetPeerId].close();
      }

      // Start a fresh connection with the updated tracks
      const newCall = peerRef.current!.call(targetPeerId, combinedStream);

      newCall.on("stream", (userVideoStream) => {
        setRemoteStreams((prev) => {
          const filtered = prev.filter((s) => s.id !== targetPeerId);
          return [
            ...filtered,
            // Note: If you implement dual-streams later, you can map 'type' based on video constraints
            { id: targetPeerId, stream: userVideoStream, type: "camera" },
          ];
        });
      });

      newCall.on("error", (err) => {
        console.error(
          `[WebRTC] Error renegotiating call with ${targetPeerId}:`,
          err,
        );
      });

      // Save the new reference
      callsRef.current[targetPeerId] = newCall;
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
      console.info(
        `[Socket.IO] Connected to signaling server with ID: ${newSocket.id}`,
      );
    });

    // 2. Initialize PeerJS
    const peer = new Peer(PEERJS_CONFIG);
    peerRef.current = peer;

    peer.on("open", (myPeerId) => {
      console.info(`[PeerJS] Connected to peer server. My PeerID: ${myPeerId}`);

      // Join the room in the backend ONLY after PeerJS is ready
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
      console.info(`[WebRTC] Calling PeerID: ${targetPeerId}...`);

      const call = peer.call(targetPeerId, combinedStream);
      callsRef.current[targetPeerId] = call;

      call.on("stream", (userVideoStream) => {
        console.debug(`[WebRTC] Received stream from PeerID: ${targetPeerId}`);
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.id === call.peer)) return prev;
          return [
            ...prev,
            { id: call.peer, stream: userVideoStream, type: "camera" },
          ];
        });
      });

      call.on("close", () => {
        console.info(`[WebRTC] Call with ${targetPeerId} closed normally.`);
      });
    };

    // When someone else calls US
    peer.on("call", (incomingCall) => {
      console.info(`[WebRTC] Incoming call from PeerID: ${incomingCall.peer}`);

      const answerStream = getCombinedStream();

      if (answerStream.getTracks().length > 0) {
        incomingCall.answer(answerStream); // Answer with our camera/screen
      } else {
        incomingCall.answer(); // Answer without sending media
      }

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
      console.error("[PeerJS] Fatal error:", err);
    });

    // SOCKET.IO EVENT LISTENERS

    // Late Joiner resolution: Receiving the current state of the room
    newSocket.on("room-users", (users: Participant[]) => {
      console.info(
        `[Socket.IO] Syncing room state: ${users.length} existing participants.`,
      );
      setParticipants(users);
    });

    newSocket.on("user-connected", (user: Participant) => {
      console.info(
        `[Socket.IO] User joined: ${user.name} (Socket: ${user.id})`,
      );

      setParticipants((prev) => {
        if (prev.some((p) => p.id === user.id)) return prev;
        return [...prev, user];
      });

      // Initiate WebRTC call to the new user
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
        console.info(`[Socket.IO] User disconnected. Socket: ${socketId}`);

        setParticipants((prev) => prev.filter((p) => p.id !== socketId));

        // Destroy their WebRTC stream and connection
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
      console.warn("[Socket.IO] The host has ended the room for everyone.");
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
