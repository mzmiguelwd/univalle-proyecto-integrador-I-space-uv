import { useState, useCallback } from "react";
import {
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  } from "lucide-react";

import { auth } from "../../config/firebase.ts";
import { checkUsernameAvailability, saveUsername } from "../../config/auth.ts";

interface SetupProfileProps {
  onComplete: () => void;
}

// SUB-COMPONENTS

const DesktopHeroPanel = () => (
  <div
    className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
    style={{ backgroundImage: "url('/study-focus.png')" }}
  >
    <div className="absolute inset-0 bg-linear-to-br from-[#0d0f14]/75 via-[#0d0f14]/45 to-transparent" />
    <div className="relative z-10 flex flex-col justify-between p-10 w-full">
      <h1 className="text-3xl font-bold text-[#5ab4e8] tracking-tight font-serif select-none">
        Space UV
      </h1>
      <blockquote className="text-white/75 text-lg italic font-light leading-relaxed max-w-sm">
        "La concentración es la raíz de todas las facultades del hombre."
      </blockquote>
    </div>
  </div>
);

const MobileHeroPanel = () => (
  <div
    className="lg:hidden relative rounded-2xl overflow-hidden mb-8 h-32 sm:h-40 bg-cover bg-center"
    style={{ backgroundImage: "url('/study-focus.png')" }}
  >
    <div className="absolute inset-0 bg-[#0d0f14]/60" />
    <div className="relative z-10 flex items-center justify-center h-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#5ab4e8] font-serif tracking-tight select-none">
        Space UV
      </h1>
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// MAIN COMPONENT

export default function SetupProfile({
  onComplete,
}: Readonly<SetupProfileProps>) {
  // FORM STATE
  const [username, setUsername] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );

  // UI STATE
  const [usernameError, setUsernameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // CURRENT USER INFO
  const googlePhoto = auth.currentUser?.photoURL;
  const googleName = auth.currentUser?.displayName || "Usuario";

  // HANDLERS

  const handleUsernameChange = useCallback(async (value: string) => {
    const clean = value.replace(/\W/g, "").toLowerCase();
    setUsername(clean);
    setUsernameAvailable(null);
    setUsernameError("");

    if (clean.length === 0) return;
    if (clean.length < 3) {
      setUsernameError("Mínimo 3 caracteres.");
      return;
    }
    if (clean.length > 20) {
      setUsernameError("Máximo 20 caracteres.");
      return;
    }

    setUsernameChecking(true);
    try {
      const available = await checkUsernameAvailability(clean);
      setUsernameAvailable(available);
      if (!available) setUsernameError("Este usuario ya está en uso.");
    } catch {
      setUsernameError("No se pudo verificar. Intenta de nuevo.");
    } finally {
      setUsernameChecking(false);
    }
  }, []);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (username.length < 3 || usernameAvailable !== true) {
      setError("Elige un nombre de usuario válido y disponible.");
      return;
    }

    setIsSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado.");

      await saveUsername(currentUser.uid, username.trim());
      onComplete();
    } catch (error: unknown) {
      console.error("Error setting up profile:", error);
      setError("Error al guardar el nombre de usuario. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // DYNAMIC STYLES

  let usernameValidationStyles =
    "border-white/10 focus:border-[#5ab4e8]/60 focus:ring-[#5ab4e8]/20";
  if (usernameAvailable === false) {
    usernameValidationStyles =
      "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20";
  } else if (usernameAvailable === true) {
    usernameValidationStyles =
      "border-green-500/50 focus:border-green-500/70 focus:ring-green-500/20";
  }

  // RENDER

  return (
    <main className="min-h-screen flex bg-[#0d0f14]">
      <DesktopHeroPanel />

      <section className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 sm:px-8 lg:px-12 overflow-y-auto">
        <div className="w-full max-w-md animate-in fade-in duration-500">
          <MobileHeroPanel />

          {/* USER PROFILE PREVIEW */}
          <header className="mb-6 sm:mb-8 flex items-center gap-4">
            <div className="relative shrink-0">
              {googlePhoto ? (
                <img
                  src={googlePhoto}
                  alt={`Foto de perfil de ${googleName}`}
                  className="w-16 h-16 rounded-full border-2 border-[#5ab4e8]/40 object-cover"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full border-2 border-[#5ab4e8]/40 bg-[#1a1d24] flex items-center justify-center text-2xl font-semibold text-white select-none"
                  aria-hidden="true"
                >
                  {googleName.charAt(0).toUpperCase()}
                </div>
              )}
              {/* GOOGLE BADGE */}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0d0f14] border border-white/10 flex items-center justify-center"
                title="Conectado con Google"
              >
                <GoogleIcon />
              </div>
            </div>

            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-0.5">
                Último paso
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                Hola, {googleName.split(" ")[0]} 👋
              </h2>
              <p className="text-white/40 text-xs mt-0.5">
                Tu foto de Google se usará como avatar
              </p>
            </div>
          </header>

          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Elige un nombre de usuario único para identificarte en las salas de
            estudio.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* GLOBAL ERROR */}
            {error && (
              <div
                role="alert"
                className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm flex items-start gap-2 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* USERNAME FIELD */}
            <div className="space-y-1.5">
              <label
                htmlFor="setup-username"
                className="block text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase cursor-pointer"
              >
                Nombre de usuario
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm select-none"
                  aria-hidden="true"
                >
                  @
                </span>
                <input
                  id="setup-username"
                  type="text"
                  aria-invalid={usernameAvailable === false}
                  aria-describedby="setup-username-help setup-username-feedback"
                  value={username}
                  onChange={(event) => handleUsernameChange(event.target.value)}
                  placeholder="tu_usuario"
                  maxLength={20}
                  autoComplete="off"
                  className={`w-full bg-[#1a1d24] border rounded-lg pl-8 pr-11 py-3 text-white text-base sm:text-sm placeholder-white/25 focus:outline-none focus:ring-1 transition-all ${usernameValidationStyles}`}
                />

                {/* STATUS ICON */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {usernameChecking && (
                    <Loader2 className="animate-spin w-4 h-4 text-[#5ab4e8]" />
                  )}
                  {!usernameChecking && usernameAvailable === true && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  {!usernameChecking && usernameAvailable === false && (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>

              {/* FEEDBACK MESSAGES */}
              
              <p
                id="setup-username-help"
                className="text-[10px] text-white/25 mt-1"
              >
                Solo letras, números y guiones bajos. Sin espacios.
              </p>

              <p
                id="setup-username-feedback"
                aria-live="polite"
                className={`text-xs mt-1 flex items-center gap-1 animate-in fade-in ${
                  usernameAvailable === false
                    ? "text-red-400"
                    : usernameAvailable === true && username.length >= 3
                      ? "text-green-400"
                      : "text-transparent"
                }`}
              >
                {usernameAvailable === false ? (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    {usernameError || "Este nombre de usuario no está disponible."}
                  </>
                ) : usernameAvailable === true && username.length >= 3 ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Nombre de usuario disponible.
                  </>
                ) : (
                  <span aria-hidden="true">.</span>
                )}
              </p>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={!usernameAvailable || isSaving || usernameChecking}
              className="w-full bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 sm:py-3 rounded-lg transition-all duration-200 text-sm tracking-widest uppercase flex items-center justify-center gap-2 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Completar perfil</span>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
