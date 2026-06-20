import express, { Application } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { ExpressPeerServer } from "peer";

import setupSwagger from "./docs/swaggerConfig";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

const rawClientUrl = process.env.CLIENT_URL || "";
const cleanClientUrl = rawClientUrl.endsWith("/")
  ? rawClientUrl.slice(0, -1)
  : rawClientUrl;

const allowedOrigins = ["http://localhost:5173"];
if (cleanClientUrl) allowedOrigins.push(cleanClientUrl);

const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS request blocked from origin: ${origin}`);
    callback(new Error("CORS not allowed"), false);
  },
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
setupSwagger(app, PORT);

// Initialize HTTP server and WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
});

const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: true,
});

app.use("/peerjs", peerServer);

peerServer.on("connection", (client) => {
  console.log(`PeerJS: Cliente conectado con PeerID: ${client.getId()}`);
});

peerServer.on("disconnect", (client) => {
  console.log(`PeerJS: Cliente desconectado: ${client.getId()}`);
});

// Listening for WebSocket connections (Socket.IO)
io.on("connection", (socket: Socket) => {
  console.log(`Usuario conectado (Socket.IO): ${socket.id}`);

  socket.on("join-room", async ({ roomId, user }) => {
    console.log("join-room payload:", { socketId: socket.id, roomId, user });
    socket.join(roomId);
    console.log(
      `Socket ${socket.id} se unió a la sala ${roomId} con PeerID: ${user.peerId}`,
    );

    socket.data.roomId = roomId;
    socket.data.peerId = user.peerId;
    socket.data.name = user.name;
    socket.data.avatar = user.avatar;
    console.log(`socket.data para ${socket.id}:`, socket.data);

    socket.to(roomId).emit("user-connected", {
      socketId: socket.id,
      name: user.name,
      avatar: user.avatar,
      peerId: user.peerId,
    });

    const sockets = await io.in(roomId).fetchSockets();
    console.log(`Sockets en la sala ${roomId}:`, sockets.map((s) => ({ id: s.id, data: s.data })));
    const existingUsers = sockets
      .filter((s) => s.id !== socket.id)
      .map((s) => ({
        socketId: s.id,
        name: s.data.name || "Usuario",
        avatar: s.data.avatar || null,
        peerId: s.data.peerId,
      }));

    console.log(`Enviando room-users a ${socket.id}:`, existingUsers);
    socket.emit("room-users", existingUsers);
  });

  // Permite al cliente solicitar explícitamente la lista de participantes
  socket.on("request-presence", async ({ roomId }) => {
    console.log(`Solicitud de presencia recibida desde ${socket.id} para sala ${roomId}`);
    try {
      const sockets = await io.in(roomId).fetchSockets();
      console.log(`Sockets actualmente en ${roomId}:`, sockets.map((s)=>({id: s.id, data: s.data}))); 
      const existingUsers = sockets
        .filter((s) => s.id !== socket.id)
        .map((s) => ({
          socketId: s.id,
          name: s.data.name || "Usuario",
          avatar: s.data.avatar || null,
          peerId: s.data.peerId,
        }));

      console.log(`Enviando ${existingUsers.length} participantes a ${socket.id} para la sala ${roomId}`);
      socket.emit("room-users", existingUsers);
    } catch (err) {
      console.error("Error fetching presence for room:", err);
    }
  });

  socket.on("media-state", ({ roomId, micOn, camOn }) => {
    // Re-emitir a todos en la sala excepto al emisor
    socket.to(roomId).emit("media-state", {
      socketId: socket.id,
      micOn,
      camOn,
    });
  });
  
  socket.on("end-room", async ({ roomId }) => {
    console.log(`Anfitrión (${socket.id}) finalizó la sala: ${roomId}`);
    socket.to(roomId).emit("room-ended");
  });

  socket.on("disconnecting", () => {
    const roomId = socket.data.roomId;
    const peerId = socket.data.peerId;
    console.log(`disconnecting: socket=${socket.id} room=${roomId} peerId=${peerId} socket.data=`, socket.data);
    if (roomId) {
      socket.to(roomId).emit("user-disconnected", socket.id, peerId);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Usuario desconectado (Socket.IO): ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
  console.log(`Servidor PeerJS activo en http://localhost:${PORT}/peerjs`);
});
