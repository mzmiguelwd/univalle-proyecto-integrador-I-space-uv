import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL || "http://localhost:3000";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};


export type Participant = {
  id: string;
  name: string;
  avatar?: string | null;
};

export const useWebRTC = (
  roomId: string,
  localStream: MediaStream | null,
  screenStream: MediaStream | null,
  currentUser: { uid: string; name: string; avatar?: string | null },
  onRoomEnded?: () => void, // ← callback para cuando el anfitrión cierra la sala
) => {
  const [remoteStreams, setRemoteStreams] = useState<
    { id: string; stream: MediaStream }[]
  >([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const socketRef    = useRef<Socket | null>(null);
  const peersRef     = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const [socket, setSocket] = useState<Socket | null>(null);


  // ── Crear conexión WebRTC con un peer ─────────────────────
  const createPeerConnection = useCallback(
    (userId: string, socket: Socket) => {
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
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.id === userId)) return prev;
          return [...prev, { id: userId, stream }];
        });
      };

      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc-offer", { offer, to: userId });
        } catch (err) {
          console.error("Error durante negociación:", err);
        }
      };

      return pc;
    },
    [],
  );

  // ── Limpiar todo al salir ──────────────────────────────────
  const cleanup = useCallback(() => {
    socketRef.current?.disconnect();
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams([]);
    setParticipants([]);
  }, []);

  // ── Efecto principal: Socket.IO + señalización ─────────────
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

    socket.on("connect", () => {
      console.info("Socket connected", { socketId: socket.id, roomId, url: SOCKET_SERVER_URL });
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err);
    });

    socket.on("disconnect", (reason) => {
      console.info("Socket disconnected", { reason, roomId, url: SOCKET_SERVER_URL });
    });

    // Lista de usuarios YA en la sala al entrar
    socket.on("room-users", (users: any[]) => {
      const participantsList = users.map((u) => ({
        id:     u.socketId,
        name:   u.name   || u.user?.name   || "Usuario",
        avatar: u.avatar ?? u.user?.avatar ?? null,
      }));

      console.info("Room users received", { roomId, count: participantsList.length });
      setParticipants(participantsList);
    });

    // Nuevo usuario entra
    socket.on("user-connected", async ({ socketId, name, avatar }) => {
      console.info("User connected", { socketId, name });

      setParticipants((prev) => {
        if (prev.some((p) => p.id === socketId)) return prev;
        return [...prev, { id: socketId, name: name || "Usuario", avatar: avatar ?? null }];
      });

      const pc = createPeerConnection(socketId, socket);
      peersRef.current[socketId] = pc;

      if (localStream) {
        localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { offer, to: socketId });
    });

    socket.emit("join-room", {
      roomId,
      user: {
        uid:    currentUser.uid,
        name:   currentUser.name,
        avatar: currentUser.avatar,
      },
    });

    // Recibe oferta
    socket.on("webrtc-offer", async ({ offer, from }) => {
      let pc = peersRef.current[from];
      if (!pc) {
        pc = createPeerConnection(from, socket);
        peersRef.current[from] = pc;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { answer, to: from });
    });

    // Recibe respuesta
    socket.on("webrtc-answer", async ({ answer, from }) => {
      const pc = peersRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Recibe ICE candidates
    socket.on("webrtc-ice-candidate", async ({ candidate, from }) => {
      const pc = peersRef.current[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Usuario se desconecta
    socket.on("user-disconnected", (userId: string) => {
      setParticipants((prev) => prev.filter((p) => p.id !== userId));
      peersRef.current[userId]?.close();
      delete peersRef.current[userId];
      setRemoteStreams((prev) => prev.filter((s) => s.id !== userId));
    });

    // ── Anfitrión finalizó la sala para todos ─────────────────
    // El backend debe emitir "room-ended" a todos los participantes
    // cuando recibe el evento de finalizar sala
    socket.on("room-ended", () => {
      console.log("La sala fue cerrada por el anfitrión.");
      cleanup();
      onRoomEnded?.();
    });

    return () => {
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUser.uid]);

  // ── Efecto sincronizador de streams ───────────────────────
  useEffect(() => {
    const allStreams = [localStream, screenStream].filter(Boolean) as MediaStream[];
    const currentTrackIds = new Set<string>();

    allStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        currentTrackIds.add(track.id);
        Object.values(peersRef.current).forEach((pc) => {
          const alreadySending = pc.getSenders().some((s) => s.track?.id === track.id);
          if (!alreadySending) pc.addTrack(track, stream);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, screenStream]);

  return { remoteStreams, participants, socketRef, socket, cleanup };
};
