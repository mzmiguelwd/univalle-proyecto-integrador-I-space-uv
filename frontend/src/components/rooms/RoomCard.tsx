import type { StudyRoom } from "../../config/rooms";

type RoomCardProps = {
  room: StudyRoom;
};

export default function RoomCard({ room }: RoomCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">
        {room.title}
      </h3>

      <p className="mt-2 text-sm text-gray-600">
        {room.topic}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          {room.isActive ? "Activa" : "Inactiva"}
        </span>

        <span className="text-xs text-gray-500">
          {room.createdAt && "toDate" in room.createdAt
            ? room.createdAt.toDate().toLocaleDateString()
            : "Fecha pendiente"}
        </span>
      </div>
    </div>
  );
}