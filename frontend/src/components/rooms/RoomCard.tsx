import { Users } from "lucide-react";
import type { StudyRoom } from "../../config/rooms";

type RoomCardProps = {
  room: StudyRoom;
};

export default function RoomCard({ room }: RoomCardProps) {
  const createdAt =
    room.createdAt && "toDate" in room.createdAt
      ? room.createdAt.toDate().toLocaleDateString()
      : "Fecha pendiente";

  return (
    <article className="flex min-h-[150px] flex-col justify-between rounded-xl border border-white/10 bg-[#202020] p-5 shadow-xl transition hover:border-sky-300/40 hover:bg-[#252525]">
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-md bg-[#4e4635] px-2 py-1 text-xs font-semibold text-[#c0b49e]">
          {room.isActive ? "En curso" : "Inactiva"}
        </span>

        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Users className="h-4 w-4" />
          <span>1 persona</span>
        </div>
      </div>

      <div>
        <h3 className="mt-4 text-lg font-semibold text-sky-300">
          {room.title}
        </h3>

        <p className="mt-1 text-sm text-zinc-400">
          {room.topic}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <time className="text-xs text-zinc-500">
          Creada: {createdAt}
        </time>

        <button
        type="button"
        aria-label={`Unirse a la sala ${room.title}`}
        className="rounded-md bg-[#d2c5af] px-4 py-2 text-xs font-bold text-[#372f20] transition hover:bg-[#e0d3bd]"
        >
        Unirse ahora
        </button>
      </div>
    </article>
  );
}