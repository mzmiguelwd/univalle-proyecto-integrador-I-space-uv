import express, { Application } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { ExpressPeerServer } from "peer";

import setupSwagger from "./docs/swaggerConfig";

dotenv.config();

// INTERFACES

export interface UserMediaState {
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
}

export interface UserPayload {
  name: string;
  avatar: string | null;
  peerId: string;
  // FIX #8: 'uid' era enviado por el cliente pero no declarado aquí.
  // Se añade como opcional para no romper el contrato del tipo pero
  // permitir que el cliente lo envíe sin errores de TypeScript.
  uid?: string;
}

export interface SocketData extends UserPayload, UserMediaState {
  roomId: string;
}

export interface ServerToClientEvents {
  "user-connected": (
    payload: UserPayload & { socketId: string } & UserMediaState,
  ) => void;
  "user-disconnected": (socketId: string, peerId: string) => void;
  "room-users": (
    users: (UserPayload & { socketId: string } & UserMediaState)[],
  ) => void;
  "media-state": (payload: {
    socketId: string;
    micOn: boolean;
    camOn: boolean;
  }) => void;
  "screen-share-started": (payload: { socketId: string }) => void;
  "screen-share-stopped": (payload: { socketId: string }) => void;
  "camera-stopped": (payload: { socketId: string }) => void;
  "room-ended": () => void;

  // Manual WebRTC Signaling (If bypassing PeerJS for specific streams)
  "webrtc-offer": (payload: { offer: any; from: string }) => void;
  "webrtc-answer": (payload: { answer: any; from: string }) => void;
  "webrtc-ice-candidate": (payload: { candidate: any; from: string }) => void;
}

export interface ClientToServerEvents {
  "join-room": (payload: { roomId: string; user: UserPayload }) => void;
  "request-presence": (payload: { roomId: string }) => void;
  "media-state": (payload: {
    roomId: string;
    micOn: boolean;
    camOn: boolean;
  }) => void;
  "screen-share-started": (payload: { roomId: string }) => void;
  "screen-share-stopped": (payload: { roomId: string }) => void;
  "camera-stopped": (payload: { roomId: string }) => void;
  "end-room": (payload: { roomId: string }) => void;

  // Manual WebRTC Signaling
  "webrtc-offer": (payload: { offer: any; to: string }) => void;
  "webrtc-answer": (payload: { answer: any; to: string }) => void;
  "webrtc-ice-candidate": (payload: { candidate: any; to: string }) => void;
}

// CONFIGURATION

const app: Application = express();
const PORT = process.env.PORT || 3000;

const rawClientUrl = process.env.CLIENT_URL || "";
const cleanClientUrl = rawClientUrl.endsWith("/")
  ? rawClientUrl.slice(0, -1)
  : rawClientUrl;

const allowedOrigins = ["http://localhost:5173"];
if (cleanClientUrl) allowedOrigins.push(cleanClientUrl);

