import { Loader2, Trash2 } from "lucide-react";

// TYPES

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  deleteConfirmation: string;
  setDeleteConfirmation: (val: string) => void;
}

// MAIN COMPONENT

export const DeleteAccountModal = ({
  isOpen,
  onClose,
  onConfirm,
  deleting,
  deleteConfirmation,
  setDeleteConfirmation,
}: DeleteAccountModalProps) => {
  if (!isOpen) return null;

  // RENDER

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center bg-transparent p-4"
      aria-labelledby="delete-dialog-title"
    >
      <button
        type="button"
        onClick={onClose}
        tabIndex={-1}
        aria-label="Cerrar ventana"
        className="fixed inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm focus:outline-none"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/20 bg-[#202020] p-6 text-white shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="mb-5">
          <h2
            id="delete-dialog-title"
            className="text-xl font-bold text-red-200"
          >
            Eliminar cuenta permanentemente
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Esta acción es irreversible. Perderás tu identificador de usuario y
            todo el progreso de métricas del entorno de estudio.
          </p>
        </header>

        <div className="mt-5 space-y-1.5">
          <label
            htmlFor="confirm-delete-field"
            className="block text-xs font-semibold text-red-200 cursor-pointer"
          >
            Escribe ELIMINAR para confirmar la baja
          </label>
          <input
            id="confirm-delete-field"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            className="w-full rounded-md border border-white/5 bg-[#181818] px-4 py-3 text-sm text-white outline-none focus:border-red-300"
            placeholder="ELIMINAR"
            autoComplete="off"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting || deleteConfirmation !== "ELIMINAR"}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>Eliminar definitivamente</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};
