import { useEffect, useState } from "react";
import { X, Loader2, Trash2, AlertCircle } from "lucide-react";

import {
  updateStudyRoom,
  endStudyRoom,
  type StudyRoom,
} from "../../../config/rooms.ts";

// TYPES

interface EditRoomModalProps {
  room: StudyRoom;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

// MAIN COMPONENT

export default function EditRoomModal({
  room,
  isOpen,
  onClose,
  onDeleted,
}: Readonly<EditRoomModalProps>) {
  // STATE
  const [formData, setFormData] = useState({
    title: "",
    topic: "",
    limit: "",
    privacy: "Pública",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // EFFECTS

  useEffect(() => {
    if (room && isOpen) {
      const timeoutId = setTimeout(() => {
        setFormData({
          title: room.title || "",
          topic: room.topic || "",
          limit: (room.limit ?? 1).toString(),
          privacy: room.privacy || "Pública",
        });
        setConfirmDelete(false);
        setError(null);
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [room, isOpen]);

  // Early return if modal is closed
  if (!isOpen) return null;

  // HANDLERS

  const handleClose = () => {
    setConfirmDelete(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await updateStudyRoom(room.id, {
        title: formData.title.trim(),
        topic: formData.topic.trim(),
        limit: Number.parseInt(formData.limit, 10) || 1,
        privacy: formData.privacy,
      });
      handleClose();
    } catch (err: unknown) {
      console.error("Error al editar la sala:", err);
      setError("Hubo un error al actualizar la sala.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await endStudyRoom(room.id);
      handleClose();
      onDeleted?.();
    } catch (err: unknown) {
      console.error("Error al eliminar la sala:", err);
      setError("Hubo un error al eliminar la sala.");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  // DYNAMIC CONTENT

  let deleteZoneContent;

  if (confirmDelete) {
    deleteZoneContent = (
      <div className="space-y-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 animate-in fade-in zoom-in-95 duration-200">
        <p className="text-sm font-medium text-red-200">
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
            className="flex-1 rounded-lg border border-white/10 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-2 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1C1C]"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Sí, eliminar</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  } else {
    deleteZoneContent = (
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        disabled={isLoading || isDeleting}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 py-2.5 text-sm font-medium text-red-400 transition-all hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Eliminar sala</span>
      </button>
    );
  }

  // RENDER

  return (
    <dialog
      open
      aria-labelledby="edit-modal-title"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center bg-transparent p-4"
    >
      {/*  BACKDROP LAYER */}
      <button
        type="button"
        onClick={handleClose}
        tabIndex={-1}
        aria-label="Cerrar modal"
        className="fixed inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 focus:outline-none"
      />

      {/* MODAL CONTENT */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-800 bg-[#1C1C1C] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* HEADER */}
        <header className="mb-6 flex items-center justify-between">
          <h2 id="edit-modal-title" className="text-xl font-bold text-sky-300">
            Editar Sala
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar modal"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* GLOBAL ERROR BANNER */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-in fade-in"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="room-title"
              className="block cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-zinc-400"
            >
              Nombre de la sala
            </label>
            <input
              id="room-title"
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded-lg border border-gray-700 bg-[#121212] p-3 text-white transition-colors focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/20"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="room-topic"
              className="block cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-zinc-400"
            >
              Tema
            </label>
            <textarea
              id="room-topic"
              value={formData.topic}
              onChange={(e) =>
                setFormData({ ...formData, topic: e.target.value })
              }
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-700 bg-[#121212] p-3 text-white transition-colors focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/20"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isDeleting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-300 py-3 font-bold text-sky-950 transition-colors hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1C1C]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Guardando...</span>
              </>
            ) : (
              "Guardar cambios"
            )}
          </button>
        </form>

        {/* SEPARATOR */}
        <div className="my-5 border-t border-white/10" aria-hidden="true" />

        {/* DELETION ZONE */}
        {deleteZoneContent}
      </div>
    </dialog>
  );
}
