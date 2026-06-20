export default function RoomsEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
      <h3 className="text-lg font-semibold">
        No tienes salas activas
      </h3>

      <p className="mt-2 text-sm text-gray-600">
        Crea tu primera sala de estudio para comenzar.
      </p>
    </div>
  );
}