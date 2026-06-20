import { AlertTriangle } from "lucide-react";

interface PermissionAlertProps {
  error: string | null;
  onClose: () => void;
}

export default function PermissionAlert({
  error,
  onClose,
}: PermissionAlertProps) {
  if (!error) return null;

  return (
    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-600/90 border border-red-400 text-white px-6 py-3 rounded-xl z-50 flex items-center gap-4 shadow-2xl backdrop-blur-sm animate-in slide-in-from-top-4">
      <AlertTriangle className="w-5 h-5 text-red-200 shrink-0" />
      <span className="text-sm font-medium">{error}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-red-700 rounded-lg transition-colors"
      >
        <span className="sr-only">Cerrar</span>
        <div className="w-4 h-4 flex items-center justify-center font-bold">
          ✕
        </div>
      </button>
    </div>
  );
}
