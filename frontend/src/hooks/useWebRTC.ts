import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL || "http://localhost:3000";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

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
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
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

  useEffect(() => {
    onRoomEndedRef.current = onRoomEnded;
  }, [onRoomEnded]);

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

  useEffect(() => {
    if (!roomId || !currentUser.uid) {
      console.warn("useWebRTC skipping effect because missing roomId or uid", {
        roomId,
        uid: currentUser.uid,
      });
      return;
    }

    const socketInstance = io(SOCKET_SERVER_URL);
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    const socket = socketInstance;

    console.log("USE WEBRTC EFFECT EJECUTADO", {
      roomId,
      uid: currentUser.uid,
    });

    socket.on("connect", () => {
      console.info("Socket connected", {
        socketId: socket.id,
        roomId,
        url: SOCKET_SERVER_URL,
      });
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err);
    });

    socket.on("disconnect", (reason) => {
      console.info("Socket disconnected", {
        reason,
        roomId,
        url: SOCKET_SERVER_URL,
      });
    });

    socket.on("room-users", (users: any[]) => {
      const participantsList = users.map((u) => ({
        id: u.socketId,
        name: u.name || u.user?.name || "Usuario",
        avatar: u.avatar ?? u.user?.avatar ?? null,
      }));

      console.info("Room users received", {
        roomId,
        count: participantsList.length,
      });

      setParticipants(participantsList);

      users.forEach(async (u) => {
        const socketId = u.socketId;

        if (!socketId || peersRef.current[socketId]) return;

        console.log("CREANDO PEER CON USUARIO EXISTENTE", socketId);

        const pc = createPeerConnection(socketId, socket);
        peersRef.current[socketId] = pc;

        addStreamTracksToPeer(pc, localStreamRef.current);
        addStreamTracksToPeer(pc, screenStreamRef.current);

        if (!localStreamRef.current && !screenStreamRef.current) {
          pc.addTransceiver("video", { direction: "recvonly" });
          pc.addTransceiver("audio", { direction: "recvonly" });
        }

        console.log("CREANDO OFFER PARA USUARIO EXISTENTE", socketId);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("webrtc-offer", {
          offer,
          to: socketId,
        });
      });
    });

    socket.on("user-connected", ({ socketId, name, avatar }) => {
      console.info("User connected", { socketId, name });

      setParticipants((prev) => {
        if (prev.some((p) => p.id === socketId)) return prev;

        return [
          ...prev,
          {
            id: socketId,
            name: name || "Usuario",
            avatar: avatar ?? null,
          },
        ];
      });
    });

    socket.on("webrtc-offer", async ({ offer, from }) => {
      console.log("OFERTA RECIBIDA DE", from);

      let pc = peersRef.current[from];

      if (!pc) {
        pc = createPeerConnection(from, socket);
        peersRef.current[from] = pc;
      }

      addStreamTracksToPeer(pc, localStreamRef.current);
      addStreamTracksToPeer(pc, screenStreamRef.current);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("webrtc-answer", {
        answer,
        to: from,
      });
    });

    socket.on("webrtc-answer", async ({ answer, from }) => {
      console.log("ANSWER RECIBIDA DE", from);

      const pc = peersRef.current[from];

      if (!pc) return;

      if (pc.signalingState === "stable") {
        console.warn("ANSWER ya estaba aplicada o llegó duplicada", {
          from,
          signalingState: pc.signalingState,
        });
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("webrtc-ice-candidate", async ({ candidate, from }) => {
      console.log("ICE RECIBIDO DE", from);

      const pc = peersRef.current[from];

      if (!pc || !candidate) return;

      if (!pc.remoteDescription) {
        console.warn("ICE ignorado porque aún no hay remoteDescription", from);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn("ICE candidate ignorado por error no crítico", error);
      }
    });

    socket.on("screen-share-started", ({ socketId }) => {
      console.log("USUARIO COMPARTIENDO PANTALLA", socketId);
      screenSharersRef.current.add(socketId);
    });

    socket.on("screen-share-stopped", ({ socketId }) => {
      screenSharersRef.current.delete(socketId);

      setRemoteStreams((prev) =>
        prev.filter(
          (stream) => !(stream.id === socketId && stream.type === "screen"),
        ),
      );
    });

    socket.on("camera-stopped", ({ socketId }) => {
      setRemoteStreams((prev) =>
        prev.filter(
          (stream) => !(stream.id === socketId && stream.type === "camera"),
        ),
      );
    });

    socket.on("user-disconnected", (userId: string) => {
      setParticipants((prev) => prev.filter((p) => p.id !== userId));
      peersRef.current[userId]?.close();
      delete peersRef.current[userId];
      setRemoteStreams((prev) => prev.filter((s) => s.id !== userId));
    });

    socket.on("room-ended", () => {
      console.log("La sala fue cerrada por el anfitrión.");
      cleanup();
      onRoomEndedRef.current?.();
    });

    socket.emit("join-room", {
      roomId,
      user: {
        uid: currentUser.uid,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
    });

    console.log("LISTENERS WEBRTC REGISTRADOS");

    return () => {
      cleanup();
    };
  }, [
    roomId,
    currentUser.uid,
    currentUser.name,
    currentUser.avatar,
    cleanup,
    createPeerConnection,
    addStreamTracksToPeer,
  ]);

  const renegotiateWithPeers = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return;

    for (const [socketId, pc] of Object.entries(peersRef.current)) {
      if (pc.signalingState !== "stable") continue;

      console.log("RENEGOCIANDO CON", socketId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("webrtc-offer", {
        offer,
        to: socketId,
      });
    }
  }, []);

  useEffect(() => {
    if (localStream) markStreamType(localStream, "camera");
    if (screenStream) markStreamType(screenStream, "screen");

    const allStreams = [localStream, screenStream].filter(
      Boolean,
    ) as MediaStream[];

    const currentTrackIds = new Set<string>();

    allStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        currentTrackIds.add(track.id);

        Object.values(peersRef.current).forEach((pc) => {
          const alreadySending = pc
            .getSenders()
            .some((sender) => sender.track?.id === track.id);

          if (!alreadySending) {
            pc.addTrack(track, stream);
          }
        });
      });
    });

    Object.values(peersRef.current).forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && !currentTrackIds.has(sender.track.id)) {
          pc.removeTrack(sender);
        }
      });
    });

    renegotiateWithPeers();
  }, [localStream, screenStream, renegotiateWithPeers]);

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

  const cleanupPeerConnections = cleanup;

  return {
    remoteStreams,
    participants,
    socketRef,
    socket,
    cleanup,
    cleanupPeerConnections,
    emitMediaState,
  };
};
