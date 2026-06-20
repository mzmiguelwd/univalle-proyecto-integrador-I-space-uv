import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Edit2, LogIn, Clock } from "lucide-react";

import { auth } from "../../../config/firebase.ts";
import type { StudyRoom } from "../../../config/rooms.ts";

import EditRoomModal from "./EditRoomModal.tsx";

type RoomCardProps = {
  room: StudyRoom;
};

export default function RoomCard({ room }: RoomCardProps) {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isOwner = auth.currentUser?.uid === room.ownerId;

  const formattedDate = room.createdAt
    ? room.createdAt.toDate().toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recientemente";

  return (
    <article className="w-full group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-[#1A1A1A] p-4 transition-all hover:border-sky-500/50 hover:bg-[#1E1E1E]">
      {/* ── LEFT: MAIN INFO ── */}
      <div className="flex-1 min-w-0 flex items-center gap-4 w-full sm:w-auto">
        {/* Status Indicator */}
        <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#252525] border border-gray-700">
          <div
            className={`w-2 h-2 rounded-full mb-1 ${room.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-500"}`}
          />
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
            {room.isActive ? "ON" : "OFF"}
          </span>
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className="text-base font-bold text-sky-200 truncate"
              title={room.title}
            >
              {room.title}
            </h3>
            {isOwner && (
              <span className="shrink-0 bg-sky-900/40 text-sky-400 text-[9px] px-1.5 py-0.5 rounded border border-sky-800 uppercase tracking-widest">
                Anfitrión
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate" title={room.topic}>
            {room.topic || "Sin descripción"}
          </p>
        </div>
      </div>

      {/* ── RIGHT: METADATA & ACTIONS ── */}
      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-gray-800 pt-3 sm:pt-0">
        {/* Metadata (Hidden on very small screens, flex on sm) */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 border-r border-gray-800 pr-6">
          <div
            className="flex items-center gap-1.5"
            title="Capacidad de la sala"
          >
            <Users className="w-4 h-4 text-gray-400" />
            <span>1 / {room.limit || "∞"}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Fecha de creación">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              aria-label="Editar sala"
              className="p-2.5 rounded-xl bg-[#252525] text-gray-400 hover:text-sky-300 hover:bg-[#2A2A2A] transition-colors border border-transparent hover:border-gray-700"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => navigate(`/room/${room.id}`)}
            aria-label={`Unirse a ${room.title}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-sky-950 font-bold transition-all hover:bg-sky-400 hover:shadow-lg hover:shadow-sky-500/20"
          >
            <span>Unirse</span>
            <LogIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── MODAL ── */}
      <EditRoomModal
        room={room}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </article>
  );
}
