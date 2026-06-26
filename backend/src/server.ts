import express, { type Application } from "express";
import http from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { ExpressPeerServer } from "peer";

import setupSwagger from "./docs/swaggerConfig";

// Load environment variables early
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
}

// Data attached to each specific socket session
export interface SocketData extends UserPayload, UserMediaState {
  roomId: string;
}

// Events the Server emits TO the Client
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

  // Manual WebRTC Signaling (Used if bypassing PeerJS for specific streams)
  "webrtc-offer": (payload: { offer: any; from: string }) => void;
  "webrtc-answer": (payload: { answer: any; from: string }) => void;
  "webrtc-ice-candidate": (payload: { candidate: any; from: string }) => void;
}

// Events the Client emits TO the Server
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

// Environment Parsing: Ensures safe fallback and string sanitization
const rawClientUrl = process.env.CLIENT_URL?.trim() || "";
const cleanClientUrl = rawClientUrl.endsWith("/")
  ? rawClientUrl.slice(0, -1)
  : rawClientUrl;

// CORS Configuration: Dynamic validation for Dev (localhost) & Prod (Vite deployment)
const allowedOrigins = ["http://localhost:5173"];
if (cleanClientUrl && !allowedOrigins.includes(cleanClientUrl)) {
  allowedOrigins.push(cleanClientUrl);
}

const corsOptions: cors.CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (e.g., mobile apps, curl) or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(
      `[CORS Warning] Blocked request from unauthorized origin: ${origin}`,
    );
    callback(new Error("CORS policy violation"), false);
  },
  methods: ["GET", "POST"],
  credentials: true,
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Healthcheck endpoint (Crucial for AWS, Docker, or Render to know if the app is alive)
app.get("/health", (_req, res) =>
  res.status(200).send({ status: "ok", timestamp: new Date() }),
);
setupSwagger(app, PORT);

// SERVER INITIALIZATION

const server = http.createServer(app);

// Initialize Socket.IO with strict types (Allowing natural Polling -> WebSocket upgrade)
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  never,
  SocketData
>(server, {
  cors: corsOptions,
});

// Initialize PeerJS Server
const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: true,
});

app.use("/peerjs", peerServer);

// PEERJS HANDLERS

peerServer.on("connection", (client) => {
  console.info(`[PeerJS] Client connected - PeerID: ${client.getId()}`);
});

peerServer.on("disconnect", (client) => {
  console.info(`[PeerJS] Client disconnected - PeerID: ${client.getId()}`);
});

// SOCKET.IO HANDLERS

io.on("connection", (socket) => {
  console.info(`[Socket.IO] New connection established: ${socket.id}`);

  // 1. Join Room & State Initialization
  // Handles the "Late Joiner" problem by syncing the current room state.
  socket.on("join-room", async ({ roomId, user }) => {
    socket.join(roomId);

    // Attach user data directly to the socket session for easy retrieval later
    socket.data = {
      roomId,
      ...user,
      micOn: true, // Default state assumption
      camOn: true, // Default state assumption
      isScreenSharing: false,
    };

    console.info(
      `[Socket.IO] User ${user.name} (${socket.id}) joined room ${roomId}`,
    );

    // Broadcast to others in the room that a new user joined
    socket.to(roomId).emit("user-connected", {
      socketId: socket.id,
      name: user.name,
      avatar: user.avatar,
      peerId: user.peerId,
      micOn: socket.data.micOn,
      camOn: socket.data.camOn,
      isScreenSharing: socket.data.isScreenSharing,
    });

    try {
      // Gather current participants to send to the newly joined user
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
      console.debug(
        `[Socket.IO] Sent ${existingUsers.length} existing users to ${socket.id}`,
      );
    } catch (error) {
      console.error(
        `[Socket.IO] Error fetching sockets for room ${roomId}:`,
        error,
      );
    }
  });

  // 2. Media Controls Synchronization
  socket.on("media-state", ({ roomId, micOn, camOn }) => {
    // Update the server-side source of truth
    socket.data.micOn = micOn;
    socket.data.camOn = camOn;

    // Broadcast the new state to the rest of the room
    socket
      .to(roomId)
      .emit("media-state", { socketId: socket.id, micOn, camOn });
    console.debug(
      `[Socket.IO] Media state updated for ${socket.id} - Mic: ${micOn}, Cam: ${camOn}`,
    );
  });

  socket.on("screen-share-started", ({ roomId }) => {
    socket.data.isScreenSharing = true;
    socket.to(roomId).emit("screen-share-started", { socketId: socket.id });
    console.info(
      `[Socket.IO] User ${socket.id} started screen sharing in room ${roomId}`,
    );
  });

  socket.on("screen-share-stopped", ({ roomId }) => {
    socket.data.isScreenSharing = false;
    socket.to(roomId).emit("screen-share-stopped", { socketId: socket.id });
    console.info(
      `[Socket.IO] User ${socket.id} stopped screen sharing in room ${roomId}`,
    );
  });

  socket.on("camera-stopped", ({ roomId }) => {
    socket.data.camOn = false;
    socket.to(roomId).emit("camera-stopped", { socketId: socket.id });
  });

  // 3. Room Management
  socket.on("end-room", ({ roomId }) => {
    console.warn(
      `[Socket.IO] Host (${socket.id}) requested to end room: ${roomId}`,
    );
    socket.to(roomId).emit("room-ended");
  });

  // 4. Manual WebRTC Signaling (Fallback/Custom implementations)
  socket.on("webrtc-offer", ({ offer, to }) => {
    socket.to(to).emit("webrtc-offer", { offer, from: socket.id });
  });

  socket.on("webrtc-answer", ({ answer, to }) => {
    socket.to(to).emit("webrtc-answer", { answer, from: socket.id });
  });

  socket.on("webrtc-ice-candidate", ({ candidate, to }) => {
    socket.to(to).emit("webrtc-ice-candidate", { candidate, from: socket.id });
  });

  // 5. Disconnection Handling
  // 'disconnecting' is fired BEFORE the socket leaves its rooms
  socket.on("disconnecting", () => {
    const { roomId, peerId } = socket.data;
    if (roomId && peerId) {
      socket.to(roomId).emit("user-disconnected", socket.id, peerId);
      console.info(
        `[Socket.IO] Emitted user-disconnected for ${socket.id} in room ${roomId}`,
      );
    }
  });

  // 'disconnect' is fired AFTER the socket has fully left
  socket.on("disconnect", (reason) => {
    console.info(
      `[Socket.IO] User disconnected: ${socket.id}. Reason: ${reason}`,
    );
  });
});

// START SERVER

server.listen(PORT, () => {
  console.info(`===================================================`);
  console.info(`🚀 Signaling Server is running on port ${PORT}`);
  console.info(`🌐 PeerJS Server is active at http://localhost:${PORT}/peerjs`);
  console.info(`🛡️  Allowed CORS Origins:`, allowedOrigins);
  console.info(`===================================================`);
});
