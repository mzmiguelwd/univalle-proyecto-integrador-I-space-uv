import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

import { auth, db } from "./config/firebase.ts";

function App() {
  const [backendStatus, setBackendStatus] = useState<string>("Conectando...");
  const [socketId, setSocketId] = useState<string | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<string>(
    "Conectando a Firebase...",
  );

  useEffect(() => {
    if (auth && db) {
      setFirebaseStatus("Conectado (Auth y Firestore listos)");
    } else {
      setFirebaseStatus("Error al conectar con Firebase");
    }

    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const socket: Socket = io(backendUrl);

    socket.on("connect", () => {
      setBackendStatus("Conectado al backend");
    });

    socket.on("welcome", (data) => {
      setBackendStatus(data.message);
      setSocketId(data.socketId);
    });

    socket.on("connect_error", () => {
      setBackendStatus("Error al conectar con el backend");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Salón de Estudio Colaborativo
          </h1>
          <p className="text-gray-400">
            Dashboard de Diagnóstico de Arquitectura
          </p>
        </div>

        <div className="space-y-4">
          {/* Tarjeta Frontend */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 font-medium">
                Cliente (React + Vite)
              </p>
              <p className="font-semibold text-blue-400">
                🟢 Renderizando correctamente
              </p>
            </div>
            <div className="text-3xl">⚛️</div>
          </div>

          {/* Tarjeta Firebase */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 font-medium">
                BaaS (Firebase)
              </p>
              <p className="font-semibold text-yellow-400">{firebaseStatus}</p>
            </div>
            <div className="text-3xl">🔥</div>
          </div>

          {/* Tarjeta Backend */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400 font-medium">
                Servidor (Node.js + Socket.io)
              </p>
              <div className="text-3xl">⚙️</div>
            </div>
            <p className="font-semibold text-green-400">{backendStatus}</p>
            {socketId && (
              <p className="text-xs text-gray-500 mt-1 font-mono">
                Socket ID asignado: {socketId}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
