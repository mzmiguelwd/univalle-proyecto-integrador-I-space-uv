import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Peer, { type MediaConnection } from "peerjs";

// ── ENVIRONMENT & CONFIGURATION ───────────────────────────────────────

const envSocketUrl = import.meta.env.VITE_SOCKET_SERVER_URL?.trim();

const defaultSocketUrl = import.meta.env.DEV
  ? "http://localhost:3000"
  : globalThis.window
    ? globalThis.window.location.origin
    : "http://localhost:3000";

const SOCKET_SERVER_URL = envSocketUrl || defaultSocketUrl;

const url = new URL(SOCKET_SERVER_URL);
let computedPort = 80;
if (url.port) computedPort = Number.parseInt(url.port);
else if (url.protocol === "https:") computedPort = 443;

const PEERJS_CONFIG = {
  host: url.hostname,
  port: computedPort,
  path: "/peerjs",
  secure: url.protocol === "https:",
};

// ── TYPES & INTERFACES ────────────────────────────────────────────────

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

// ── MAIN HOOK ─────────────────────────────────────────────────────────

export const useWebRTC = (
  roomId: string,
  localStream: MediaStream | null,
  screenStream: MediaStream | null,
  currentUser: CurrentUserPayload,
  onRoomEnded?: () => void,
) => {
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [remoteTracksUpdate, setRemoteTracksUpdate] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);

  // DUAL CONNECTION ARCHITECTURE: We keep separate records for Camera and Screen calls
  const mediaCallsRef = useRef<Record<string, MediaConnection>>({});
  const screenCallsRef = useRef<Record<string, MediaConnection>>({});

  const localStreamRef = useRef<MediaStream | null>(localStream);

  // Dummy Tracks for Media (Keeps the SDP connection alive even if hardware is off)
  const dummyAudioRef = useRef<MediaStreamTrack | null>(null);
  const dummyVideoRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // ── DUMMY STREAMS INITIALIZATION ──
  useEffect(() => {
    // 1. Fake Video Track (1x1 black pixel)
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

    // 2. Fake Audio Track (Total silence)
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
        console.warn("[WebRTC] Failed to create dummy audio context", e);
      }
    }
  }, []);

  // ── HELPERS ──

  /**
   * Retrieves the current camera/mic stream, falling back to dummy tracks.
   * NEVER includes the screen stream.
   */
  const getMediaStream = useCallback((): MediaStream => {
    const combined = new MediaStream();

    const realAudio = localStreamRef.current
      ?.getAudioTracks()
      .find((t) => t.readyState === "live");
    if (realAudio) combined.addTrack(realAudio);
    else if (dummyAudioRef.current) combined.addTrack(dummyAudioRef.current);

    const realCamera = localStreamRef.current
      ?.getVideoTracks()
      .find((t) => t.readyState === "live");
    if (realCamera) {
      realCamera.contentHint = "motion";
      combined.addTrack(realCamera);
    } else if (dummyVideoRef.current) {
      combined.addTrack(dummyVideoRef.current);
    }

    return combined;
  }, []);

  const cleanup = useCallback(() => {
    console.info("[WebRTC] Cleaning up all connections...");

    Object.values(mediaCallsRef.current).forEach((call) => call.close());
    Object.values(screenCallsRef.current).forEach((call) => call.close());
    mediaCallsRef.current = {};
    screenCallsRef.current = {};

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
   * Dynamically swaps the Audio/Video tracks for the Media Connection ONLY.
   * Leaves the Screen Share connection untouched.
   */
  const updatePeerTracks = useCallback(() => {
    const mediaStream = getMediaStream();
    const newAudioTrack = mediaStream.getAudioTracks()[0];
    const newVideoTrack = mediaStream.getVideoTracks()[0];

    Object.values(mediaCallsRef.current).forEach((call) => {
      const pc = call.peerConnection;
      if (!pc) return;

      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === "audio" && newAudioTrack) {
          if (sender.track !== newAudioTrack) {
            sender
              .replaceTrack(newAudioTrack)
              .catch((e) => console.warn("[WebRTC] Error swap audio", e));
          }
        } else if (sender.track?.kind === "video" && newVideoTrack) {
          if (sender.track !== newVideoTrack) {
            sender
              .replaceTrack(newVideoTrack)
              .catch((e) => console.warn("[WebRTC] Error swap video", e));
          }
        }
      });
    });

    setRemoteTracksUpdate((prev) => prev + 1);
  }, [getMediaStream]);

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

  // ── CORE INITIALIZATION (MOUNT) ──

  useEffect(() => {
    if (!roomId || !currentUser.uid) return;

    const newSocket = io(SOCKET_SERVER_URL);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setSocket(newSocket);
      console.info(`[Socket.IO] Connected with ID: ${newSocket.id}`);
    });

    const peer = new Peer(PEERJS_CONFIG);
    peerRef.current = peer;

    peer.on("open", (myPeerId) => {
      console.info(`[PeerJS] Local PeerID: ${myPeerId}`);
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

    const callRemotePeer = (targetPeerId: string) => {
      if (!targetPeerId || mediaCallsRef.current[targetPeerId]) return;

      // 1. Call for Camera/Mic (Metadata specifies 'camera')
      const mediaStream = getMediaStream();
      console.debug(
        `[WebRTC] Establishing Media Call with: ${targetPeerId}...`,
      );

      const mediaCall = peer.call(targetPeerId, mediaStream, {
        metadata: { type: "camera" },
      });
      mediaCallsRef.current[targetPeerId] = mediaCall;

      mediaCall.on("stream", (remoteVideoStream) => {
        setRemoteStreams((prev) => {
          // Remove old camera stream if exists to avoid duplicates
          const filtered = prev.filter(
            (s) => !(s.id === mediaCall.peer && s.type === "camera"),
          );
          return [
            ...filtered,
            { id: mediaCall.peer, stream: remoteVideoStream, type: "camera" },
          ];
        });
      });

      // If we are currently sharing screen, initiate a second call immediately
      if (screenStream) {
        console.debug(
          `[WebRTC] Also establishing Screen Call with: ${targetPeerId}...`,
        );
        const screenCall = peer.call(targetPeerId, screenStream, {
          metadata: { type: "screen" },
        });
        screenCallsRef.current[targetPeerId] = screenCall;
      }
    };

    // ── ANSWERING INCOMING CALLS ──
    peer.on("call", (incomingCall) => {
      const callType = incomingCall.metadata?.type || "camera";
      console.info(
        `[WebRTC] Incoming ${callType.toUpperCase()} call from: ${incomingCall.peer}`,
      );

      if (callType === "camera") {
        if (mediaCallsRef.current[incomingCall.peer]) {
          mediaCallsRef.current[incomingCall.peer].close();
        }

        // Answer Media Call with our Camera/Mic
        incomingCall.answer(getMediaStream());

        incomingCall.on("stream", (remoteVideoStream) => {
          setRemoteStreams((prev) => {
            const filtered = prev.filter(
              (s) => !(s.id === incomingCall.peer && s.type === "camera"),
            );
            return [
              ...filtered,
              {
                id: incomingCall.peer,
                stream: remoteVideoStream,
                type: "camera",
              },
            ];
          });
        });

        mediaCallsRef.current[incomingCall.peer] = incomingCall;
      } else if (callType === "screen") {
        // Answer Screen Call without sending anything back (One-way stream)
        incomingCall.answer();

        incomingCall.on("stream", (remoteScreenStream) => {
          setRemoteStreams((prev) => {
            const filtered = prev.filter(
              (s) => !(s.id === incomingCall.peer && s.type === "screen"),
            );
            return [
              ...filtered,
              {
                id: incomingCall.peer,
                stream: remoteScreenStream,
                type: "screen",
              },
            ];
          });
        });

        incomingCall.on("close", () => {
          console.info(`[WebRTC] Screen call from ${incomingCall.peer} ended.`);
          setRemoteStreams((prev) =>
            prev.filter(
              (s) => !(s.id === incomingCall.peer && s.type === "screen"),
            ),
          );
        });

        screenCallsRef.current[incomingCall.peer] = incomingCall;
      }
    });

    // ── SOCKET.IO EVENT LISTENERS ──

    newSocket.on("room-users", (users: any[]) => {
      const mappedUsers: Participant[] = users.map((u) => ({
        id: u.socketId,
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
      const mappedUser: Participant = {
        id: user.socketId,
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
        setParticipants((prev) => prev.filter((p) => p.id !== socketId));

        // Cleanup BOTH calls if they exist
        if (disconnectedPeerId) {
          if (mediaCallsRef.current[disconnectedPeerId]) {
            mediaCallsRef.current[disconnectedPeerId].close();
            delete mediaCallsRef.current[disconnectedPeerId];
          }
          if (screenCallsRef.current[disconnectedPeerId]) {
            screenCallsRef.current[disconnectedPeerId].close();
            delete screenCallsRef.current[disconnectedPeerId];
          }
          setRemoteStreams((prev) =>
            prev.filter((s) => s.id !== disconnectedPeerId),
          );
        }
      },
    );

    newSocket.on("room-ended", () => {
      cleanup();
      if (onRoomEnded) onRoomEnded();
    });

    return () => cleanup();
  }, [roomId, currentUser.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── DYNAMIC TRACK UPDATER (CAMERA/MIC ONLY) ──
  useEffect(() => {
    updatePeerTracks();
  }, [localStream, updatePeerTracks]);

  // ── SCREEN SHARE BROADCASTER ──
  // Reacts to local screen share state and manages the secondary call
  useEffect(() => {
    if (!peerRef.current) return;

    if (screenStream) {
      console.info(
        "[WebRTC] Local screen share started. Initiating screen connections...",
      );

      // Security measure: Ensure absolutely NO audio goes through the screen stream
      screenStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        screenStream.removeTrack(track);
      });

      // Call everyone we are currently connected to
      Object.keys(mediaCallsRef.current).forEach((targetPeerId) => {
        if (!screenCallsRef.current[targetPeerId]) {
          console.debug(`[WebRTC] Dialing ${targetPeerId} for screen share...`);
          const screenCall = peerRef.current!.call(targetPeerId, screenStream, {
            metadata: { type: "screen" },
          });
          screenCallsRef.current[targetPeerId] = screenCall;
        }
      });
    } else {
      // Screen sharing stopped
      if (Object.keys(screenCallsRef.current).length > 0) {
        console.info(
          "[WebRTC] Local screen share stopped. Dropping screen connections...",
        );
        Object.values(screenCallsRef.current).forEach((call) => call.close());
        screenCallsRef.current = {};
      }
    }
  }, [screenStream]);

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
