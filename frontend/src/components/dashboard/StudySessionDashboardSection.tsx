import icon5 from "../../assets/landing/icon-2.svg";
import icon6 from "../../assets/landing/icon-2.svg";
import icon7 from "../../assets/landing/icon-2.svg";
import icon8 from "../../assets/landing/icon-2.svg";

import { type UserProfile } from "../../config/auth";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../config/firebase";

import { useEffect, useState } from "react";
import RoomCard from "../rooms/RoomCard";
import RoomsEmptyState from "../rooms/RoomsEmptyState";
import {
  subscribeToOwnStudyRooms,
  getRoomById,
  type StudyRoom,
} from "../../config/rooms";

const recentActivity = [
  {
    id: "marta",
    icon: icon5,
    iconWrapperClass: "bg-[#4e4635]",
    iconSizeClass: "w-[22px] h-4",
    content: (
      <p className="mt-[-1.00px] [font-family:'Hanken_Grotesk-Bold',Helvetica] font-normal text-transparent text-base leading-6 relative w-fit tracking-[0]">
        <span className="font-bold text-[#e5e2e1]">Marta G.</span>
        <span className="[font-family:'Hanken_Grotesk-Regular',Helvetica] text-[#e5e2e1]">
          {" "}se unió a
        </span>
        <span className="[font-family:'Hanken_Grotesk-SemiBold',Helvetica] font-semibold text-[#8ecdfd]">
          <br />Cálculo Avanzado
        </span>
      </p>
    ),
    time: "Hace 15 minutos",
  },
  {
    id: "deep-work",
    icon: icon6,
    iconWrapperClass: "bg-[#5797c44c]",
    iconSizeClass: "w-[18px] h-[21px]",
    content: (
      <p className="mt-[-1.00px] [font-family:'Hanken_Grotesk-Regular',Helvetica] font-normal text-[#e5e2e1] text-base leading-6 relative w-fit tracking-[0]">
        <span>Completaste una sesión <br />de </span>
        <span className="[font-family:'Hanken_Grotesk-Bold',Helvetica] font-bold">Deep Work</span>
        <span> de 50 min</span>
      </p>
    ),
    time: "Hace 2 horas",
  },
  {
    id: "luis",
    icon: icon7,
    iconWrapperClass: "bg-[#be8639]",
    iconSizeClass: "w-5 h-5",
    content: (
      <p className="relative w-fit mt-[-1.00px] [font-family:'Hanken_Grotesk-Bold',Helvetica] font-normal text-transparent text-base tracking-[0] leading-6">
        <span className="font-bold text-[#e5e2e1]">Luis P.</span>
        <span className="[font-family:'Hanken_Grotesk-Regular',Helvetica] text-[#e5e2e1]">
          {" "}envió un mensaje <br />en{" "}
        </span>
        <span className="[font-family:'Hanken_Grotesk-SemiBold',Helvetica] font-semibold text-[#8ecdfd]">
          Taller de Tesis
        </span>
      </p>
    ),
    time: "Hace 4 horas",
  },
  {
    id: "meta-diaria",
    icon: icon8,
    iconWrapperClass: "bg-[#4e4635]",
    iconSizeClass: "w-[18px] h-[18px]",
    content: (
      <p className="relative w-fit mt-[-1.00px] [font-family:'Hanken_Grotesk-Regular',Helvetica] font-normal text-[#e5e2e1] text-base tracking-[0] leading-6">
        ¡Has alcanzado tu{" "}
        <span className="font-bold">meta <br /> diaria</span>!
      </p>
    ),
    time: "Ayer",
  },
];

type JoinStatus = "idle" | "checking" | "not_found" | "inactive" | "error";

type Props = {
  profile: UserProfile | null;
};

