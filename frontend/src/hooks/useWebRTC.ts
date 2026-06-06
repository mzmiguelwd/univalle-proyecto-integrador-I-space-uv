import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL || "http://localhost:3000";

// Public Google STUN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = (
  roomId: string,
  localStream: MediaStream | null,
  screenStream: MediaStream | null,
) => {
  const [remoteStreams, setRemoteStreams] = useState<
    { id: string; stream: MediaStream }[]
  >([]);
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});

  const createPeerConnection = (userId: string, socket: Socket) => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          candidate: event.candidate,
          to: userId,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      setRemoteStreams((prevStreams) => {
        const stream = event.streams[0];
        // Evitar duplicados por id
        if (prevStreams.some((s) => s.id === userId)) return prevStreams;
        return [...prevStreams, { id: userId, stream }];
      });
    };

    peerConnection.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("webrtc-offer", { offer, to: userId });
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    return peerConnection;
  };

  useEffect(() => {
    // 1. Connect to Socket.IO
      socketRef.current = io(SOCKET_SERVER_URL);
      const socket = socketRef.current;

      // 2. Join the specified room
      socket.emit("join-room", roomId);

      // 3. When a new user connects, create and send an offer
      socket.on("user-connected", async (newUserId: string) => {
        const peerConnection = createPeerConnection(newUserId, socket);
        peersRef.current[newUserId] = peerConnection;

        if (localStream) {
          localStream
            .getTracks()
            .forEach((track) => peerConnection.addTrack(track, localStream));
        }
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("webrtc-offer", { offer, to: newUserId });
      });

      // 4. Receive an offer and respond with an answer
      socket.on("webrtc-offer", async ({ offer, from }) => {
        // Si la conexión ya existe (renegociación), la reusamos. Si no, la creamos.
        let peerConnection = peersRef.current[from];
        if (!peerConnection) {
          peerConnection = createPeerConnection(from, socket);
          peersRef.current[from] = peerConnection;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer),
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("webrtc-answer", { answer, to: from });
      });

      // 5. Receive an answer and establish connection
      socket.on(
        "webrtc-answer",
        async ({
          answer,
          from,
        }: {
          answer: RTCSessionDescriptionInit;
          from: string;
        }) => {
          const peerConnection = peersRef.current[from];
          if (peerConnection) {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(answer),
            );
          }
        },
      );

      // 6. Receive network routes (ICE Candidates)
      // FIX: Changed event name from "webrtc-candidate" to "webrtc-ice-candidate" to match server
      socket.on(
        "webrtc-ice-candidate",
        async ({
          candidate,
          from,
        }: {
          candidate: RTCIceCandidateInit;
          from: string;
        }) => {
          const peerConnection = peersRef.current[from];
          if (peerConnection) {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate),
            );
          }
        },
      );

      // 7. Cleanup when a user disconnects
      socket.on("user-disconnected", (userId: string) => {
        if (peersRef.current[userId]) {
          peersRef.current[userId].close();
          delete peersRef.current[userId];
        }
        setRemoteStreams((prevStreams) =>
          prevStreams.filter((stream) => stream.id !== userId),
        );
      });

      return () => {
        socket.disconnect();
        Object.values(peersRef.current).forEach((peer) => peer.close());
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    // 2. Efecto Sincronizador: Observa tus cámaras y pantallas y las inyecta a la llamada
    useEffect(() => {
      const allStreams = [localStream, screenStream].filter(
        Boolean,
      ) as MediaStream[];
      const currentTrackIds = new Set<string>();

      // Agrega los nuevos videos que hayas encendido
      allStreams.forEach((stream) => {
        stream.getTracks().forEach((track) => {
          currentTrackIds.add(track.id);
          Object.values(peersRef.current).forEach((pc) => {
            const senders = pc.getSenders();
            const alreadySending = senders.some(
              (sender) => sender.track?.id === track.id,
            );
            if (!alreadySending) {
              pc.addTrack(track, stream);
            }
          });
        });
      });

    // Remueve los videos que hayas apagado
    Object.values(peersRef.current).forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && !currentTrackIds.has(sender.track.id)) {
          pc.removeTrack(sender);
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, screenStream]);

  return { remoteStreams };
};