const corsOptions: cors.CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Request blocked from origin: ${origin}`);
    callback(new Error("CORS not allowed"), false);
  },
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => res.send({ status: "ok" }));

// Docs endpoint
setupSwagger(app, PORT);

// SERVER INITIALIZATION

const server = http.createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  never,
  SocketData
>(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
});

// PeerJS Server Initialization
const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: true,
});

app.use("/peerjs", peerServer);

peerServer.on("connection", (client) => {
  console.log(`[PeerJS] Client connected - PeerID: ${client.getId()}`);
});

peerServer.on("disconnect", (client) => {
  console.log(`[PeerJS] Client disconnected - PeerID: ${client.getId()}`);
});

// SOCKET.IO HANDLERS

io.on("connection", (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  // Join Room & State Initialization
  socket.on("join-room", async ({ roomId, user }) => {
    socket.join(roomId);

    // Initialize default media state for the new user
    socket.data = {
      roomId,
      ...user,
      micOn: true,
      camOn: true,
      isScreenSharing: false,
    };

    console.log(
      `[Socket] ${socket.id} joined room ${roomId} (PeerID: ${user.peerId})`,
    );

    // Notify others that a new user joined, sending their initial media state
    socket.to(roomId).emit("user-connected", {
      socketId: socket.id,
      name: user.name,
      avatar: user.avatar,
      peerId: user.peerId,
      micOn: socket.data.micOn,
      camOn: socket.data.camOn,
      isScreenSharing: socket.data.isScreenSharing,
    });

    // Send the curernt state of ALL existing users to the new joiner
    const sockets = await io.in(roomId).fetchSockets();
    const existingUsers = sockets
      .filter((s) => s.id !== socket.id)
      .map((s) => ({
        socketId: s.id,
        name: s.data.name || "Unknown User",
        avatar: s.data.avatar || null,
        peerId: s.data.peerId,
        micOn: s.data.micOn ?? true,
        camOn: s.data.camOn ?? true,
        isScreenSharing: s.data.isScreenSharing ?? false,
      }));

    socket.emit("room-users", existingUsers);
  });

  // Presence & State Synchronization
  socket.on("request-presence", async ({ roomId }) => {
    try {
      const sockets = await io.in(roomId).fetchSockets();
      const existingUsers = sockets
        .filter((s) => s.id !== socket.id)
        .map((s) => ({
          socketId: s.id,
          name: s.data.name || "Unknown User",
          avatar: s.data.avatar || null,
          peerId: s.data.peerId,
          micOn: s.data.micOn ?? true,
          camOn: s.data.camOn ?? true,
          isScreenSharing: s.data.isScreenSharing ?? false,
        }));

      socket.emit("room-users", existingUsers);
    } catch (err) {
      console.error(
        `[Socket] Error fetching presence for room ${roomId}:`,
        err,
      );
    }
  });

  // Media Controls Update
  socket.on("media-state", ({ roomId, micOn, camOn }) => {
    // Update server-side state
    socket.data.micOn = micOn;
    socket.data.camOn = camOn;

    // Broadcast to room
    socket
      .to(roomId)
      .emit("media-state", { socketId: socket.id, micOn, camOn });
  });

  socket.on("screen-share-started", ({ roomId }) => {
    socket.data.isScreenSharing = true;
    // FIX #10: Emitir socketId explícito para que el cliente pueda
    // mapear el evento al participante correcto en su estado local
    socket.to(roomId).emit("screen-share-started", { socketId: socket.id });
  });

  socket.on("screen-share-stopped", ({ roomId }) => {
    socket.data.isScreenSharing = false;
    socket.to(roomId).emit("screen-share-stopped", { socketId: socket.id });
  });

  socket.on("camera-stopped", ({ roomId }) => {
    socket.data.camOn = false;
    socket.to(roomId).emit("camera-stopped", { socketId: socket.id });
  });

  // Room Management
  socket.on("end-room", ({ roomId }) => {
    console.log(`[Socket] Host (${socket.id}) ended room: ${roomId}`);
    socket.to(roomId).emit("room-ended");
  });

  // Manual WebRTS Signaling (Offers/Answers/ICE Candidates)
  socket.on("webrtc-offer", ({ offer, to }) => {
    socket.to(to).emit("webrtc-offer", { offer, from: socket.id });
  });

  socket.on("webrtc-answer", ({ answer, to }) => {
    socket.to(to).emit("webrtc-answer", { answer, from: socket.id });
  });

  socket.on("webrtc-ice-candidate", ({ candidate, to }) => {
    socket.to(to).emit("webrtc-ice-candidate", { candidate, from: socket.id });
  });

  // Disconnection Handling
  socket.on("disconnecting", () => {
    const { roomId, peerId } = socket.data;
    if (roomId && peerId) {
      socket.to(roomId).emit("user-disconnected", socket.id, peerId);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

// START SERVER

server.listen(PORT, () => {
  console.log(`[Server] Backend running on port ${PORT}`);
  console.log(`[Server] PeerJS active at http://localhost:${PORT}/peerjs`);
});