export const StudySessionDashboardSection = ({ profile }: Props) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) { setRooms([]); setIsLoadingRooms(false); return; }

    const unsubscribe = subscribeToOwnStudyRooms(
      currentUser.uid,
      (updatedRooms) => { setRooms(updatedRooms); setIsLoadingRooms(false); },
      (error) => { console.error("Error escuchando salas:", error); setRooms([]); setIsLoadingRooms(false); },
    );
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { navigate("/login"); return; }
      navigate("/create-room");
    } catch (error) {
      console.error("Error creando sala:", error);
    }
  };

  // ── Validación antes de unirse ─────────────────────────────
  const handleJoinRoom = async () => {
    const id = roomIdToJoin.trim();
    if (!id) return;

    setJoinStatus("checking");

    try {
      const room = await getRoomById(id);

      if (!room) {
        // getRoomById devuelve null si no existe O si isActive === false
        // Verificamos cuál es el caso para dar mejor feedback
        setJoinStatus("not_found");
        return;
      }

      // Sala existe y está activa → navegar
      navigate(`/room/${id}`);
    } catch {
      setJoinStatus("error");
    }
  };

  // Limpiar error al editar el input
  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomIdToJoin(e.target.value);
    if (joinStatus !== "idle") setJoinStatus("idle");
  };

  // Mensajes de feedback por estado
  const joinFeedback: Record<Exclude<JoinStatus, "idle" | "checking">, { text: string; color: string }> = {
    not_found: { text: "No se encontró ninguna sala activa con ese ID.", color: "text-red-400"  },
    inactive:  { text: "Esta sala ya no está activa.",                   color: "text-amber-400"},
    error:     { text: "Ocurrió un error. Intenta de nuevo.",            color: "text-red-400"  },
  };

  return (
    <section
      aria-label="Panel de sesión de estudio"
      className="flex-1 px-5 py-8 md:px-10 lg:px-14 bg-[#131313]"
    >
      {/* HEADER */}
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sky-200">
            ¡Hola, {profile?.name || "Usuario"}! Listo para una sesión?
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Has completado 12 horas de estudio esta semana. Mantén el ritmo.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#202020] px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </header>

      {/* GRID */}
      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">

        {/* ACTIVE ROOMS */}
        <section className="xl:row-[1_/_2] xl:col-[1_/_3] w-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="[font-family:'Literata-Regular',Helvetica] text-[#e5e2e1]">
              Mis salas activas
            </h2>
            <button type="button" className="[font-family:'Hanken_Grotesk-Regular',Helvetica] text-[#8ecdfd]">
              Ver todo
            </button>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {isLoadingRooms ? (
              <div className="rounded-xl border border-white/10 bg-[#202020] p-6 text-sm text-zinc-400">
                Cargando salas...
              </div>
            ) : rooms.length > 0 ? (
              rooms.map((room) => <RoomCard key={room.id} room={room} />)
            ) : (
              <RoomsEmptyState />
            )}
          </div>

          {/* CTA */}
          <aside className="rounded-lg bg-sky-300 p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-bold text-lg text-sky-950">¿Necesitas concentrarte ya?</h3>
              <p className="text-sky-900/80">Inicia una sesión ahora</p>
            </div>
            <button
              type="button"
              onClick={handleCreateRoom}
              className="rounded-lg bg-zinc-950 px-6 py-3 font-semibold text-sky-300 transition hover:bg-black"
            >
              Iniciar ya!
            </button>
          </aside>

          {/* JOIN BY ID */}
          <div className="rounded-lg bg-[#202020] p-6 border border-white/10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold">¿Tienes un código de sala?</h3>
              <p className="text-sm text-zinc-400">Únete a la sesión de un amigo ingresando su ID</p>
            </div>

            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ID de la sala"
                  value={roomIdToJoin}
                  onChange={handleRoomIdChange}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  disabled={joinStatus === "checking"}
                  className={`bg-[#131313] border rounded-lg px-4 py-2 text-white text-sm
                              focus:outline-none flex-1 sm:w-48 transition-colors
                              disabled:opacity-50
                              ${joinStatus === "not_found" || joinStatus === "error"
                                ? "border-red-500/50 focus:border-red-500/70"
                                : "border-white/10 focus:border-sky-400"
                              }`}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomIdToJoin.trim() || joinStatus === "checking"}
                  className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-sky-400
                             text-sky-950 font-semibold px-6 py-2 rounded-lg text-sm transition-colors
                             flex items-center gap-2 min-w-[90px] justify-center"
                >
                  {joinStatus === "checking" ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Buscando
                    </>
                  ) : "Unirse"}
                </button>
              </div>

              {/* Feedback de error */}
              {joinStatus !== "idle" && joinStatus !== "checking" && (
                <p className={`text-xs flex items-center gap-1.5 ${joinFeedback[joinStatus].color}`}>
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {joinFeedback[joinStatus].text}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ACTIVITY */}
        <aside className="xl:col-[3_/_4] flex flex-col gap-4">
          <h2 className="text-[#e5e2e1]">Actividad reciente</h2>

          <div className="rounded-lg bg-[#202020] p-6 shadow-xl">
            {recentActivity.map((activity, index) => (
              <article key={activity.id} className={`flex gap-4 py-4 ${index > 0 ? "border-t border-[#40484e1a]" : ""}`}>
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${activity.iconWrapperClass}`}>
                  <img src={activity.icon} className={activity.iconSizeClass} alt="" />
                </div>
                <div>
                  {activity.content}
                  <time className="text-[#8a9199] text-base">{activity.time}</time>
                </div>
              </article>
            ))}
          </div>

          {/* PROGRESS */}
          <section className="p-6 bg-[#2a2a2a] rounded-lg border border-[#40484e1a]">
            <h3 className="text-[#e5e2e1]">Meta de enfoque diario</h3>
            <div className="mt-3 h-2 rounded-full bg-zinc-700">
              <div className="h-2 w-[75%] rounded-full bg-amber-400" />
            </div>
            <div className="flex justify-between text-[#c0c7cf]">
              <span>4.5h / 6h</span>
              <span className="text-[#d2c5af]">75% completado</span>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
};
