import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Edit2, LogIn, Clock } from "lucide-react";

import { auth } from "../../../config/firebase.ts";
import type { StudyRoom } from "../../../config/rooms.ts";

import EditRoomModal from "./EditRoomModal.tsx";

// TYPES

export interface RoomCardProps {
  room: StudyRoom;
}

// UTILS

/**
 * Formats the Firestore timestamp into a localized string.
 */
const formatRoomDate = (timestamp?: { toDate: () => Date }): string => {
  if (!timestamp) return "Recientemente";

  return timestamp.toDate().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// MAIN COMPONENT

export default function RoomCard({ room }: Readonly<RoomCardProps>) {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isOwner = auth.currentUser?.uid === room.ownerId;
  const formattedDate = formatRoomDate(room.createdAt);

  return (
    <article className="group flex w-full flex-col items-start justify-between gap-4 rounded-2xl border border-gray-800 bg-[#1A1A1A] p-4 transition-all hover:border-sky-500/50 hover:bg-[#1E1E1E] sm:flex-row sm:items-center">
      {/* LEFT: MAIN INFO */}
      <div className="flex w-full min-w-0 flex-1 items-center gap-4 sm:w-auto">
        {/* STATUS INDICATOR */}
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-gray-700 bg-[#252525]">
          <div
            className={`mb-1 h-2 w-2 rounded-full ${
              room.isActive
                ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                : "bg-gray-500"
            }`}
            aria-hidden="true"
          />
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
            {room.isActive ? "ON" : "OFF"}
          </span>
        </div>

        {/* TEXT INFO */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3
              className="truncate text-base font-bold text-sky-200"
              title={room.title}
            >
              {room.title}
            </h3>
            {isOwner && (
              <span className="shrink-0 rounded border border-sky-800 bg-sky-900/40 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-sky-400">
                Anfitrión
              </span>
            )}
          </div>
          <p className="truncate text-sm text-gray-400" title={room.topic}>
            {room.topic || "Sin descripción"}
          </p>
        </div>
      </div>

      {/* RIGHT: METADATA & ACTIONS */}
      <div className="flex w-full items-center justify-between gap-6 border-t border-gray-800 pt-3 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
        {/* METADATA */}
        <div className="hidden items-center gap-4 border-r border-gray-800 pr-6 text-xs text-gray-500 sm:flex">
          <div
            className="flex items-center gap-1.5"
            title="Capacidad de la sala"
          >
            <Users className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>1 / {room.limit || "∞"}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Fecha de creación">
            <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              aria-label="Editar sala"
              className="rounded-xl border border-transparent bg-[#252525] p-2.5 text-gray-400 transition-colors hover:border-gray-700 hover:bg-[#2A2A2A] hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <Edit2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <button
            onClick={() => navigate(`/room/${room.id}`)}
            aria-label={`Unirse a la sala ${room.title}`}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 font-bold text-sky-950 transition-all hover:bg-sky-400 hover:shadow-lg hover:shadow-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A]"
          >
            <span>Unirse</span>
            <LogIn className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* MODAL */}
      {isEditModalOpen && (
        <EditRoomModal
          room={room}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </article>
  );
}
