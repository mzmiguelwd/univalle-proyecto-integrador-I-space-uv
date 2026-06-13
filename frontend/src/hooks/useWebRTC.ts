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
      currentLocalStreamRef.current
        .getTracks()
        .forEach((t) => combined.addTrack(t));
    }
    if (currentScreenStreamRef.current) {
      currentScreenStreamRef.current
        .getTracks()
        .forEach((t) => combined.addTrack(t));
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

  useEffect(() => {
    if (!roomId || !currentUser.uid) return;

    const socket = io(SOCKET_SERVER_URL);
    socketRef.current = socket;

    const peer = new Peer(PEERJS_CONFIG);
    peerRef.current = peer;

    peer.on("open", (myPeerId) => {
      console.info("PeerJS connected with ID:", myPeerId);

      socket.emit("join-room", {
        roomId,
        user: {
          uid: currentUser.uid,
          name: currentUser.name,
          avatar: currentUser.avatar,
          peerId: myPeerId,
        },
      });
    });

    peer.on("call", (call) => {
      call.answer(getCombinedStream());

      call.on("stream", (userVideoStream) => {
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.id === call.peer)) return prev;
          return [...prev, { id: call.peer, stream: userVideoStream }];
        });
      });

      callsRef.current[call.peer] = call;
    });

    socket.on("room-users", (users: any[]) => {
      const participantsList = users.map((u) => ({
        id: u.socketId,
        name: u.name || u.user?.name || "Usuario",
        avatar: u.avatar ?? u.user?.avatar ?? null,
        peerId: u.peerId,
      }));
      setParticipants(participantsList);
    });

    socket.on("user-connected", ({ socketId, name, avatar, peerId }) => {
      setParticipants((prev) => [
        ...prev,
        { id: socketId, name: name || "Usuario", avatar, peerId },
      ]);

      if (peerId) {
        const call = peer.call(peerId, getCombinedStream());

        call.on("stream", (userVideoStream) => {
          setRemoteStreams((prev) => {
            if (prev.some((s) => s.id === peerId)) return prev;
            return [...prev, { id: peerId, stream: userVideoStream }];
          });
        });

        callsRef.current[peerId] = call;
      }
    });

    socket.on(
      "user-disconnected",
      (userId: string, disconnectedPeerId: string) => {
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
    if (!peerRef.current || participants.length === 0) return;

    const currentLocalStream = localStream || new MediaStream();

    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        currentLocalStream.addTrack(track);
      });
    }

    participants.forEach((participant) => {
      if (participant.peerId) {
        if (callsRef.current[participant.peerId]) {
          callsRef.current[participant.peerId].close();
        }

        const newCall = peerRef.current!.call(
          participant.peerId,
          currentLocalStream,
        );

        newCall.on("stream", (userVideoStream) => {
          setRemoteStreams((prev) => {
            const filtered = prev.filter((s) => s.id !== participant.peerId);
            return [
              ...filtered,
              { id: participant.peerId, stream: userVideoStream },
            ];
          });
        });

        // Guardamos la nueva referencia
        callsRef.current[participant.peerId] = newCall;
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, screenStream]);

  return { remoteStreams, participants, socketRef, cleanupPeerConnections };
};
