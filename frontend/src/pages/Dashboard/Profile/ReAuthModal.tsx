import { useState, type SyntheticEvent } from "react";
import { AlertTriangle, Loader2, LockKeyhole } from "lucide-react";

import {
  getCurrentUserProvider,
  reauthenticateWithGoogle,
  reauthenticateWithPassword,
} from "../../../config/auth.ts";

import FocusTrap from "./FocusTrap.tsx";

// TYPES

interface ReAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

// MAIN COMPONENT

export default function ReAuthModal({
  isOpen,
  onClose,
  onSuccess,
}: Readonly<ReAuthModalProps>) {
  // STATES
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const provider = getCurrentUserProvider();

  // HANDLERS

  const handleReAuth = async (event?: SyntheticEvent<HTMLFormElement>) => {
    if (event) {
      event.preventDefault();
    }

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
    } catch (error: unknown) {
      console.error("Error during reauthentication process:", error);

      const isAuthError =
        typeof error === "object" && error !== null && "code" in error;

      if (isAuthError) {
        const authErrorCode = (error as Record<string, unknown>).code;

        if (authErrorCode === "auth/wrong-password") {
          setErrorMessage("La contraseña no es correcta.");
          return;
        }

        if (authErrorCode === "auth/popup-closed-by-user") {
          setErrorMessage(
            "La ventana de Google fue cerrada antes de terminar.",
          );
          return;
        }
      }

      setErrorMessage(
        "No pudimos verificar tu identidad. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  // RENDER

  return (
    <dialog
      open
      aria-labelledby="reauth-modal-title"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-w-none items-center justify-center bg-transparent p-4"
    >
      {/* BACKDROP LAYER */}
      <button
        type="button"
        onClick={onClose}
        tabIndex={-1}
        aria-label="Cerrar modal"
        className="fixed inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 focus:outline-none"
      />

      {/* MODAL CONTENT */}
      <div className="relative z-10 w-full max-w-md">
        <FocusTrap isActive={isOpen} onEscape={onClose}>
          <div className="w-full rounded-2xl border border-white/10 bg-[#202020] p-6 text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <header className="mb-5 flex items-start gap-4">
              <div className="rounded-xl bg-amber-400/10 p-3 text-amber-300">
                <LockKeyhole className="h-6 w-6 shrink-0" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="reauth-modal-title"
                  className="text-xl font-bold text-sky-200"
                >
                  Verifica tu identidad
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Por seguridad, necesitamos confirmar que eres tú antes de
                  continuar con esta acción.
                </p>
              </div>
            </header>

            <form onSubmit={handleReAuth} noValidate className="space-y-4">
              {provider === "google" ? (
                <div className="rounded-xl border border-white/10 bg-[#181818] p-4 text-sm text-zinc-300">
                  Se abrirá una ventana de Google para confirmar tu sesión.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label
                    htmlFor="reauth-password"
                    className="block cursor-pointer text-xs font-semibold text-sky-300"
                  >
                    Contraseña
                  </label>
                  <input
                    id="reauth-password"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage("");
                    }}
                    className="w-full rounded-md border border-white/5 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-sky-300 focus-visible:ring-1 focus-visible:ring-sky-300"
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                  />
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200"
                >
                  <AlertTriangle
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{errorMessage}</span>
                </div>
              )}

              <footer className="mt-6 flex flex-col gap-3 sm:flex-row pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-sky-300 px-4 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-sky-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  {loading && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {provider === "google"
                      ? "Continuar con Google"
                      : "Confirmar"}
                  </span>
                </button>
              </footer>
            </form>
          </div>
        </FocusTrap>
      </div>
    </dialog>
  );
}
