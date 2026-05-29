import express, { Application } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";

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
};

app.use(cors(corsOptions));
app.use(express.json());

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Space-UV API",
      version: "1.0.0",
      description: "Documentacion de la API para autenticacion y usuarios",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
  },
  apis: ["src/routes/*.ts", "src/routes/*.js", "dist/routes/*.js"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Initialization of the HTTP server and WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Listening for WebSocket connections
io.on("connection", (socket: Socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  socket.emit("welcome", {
    status: "success",
    message: "Conectado exitosamente al servidor Node.js con Socket.IO",
    socketId: socket.id,
  });

  socket.on("disconnect", () => {
    console.log(`Usuario desconectado: ${socket.id}`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
