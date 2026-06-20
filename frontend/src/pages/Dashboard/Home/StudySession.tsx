import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { LogOut, Plus, LogIn, Loader2, AlertCircle } from "lucide-react";

import { auth } from "../../../config/firebase";
import { type UserProfile } from "../../../config/auth";
import {
  subscribeToOwnStudyRooms,
  getRoomById,
  type StudyRoom,
} from "../../../config/rooms";
import RoomCard from "./RoomCard";
import RoomsEmptyState from "./RoomsEmptyState";

type JoinStatus = "idle" | "checking" | "not_found" | "inactive" | "error";

interface Props {
  profile: UserProfile | null;
}

export const StudySession = ({ profile }: Props) => {
  const navigate = useNavigate();

  // State

  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");

  // Effects

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setRooms([]);
      setIsLoadingRooms(false);
      return;
    }

    const unsubscribe = subscribeToOwnStudyRooms(
      currentUser.uid,
      (updatedRooms) => {
        setRooms(updatedRooms);
        setIsLoadingRooms(false);
      },
      (error) => {
        console.error("Error escuchando salas:", error);
        setRooms([]);
        setIsLoadingRooms(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Handlers

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleCreateRoom = () => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }
    navigate("/create-room");
  };

  const handleJoinRoom = async () => {
    const id = roomIdToJoin.trim();
    if (!id) return;

    setJoinStatus("checking");

    try {
      const room = await getRoomById(id);
      if (!room) {
        setJoinStatus("not_found");
        return;
      }
      navigate(`/room/${id}`);
    } catch {
      setJoinStatus("error");
    }
  };

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomIdToJoin(e.target.value);
    if (joinStatus !== "idle") setJoinStatus("idle");
  };

  // Feedback Config

  const joinFeedback: Record<
    Exclude<JoinStatus, "idle" | "checking">,
    { text: string; color: string }
  > = {
    not_found: {
      text: "No se encontró ninguna sala activa con este código.",
      color: "text-red-400",
    },
    inactive: { text: "Esta sala ya fue finalizada.", color: "text-amber-400" },
    error: {
      text: "Ocurrió un error de conexión. Intenta de nuevo.",
      color: "text-red-400",
    },
  };

  // Render

  return (
    <section
      aria-label="Panel de sesión de estudio"
      className="flex-1 flex flex-col h-screen overflow-y-auto px-5 py-8 md:px-10 lg:px-14 bg-[#131313]"
    >
      {/* ── HEADER ── */}
      <header className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            ¡Hola,{" "}
            <span className="text-sky-400">
              {profile?.name?.split(" ")[0] || "Usuario"}
            </span>
            !
          </h1>
          <p className="text-zinc-400 mt-1">
            ¿Listo para una reunión de estudio?
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </button>
      </header>

      {/* ── QUICK ACTIONS (CREATE / JOIN) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* ACTION: Create Room (Primary Action) */}
        <article className="rounded-2xl bg-sky-500/10 border border-sky-800/50 p-6 flex flex-col transition-all hover:border-sky-500/50 shadow-lg shadow-sky-500/5 hover:shadow-xl hover:shadow-sky-500/20">
          <div className="flex items-center gap-4 mb-5 flex-1">
            <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/30">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl text-white truncate">
                Nueva reunión
              </h3>
              <p className="text-sm text-sky-200/80 truncate">
                Crea una sala y comparte el código.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateRoom}
            className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-sky-950 px-4 py-3 font-bold transition-colors shadow-md shadow-sky-500/20"
          >
            Crear sala ahora
          </button>
        </article>

        {/* ACTION: Join Room (Secondary Action) */}
        <article className="rounded-2xl bg-[#1A1A1A] border border-gray-800 p-6 flex flex-col transition-all hover:border-gray-700">
          <div className="flex items-center gap-4 mb-5 flex-1">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
              <LogIn className="w-6 h-6 text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl text-white truncate">
                Unirse a una reunión
              </h3>
              <p className="text-sm text-gray-400 truncate">
                Ingresa el código que te compartieron.
              </p>
            </div>
          </div>

          {/* ── ALIGNED INPUT ROW WITH ABSOLUTE ERROR ── */}
          <div className="relative flex items-center gap-2 w-full">
            <input
              type="text"
              placeholder="Ej. abc-123-xyz"
              value={roomIdToJoin}
              onChange={handleRoomIdChange}
              onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              disabled={joinStatus === "checking"}
              className={`flex-1 bg-[#121212] border rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors disabled:opacity-50 ${
                joinStatus !== "idle" && joinStatus !== "checking"
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-gray-700 focus:border-sky-500"
              }`}
            />
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={!roomIdToJoin.trim() || joinStatus === "checking"}
              className="bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50 disabled:hover:bg-zinc-800 px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center min-w-[100px]"
            >
              {joinStatus === "checking" ? (
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              ) : (
                "Ingresar"
              )}
            </button>

            {/* Floating Error Message */}
            {joinStatus !== "idle" && joinStatus !== "checking" && (
              <p
                className={`absolute top-full left-2 mt-0.75 text-[11px] flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in duration-200 ${joinFeedback[joinStatus].color}`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {joinFeedback[joinStatus].text}
              </p>
            )}
          </div>
        </article>
      </div>

      {/* ── ACTIVE ROOMS GRID ── */}
      <section className="flex flex-col gap-5 flex-1 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Tus salas activas
          </h2>
          {rooms.length > 0 && (
            <span className="text-xs font-medium text-gray-400 bg-gray-800/50 px-2.5 py-1 rounded-full">
              {rooms.length} {rooms.length === 1 ? "sala" : "salas"}
            </span>
          )}
        </div>

        <div className="grid w-full grid-cols-1 gap-3">
          {isLoadingRooms ? (
            <div className="rounded-2xl border border-gray-800 bg-[#1A1A1A] p-8 flex items-center justify-center col-span-full">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                <span className="text-sm font-medium">
                  Cargando tu historial...
                </span>
              </div>
            </div>
          ) : rooms.length > 0 ? (
            rooms.map((room) => <RoomCard key={room.id} room={room} />)
          ) : (
            <div className="col-span-full">
              <RoomsEmptyState />
            </div>
          )}
        </div>
      </section>
    </section>
  );
};
