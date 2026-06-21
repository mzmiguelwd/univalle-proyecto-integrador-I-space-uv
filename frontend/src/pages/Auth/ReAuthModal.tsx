import { useState } from "react";
import { AlertTriangle, Loader2, LockKeyhole } from "lucide-react";
import {
  getCurrentUserProvider,
  reauthenticateWithGoogle,
  reauthenticateWithPassword,
} from "../../config/auth";
import FocusTrap from "./FocusTrap";

type ReAuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
};

export default function ReAuthModal({
  isOpen,
  onClose,
  onSuccess,
}: ReAuthModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const provider = getCurrentUserProvider();

  const handleReAuth = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      if (provider === "google") {
        await reauthenticateWithGoogle();
      } else {
        if (!password.trim()) {
          setErrorMessage("Ingresa tu contraseña para continuar.");
          return;
        }

        await reauthenticateWithPassword(password);
      }

      await onSuccess();
      setPassword("");
      onClose();
    } catch (error: any) {
      console.error(error);

      if (error?.code === "auth/wrong-password") {
        setErrorMessage("La contraseña no es correcta.");
        return;
      }

      if (error?.code === "auth/popup-closed-by-user") {
        setErrorMessage("La ventana de Google fue cerrada antes de terminar.");
        return;
      }

      setErrorMessage(
        "No pudimos verificar tu identidad. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <FocusTrap isActive={isOpen} onEscape={onClose}>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#202020] p-6 text-white shadow-2xl">
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-xl bg-amber-400/10 p-3 text-amber-300">
              <LockKeyhole className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-sky-200">
                Verifica tu identidad
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Por seguridad, necesitamos confirmar que eres tú antes de
                continuar con esta acción.
              </p>
            </div>
          </div>

          {provider === "google" ? (
            <div className="rounded-xl border border-white/10 bg-[#181818] p-4 text-sm text-zinc-300">
              Se abrirá una ventana de Google para confirmar tu sesión.
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-xs font-semibold text-sky-300">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
                className="w-full rounded-md border border-white/5 bg-[#181818] px-4 py-3 text-sm outline-none transition focus:border-sky-300"
                placeholder="Ingresa tu contraseña"
              />
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleReAuth}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-sky-300 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-sky-200 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {provider === "google" ? "Continuar con Google" : "Confirmar"}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
