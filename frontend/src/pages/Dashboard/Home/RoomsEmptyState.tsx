import { LayoutGrid } from "lucide-react";

// MAIN COMPONENT

export default function RoomsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-[#1A1A1A]/50 px-6 py-12 text-center">
      {/* ICON CONTAINER */}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800/50">
        <LayoutGrid className="h-7 w-7 text-gray-500" aria-hidden="true" />
      </div>

      {/* TEXT CONTENT */}
      <h3 className="text-lg font-semibold text-white">
        No tienes salas activas
      </h3>
      <p className="mt-2 max-w-sm text-sm text-gray-400">
        Crea tu primera sala de estudio para comenzar a colaborar.
      </p>
    </div>
  );
}
