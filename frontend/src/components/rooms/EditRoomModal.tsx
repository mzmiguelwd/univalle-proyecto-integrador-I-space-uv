import { useEffect, useState } from "react";
import { updateStudyRoom, endStudyRoom, type StudyRoom } from "../../config/rooms";
import { X, Loader2, Trash2 } from "lucide-react";

interface Props {
  room: StudyRoom;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void; // callback opcional para cuando se elimina
}

export default function EditRoomModal({ room, isOpen, onClose, onDeleted }: Props) {
  const [formData, setFormData] = useState({
    title: "",
    topic: "",
    limit: "",
    privacy: "",
  });
  const [isLoading, setIsLoading]         = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false); // muestra confirmación

  useEffect(() => {
    if (room) {
      setFormData({
        title:   room.title   || "",
        topic:   room.topic   || "",
        limit:   (room.limit ?? 1).toString(),
        privacy: room.privacy || "Pública",
      });
    }
    // Resetear confirmación al abrir/cambiar sala
    setConfirmDelete(false);
  }, [room, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await updateStudyRoom(room.id, {
        title:   formData.title,
        topic:   formData.topic,
        limit:   parseInt(formData.limit) || 1,
        privacy: formData.privacy,
      });
      onClose();
    } catch (error) {
      console.error("Error al editar:", error);
      alert("Hubo un error al actualizar la sala.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await endStudyRoom(room.id); // marca isActive: false
      onClose();
      onDeleted?.();
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("Hubo un error al eliminar la sala.");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-sky-300">Editar Sala</h2>
          <button
            type="button"
            onClick={() => { setConfirmDelete(false); onClose(); }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario de edición */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Nombre de la sala
            </label>
            <input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white
                         focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tema
            </label>
            <textarea
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white
                         focus:outline-none focus:border-sky-400 transition-colors resize-none"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isDeleting}
            className="w-full bg-sky-300 hover:bg-sky-200 disabled:opacity-50 disabled:cursor-not-allowed
                       text-sky-950 font-bold py-3 rounded-lg transition-colors"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mx-auto h-5 w-5" />
            ) : (
              "Guardar cambios"
            )}
          </button>
        </form>

        {/* Separador */}
        <div className="my-5 border-t border-white/10" />

        {/* Zona de eliminación */}
        {!confirmDelete ? (
          // Botón inicial — pide confirmación
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={isLoading || isDeleting}
            className="w-full flex items-center justify-center gap-2 border border-red-500/30
                       hover:border-red-500/60 hover:bg-red-500/10
                       text-red-400 hover:text-red-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       font-medium py-2.5 rounded-lg transition-all text-sm"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar sala
          </button>
        ) : (
          // Confirmación inline
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 space-y-3">
            <p className="text-sm text-red-200 font-medium">
              ¿Estás seguro? Esta acción cerrará la sala permanentemente.
            </p>
            <p className="text-xs text-red-300/70">
              Los participantes serán desconectados y no podrás reactivarla.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
                className="flex-1 border border-white/10 hover:bg-white/5 text-zinc-300
                           hover:text-white py-2 rounded-lg text-sm font-medium transition-colors
                           disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50
                           disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg
                           text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Sí, eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}