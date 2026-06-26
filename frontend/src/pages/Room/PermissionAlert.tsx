import { AlertTriangle, X } from "lucide-react";

// INTERFACES

interface PermissionAlertProps {
  error: string | null;
  onClose: () => void;
}

// MAIN COMPONENT

export default function PermissionAlert({
  error,
  onClose,
}: Readonly<PermissionAlertProps>) {
  if (!error) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="absolute left-1/2 top-16 z-50 flex -translate-x-1/2 transform items-center gap-4 rounded-xl border border-red-400 bg-red-600/90 px-6 py-3 text-white shadow-2xl backdrop-blur-sm animate-in slide-in-from-top-4"
    >
      <AlertTriangle
        className="h-5 w-5 shrink-0 text-red-200"
        aria-hidden="true"
      />

      <span className="text-sm font-medium">{error}</span>

      <button
        type="button"
        onClick={onClose}
        title="Cerrar alerta"
        aria-label="Cerrar alerta"
        className="rounded-lg p-1 transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
