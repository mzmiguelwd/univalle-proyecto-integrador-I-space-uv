import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { LogOut, Plus, LogIn, Loader2, AlertCircle } from "lucide-react";

import { auth } from "../../../config/firebase.ts";
import { type UserProfile } from "../../../config/auth.ts";
import {
  subscribeToOwnStudyRooms,
  getRoomById,
  type StudyRoom,
} from "../../../config/rooms.ts";

import RoomCard from "./RoomCard.tsx";
import RoomsEmptyState from "./RoomsEmptyState.tsx";

// TYPES

type JoinStatus = "idle" | "checking" | "not_found" | "inactive" | "error";

interface StudySessionProps {
  profile: UserProfile | null;
}

// CONSTANTS

const JOIN_FEEDBACK_MESSAGES: Record<
  Exclude<JoinStatus, "idle" | "checking">,
  { text: string; color: string }
> = {
  not_found: {
    text: "No se encontró ninguna sala activa con este código.",
    color: "text-red-400",
  },
  inactive: {
    text: "Esta sala ya fue finalizada.",
    color: "text-amber-400",
  },
  error: {
    text: "Ocurrió un error de conexión. Intenta de nuevo.",
    color: "text-red-400",
  },
};

// MAIN COMPONENT

export default function StudySession({ profile }: Readonly<StudySessionProps>) {
  const navigate = useNavigate();

  // STATE
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");

  // EFFECTS

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      const timeoutId = setTimeout(() => {
        setRooms([]);
        setIsLoadingRooms(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const unsubscribe = subscribeToOwnStudyRooms(
      currentUser.uid,
      (updatedRooms) => {
        setRooms(updatedRooms);
        setIsLoadingRooms(false);
      },
      (error: unknown) => {
        console.error("Error listening to study rooms:", error);
        setRooms([]);
        setIsLoadingRooms(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // HANDLERS

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error("Error joining room:", error);
      setJoinStatus("error");
    }
  };

  const handleRoomIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRoomIdToJoin(event.target.value);
    if (joinStatus !== "idle") setJoinStatus("idle");
  };

  // DERIVED STATE

  const firstName = profile?.name?.split(" ")[0] || "Usuario";
  const roomCount = rooms.length;

  // FEEDBACK MESSAGES

  let activeFeedback = null;
  if (
    joinStatus === "not_found" ||
    joinStatus === "inactive" ||
    joinStatus === "error"
  ) {
    activeFeedback = JOIN_FEEDBACK_MESSAGES[joinStatus];
  }
  const isErrorStatus = activeFeedback !== null;

  // UI

  let roomsContent;
  if (isLoadingRooms) {
    roomsContent = (
      <div className="col-span-full flex items-center justify-center rounded-2xl border border-gray-800 bg-[#1A1A1A] p-8">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2
            className="h-6 w-6 animate-spin text-sky-500"
            aria-hidden="true"
          />
          <span className="text-sm font-medium">Cargando tu historial...</span>
        </div>
      </div>
    );
  } else if (roomCount > 0) {
    roomsContent = rooms.map((room) => <RoomCard key={room.id} room={room} />);
  } else {
    roomsContent = (
      <div className="col-span-full">
        <RoomsEmptyState />
      </div>
    );
  }

  // RENDER

  return (
    <section
      aria-label="Panel de sesión de estudio"
      className="flex h-screen flex-1 flex-col overflow-y-auto bg-[#131313] px-5 py-8 md:px-10 lg:px-14"
    >
      {/* HEADER */}
      <header className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Hola, <span className="text-sky-400">{firstName}</span>!
          </h1>
          <p className="mt-1 text-zinc-400">
            ¿Listo para una reunión de estudio?
          </p>
        </div>

        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </header>

      {/* QUICK ACTIONS (CREATE / JOIN) */}
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* ACTION: CREATE ROOM */}
        <article className="flex flex-col rounded-2xl border border-sky-800/50 bg-sky-500/10 p-6 shadow-lg shadow-sky-500/5 transition-all hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/20">
          <div className="mb-5 flex flex-1 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-500 shadow-lg shadow-sky-500/30">
              <Plus className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-bold text-white">
                Nueva reunión
              </h3>
              <p className="truncate text-sm text-sky-200/80">
                Crea una sala y comparte el código.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateRoom}
            className="w-full rounded-xl bg-sky-500 px-4 py-3 font-bold text-sky-950 shadow-md shadow-sky-500/20 transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313]"
          >
            Crear sala ahora
          </button>
        </article>

        {/* ACTION: JOIN ROOM */}
        <article className="flex flex-col rounded-2xl border border-gray-800 bg-[#1A1A1A] p-6 transition-all hover:border-gray-700">
          <div className="mb-5 flex flex-1 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-800">
              <LogIn className="h-6 w-6 text-gray-300" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-bold text-white">
                Unirse a una reunión
              </h3>
              <p className="truncate text-sm text-gray-400">
                Ingresa el código que te compartieron.
              </p>
            </div>
          </div>

          {/* ALIGNED INPUT ROW */}
          <div className="relative flex w-full items-center gap-2">
            <input
              type="text"
              placeholder="Ej. abc-123-xyz"
              value={roomIdToJoin}
              onChange={handleRoomIdChange}
              onKeyDown={(event) => event.key === "Enter" && handleJoinRoom()}
              disabled={joinStatus === "checking"}
              aria-invalid={isErrorStatus}
              className={`flex-1 rounded-xl border bg-[#121212] px-4 py-3 text-sm text-white transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                isErrorStatus
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-gray-700 focus:border-sky-500"
              }`}
            />
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={!roomIdToJoin.trim() || joinStatus === "checking"}
              className="flex min-w-25 items-center justify-center rounded-xl bg-zinc-800 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-800"
            >
              {joinStatus === "checking" ? (
                <Loader2
                  className="h-5 w-5 animate-spin text-sky-400"
                  aria-hidden="true"
                />
              ) : (
                "Ingresar"
              )}
            </button>

            {/* FLOATING ERROR MESSAGE */}
            {activeFeedback && (
              <p
                aria-live="polite"
                className={`absolute left-2 top-full mt-1.5 flex animate-in fade-in slide-in-from-top-1 items-center gap-1.5 text-[11px] duration-200 ${activeFeedback.color}`}
              >
                <AlertCircle
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                {activeFeedback.text}
              </p>
            )}
          </div>
        </article>
      </div>

      {/* ACTIVE ROOMS GRID */}
      <section className="flex flex-1 flex-col gap-5 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Tus salas activas
          </h2>
          {roomCount > 0 && (
            <span className="rounded-full bg-gray-800/50 px-2.5 py-1 text-xs font-medium text-gray-400">
              {roomCount} {roomCount === 1 ? "sala" : "salas"}
            </span>
          )}
        </div>

        <div className="grid w-full grid-cols-1 gap-3">{roomsContent}</div>
      </section>
    </section>
  );
}
