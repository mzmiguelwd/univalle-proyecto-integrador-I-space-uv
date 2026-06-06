import express, { Application } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import setupSwagger from "./docs/swaggerConfig";

// Load environment variables from .env file
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

const rawClientUrl = process.env.CLIENT_URL || "";
const cleanClientUrl = rawClientUrl.endsWith("/")
  ? rawClientUrl.slice(0, -1)
  : rawClientUrl;

// CORS configuration
const corsOptions = {
  origin: ["http://localhost:5173", cleanClientUrl],
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Setup Swagger documentation
setupSwagger(app, PORT);

// Initialize HTTP server and WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Listen for WebSocket connections
io.on("connection", (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send a localized welcome message back to the client
  socket.emit("welcome", {
    status: "success",
    message: "Conectado exitosamente al servidor Node.js con Socket.IO",
    socketId: socket.id,
  });

  // --- ROOMS & WEBRTC LOGIC ---

  // 1. User joins a specific room
  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    // Notify others in the room that a new user has joined
    socket.to(roomId).emit("user-connected", socket.id);
  });

  // 2. Offer exchange (Call initiator)
  socket.on("webrtc-offer", ({ offer, to }: { offer: any; to: string }) => {
    // Relay the offer to the specific recipient
    socket.to(to).emit("webrtc-offer", { offer, from: socket.id });
  });

  // 3. Answer exchange (Call receiver)
  socket.on("webrtc-answer", ({ answer, to }: { answer: any; to: string }) => {
    // Relay the answer back to the offer initiator
    socket.to(to).emit("webrtc-answer", { answer, from: socket.id });
  });

  // 4. ICE Candidates exchange (Network routing)
  socket.on(
    "webrtc-ice-candidate",
    ({ candidate, to }: { candidate: any; to: string }) => {
      // Relay the network paths to establish Peer-to-Peer connection
      socket
        .to(to)
        .emit("webrtc-ice-candidate", { candidate, from: socket.id });
    },
  );

  // 5. Handle disconnections
  // Using 'disconnecting' instead of 'disconnect' to access the rooms the socket belongs to before leaving
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        // Notify everyone in the room that this user is leaving
        socket.to(room).emit("user-disconnected", socket.id);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
