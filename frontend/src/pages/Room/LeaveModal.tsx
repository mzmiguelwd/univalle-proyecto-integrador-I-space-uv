import { AlertTriangle } from "lucide-react";

interface LeaveModalProps {
  isOpen: boolean;
  isOwner: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onLeave: () => void;
  onEndForAll: () => void;
}

export default function LeaveModal({
  isOpen,
  isOwner,
  isProcessing,
  onClose,
  onLeave,
  onEndForAll,
}: LeaveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">¿Salir de la sala?</h3>
        </div>

        <p className="text-sm text-gray-400 mb-6">
          {isOwner
            ? "Como anfitrión, puedes salir en silencio o finalizar la llamada para todos. El chat y la sala seguirán guardados."
            : "Estás a punto de abandonar esta sesión de estudio."}
        </p>

        <div className="flex flex-col gap-3">
          {isOwner && (
            <button
              onClick={onEndForAll}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isProcessing
                ? "Desconectando..."
                : "Finalizar llamada para todos"}
            </button>
          )}
          <button
            onClick={onLeave}
            disabled={isProcessing}
            className={`w-full py-3 px-4 font-bold rounded-xl transition-colors ${
              isOwner
                ? "bg-[#2A2A2A] text-white hover:bg-gray-700"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            Solo salir de la llamada
          </button>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium rounded-xl transition-colors mt-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
