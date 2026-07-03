import { AlertTriangle, Loader2 } from "lucide-react";
import FocusTrap from "../Dashboard/Profile/FocusTrap.tsx";

// INTERFACES

interface LeaveModalProps {
  isOpen: boolean;
  isOwner: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onLeave: () => void;
  onEndForAll: () => void;
}

// MAIN COMPONENT

export default function LeaveModal({
  isOpen,
  isOwner,
  isProcessing,
  onClose,
  onLeave,
  onEndForAll,
}: Readonly<LeaveModalProps>) {
  if (!isOpen) return null;

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="leave-modal-title"
      aria-describedby="leave-modal-description"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center bg-transparent p-4"
    >
      {/* BACKDROP LAYER */}
      <button
        type="button"
        onClick={onClose}
        disabled={isProcessing}
        tabIndex={-1}
        aria-label="Cerrar modal de confirmación"
        className="fixed inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 focus:outline-none"
      />

      {/* MODAL CONTENT */}
      <div className="relative z-10 w-full max-w-sm">
        <FocusTrap isActive={isOpen} onEscape={onClose}>
          <div className="w-full rounded-2xl border border-gray-800 bg-[#1C1C1C] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <header className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-3 text-red-500">
                <AlertTriangle
                  className="h-6 w-6 shrink-0"
                  aria-hidden="true"
                />
              </div>
              <h2
                id="leave-modal-title"
                className="text-lg font-bold text-white"
              >
                ¿Salir de la sala?
              </h2>
            </header>

            <p
              id="leave-modal-description"
              className="mb-6 text-sm text-gray-400"
            >
              {isOwner
                ? "Como anfitrión, puedes salir en silencio o finalizar la llamada para todos. El chat y la sala seguirán guardados."
                : "Estás a punto de abandonar esta sesión de estudio."}
            </p>

            <div className="flex flex-col gap-3">
              {isOwner && (
                <button
                  type="button"
                  onClick={onEndForAll}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  {isProcessing && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {isProcessing
                      ? "Desconectando..."
                      : "Finalizar llamada para todos"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onLeave}
                disabled={isProcessing}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ${
                  isOwner
                    ? "bg-[#2A2A2A] text-white hover:bg-gray-700 focus-visible:ring-gray-400"
                    : "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400"
                }`}
              >
                Solo salir de la llamada
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="mt-2 w-full rounded-xl border border-gray-700 bg-transparent px-4 py-3 font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        </FocusTrap>
      </div>
    </dialog>
  );
}
