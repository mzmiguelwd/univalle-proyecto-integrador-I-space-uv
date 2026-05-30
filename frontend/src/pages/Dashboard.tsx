import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { User } from "firebase/auth";
import {
  LogOut,
  LayoutDashboard,
  Radio,
  User as UserIcon,
  Shield,
  Mail,
  Fingerprint,
  Calendar,
  Clock,
  AtSign,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

import { logoutUser } from "../config/auth.ts";
import { db } from "../config/firebase.ts";

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [socketStatus, setSocketStatus] = useState<string>(
    "Conectando al servidor...",
  );
  const [socketId, setSocketId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Cargando...");
  const [provider, setProvider] = useState<string>("Cargando...");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(
            data.originalUsername || data.username || "No configurado",
          );
          setProvider(data.provider || "desconocido");
        } else {
          setUsername("No configurado");
        }
      } catch (error) {
        console.error("Error al obtener el username desde Firestore:", error);
        setUsername("Error al cargar");
      }
    };

    fetchUserData();
  }, [user.uid]);

  useEffect(() => {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const socket: Socket = io(backendUrl, { withCredentials: true });

    socket.on("connect", () => {
      setSocketStatus("Servidor alcanzable y seguro.");
    });

    socket.on("welcome", (data) => {
      setSocketStatus(data.message);
      setSocketId(data.socketId);
    });

    socket.on("connect_error", () => {
      setSocketStatus(
        "Error al conectar con el servidor. Verifica tu conexión o la configuración del backend.",
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 space-y-8">
        {/* Encabezado Principal */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-white">Space-UV</h1>
              <h2>Bienvenido, @{username}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-blue-400 font-medium flex items-center">
                  @{username}
                </p>
                {/* Etiqueta Visual del Proveedor */}
                {provider === "google" && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white bg-white/10 border border-white/20 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </span>
                )}
                {provider === "email" && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-300 bg-gray-800 border border-gray-700 rounded-full">
                    Email
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logoutUser}
            className="flex items-center gap-2 bg-gray-800 hover:bg-red-900/40 hover:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700 hover:border-red-900"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>

        {/* Sección: Atributos del Objeto User */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <UserIcon className="w-4 h-4 text-blue-400" />
            <span>Atributos de Autenticación (Firebase User Object)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NUEVA TARJETA: Username de Firestore */}
            <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl space-y-1">
              <span className="text-xs text-blue-400 flex items-center gap-1.5 font-mono">
                <AtSign className="w-3.5 h-3.5" /> Username (Firestore DB)
              </span>
              <p className="text-sm font-bold text-white">@{username}</p>
            </div>

            {/* UID */}
            <div className="p-4 bg-gray-800/30 border border-gray-800 rounded-xl space-y-1">
              <span className="text-xs text-gray-500 flex items-center gap-1.5 font-mono">
                <Fingerprint className="w-3.5 h-3.5 text-purple-400" /> UID
                (Identificador Único)
              </span>
              <p className="text-sm font-mono text-gray-200 break-all">
                {user.uid}
              </p>
            </div>

            {/* Email */}
            <div className="p-4 bg-gray-800/30 border border-gray-800 rounded-xl space-y-1">
              <span className="text-xs text-gray-500 flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5 text-blue-400" /> Correo
                Electrónico
              </span>
              <p className="text-sm text-gray-200 font-mono">
                {user.email || "No asociado"}
              </p>
            </div>

            {/* Nombre en Pantalla */}
            <div className="p-4 bg-gray-800/30 border border-gray-800 rounded-xl space-y-1">
              <span className="text-xs text-gray-500 flex items-center gap-1.5 font-mono">
                <UserIcon className="w-3.5 h-3.5 text-orange-400" /> Display
                Name (Auth)
              </span>
              <p className="text-sm text-gray-200">
                {user.displayName || "Sin nombre asignado en Auth"}
              </p>
            </div>

            {/* Verificación de Correo */}
            <div className="p-4 bg-gray-800/30 border border-gray-800 rounded-xl space-y-1">
              <span className="text-xs text-gray-500 flex items-center gap-1.5 font-mono">
                <Shield className="w-3.5 h-3.5 text-green-400" /> Verificación
                de Cuenta
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    user.emailVerified
                      ? "bg-green-950/40 text-green-400 border-green-900/50"
                      : "bg-yellow-950/40 text-yellow-400 border-yellow-900/50"
                  }`}
                >
                  {user.emailVerified
                    ? "Correo Verificado"
                    : "Correo No Verificado"}
                </span>
              </div>
            </div>

            {/* Fecha de Creación */}
            <div className="p-4 bg-gray-800/30 border border-gray-800 rounded-xl space-y-1">
              <span className="text-xs text-gray-500 flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-teal-400" /> Fecha de
                Registro
              </span>
              <p className="text-sm text-gray-200">
                {user.metadata.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleString()
                  : "N/A"}
              </p>
            </div>

            {/* Último Inicio de Sesión */}
            <div className="p-4 bg-gray-800/30 border border-gray-800 rounded-xl space-y-1">
              <span className="text-xs text-gray-500 flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-pink-400" /> Último Acceso
                Detectado
              </span>
              <p className="text-sm text-gray-200">
                {user.metadata.lastSignInTime
                  ? new Date(user.metadata.lastSignInTime).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Sección: Estado de WebSockets */}
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Radio className="w-4 h-4 text-green-400 animate-pulse" />
            <span>Estado del Backend (WebSockets)</span>
          </div>
          <p className="text-sm text-green-400 font-medium bg-green-950/30 p-3 rounded-lg border border-green-900/40">
            🟢 {socketStatus}
          </p>
          {socketId && (
            <p className="text-xs text-gray-500 font-mono pl-1">
              ID de transmisión asignado:{" "}
              <span className="text-gray-400">{socketId}</span>
            </p>
          )}
        </div>

        {/* Sección de Depuración Avanzada (JSON Completo Ocultable/Colapsable) */}
        <div className="space-y-2">
          <details className="group border border-gray-800 rounded-xl bg-gray-950/40 overflow-hidden transition-all">
            <summary className="flex items-center justify-between p-4 text-xs font-mono text-gray-500 cursor-pointer hover:text-gray-300 select-none">
              <span>[Inspeccionar Objeto JSON Completo]</span>
              <span className="transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <div className="p-4 border-t border-gray-800 bg-gray-950 text-xs font-mono text-gray-400 overflow-x-auto max-h-60">
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
