import { useState } from "react";
import { Users, Edit2 } from "lucide-react";
import EditRoomModal from "./EditRoomModal.tsx";
import type { StudyRoom } from "../../config/rooms";
import { useNavigate } from "react-router-dom";
import { auth } from "../../config/firebase.ts";

type RoomCardProps = {
  room: StudyRoom;
};

export default function RoomCard({ room }: RoomCardProps) {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isOwner = auth.currentUser?.uid === room.ownerId;

  // 1. Transformación segura del Timestamp de Firebase a un formato legible
  const formattedDate = room.createdAt
    ? room.createdAt.toDate().toLocaleDateString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recientemente";

  return (
    <article className="relative flex min-h-[150px] flex-col justify-between rounded-xl border border-white/10 bg-[#202020] p-5 shadow-xl transition hover:border-sky-300/40 hover:bg-[#252525]">
      {/* Botón Editar flotante arriba a la derecha */}
      {isOwner && (
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="absolute top-4 right-4 p-2 bg-[#121212] rounded-full text-gray-400 hover:text-sky-300 transition"
        >
          <Edit2 size={16} />
        </button>
      )}

      <div className="flex items-start justify-between gap-4">
        <span className="rounded-md bg-[#4e4635] px-2 py-1 text-xs font-semibold text-[#c0b49e]">
          {room.isActive ? "En curso" : "Inactiva"}
        </span>

        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Users className="h-4 w-4" />
          {/* Muestra el límite configurado al crear la sala (si existe) */}
          <span>1 / {room.limit || "∞"} máx.</span>
        </div>
      </div>

      <div>
        <h3 className="mt-4 text-lg font-semibold text-sky-300">
          {room.title}
        </h3>

        {/* line-clamp-2 recorta el texto con "..." si supera las dos líneas */}
        <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{room.topic}</p>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <time className="text-xs text-zinc-500">Creada: {formattedDate}</time>

        <button
          type="button"
          onClick={() => navigate(`/room/${room.id}`)}
          aria-label={`Unirse a la sala ${room.title}`}
          className="rounded-md bg-[#d2c5af] px-4 py-2 text-xs font-bold text-[#372f20] transition hover:bg-[#e0d3bd]"
        >
          Unirse ahora
        </button>
      </div>

      {/* Renderizado del Modal */}
      <EditRoomModal
        room={room}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </article>
  );
}
