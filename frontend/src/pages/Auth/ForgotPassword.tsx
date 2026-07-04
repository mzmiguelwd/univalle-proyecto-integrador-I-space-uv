import { useState } from "react";
import { Link } from "react-router-dom";
import {
  KeyRound,
  AlertCircle,
  Loader2,
  ArrowLeft,
  MailCheck,
} from "lucide-react";

import { resetPassword } from "../../config/auth.ts";

type Step = "form" | "sent";

// UTILS

const getErrorMessage = (error: unknown): string => {
  const code =
    error && typeof error === "object" && "code" in error
      ? (error as { code: string }).code
      : "";

  const errorMap: Record<string, string> = {
    "auth/user-not-found":
      "No existe una cuenta asociada a este correo electrónico.",

    "auth/invalid-email":
      "El correo electrónico no tiene un formato válido.",

    "auth/too-many-requests":
      "Has realizado demasiados intentos. Espera unos minutos antes de volver a intentarlo.",

    "auth/network-request-failed":
      "No fue posible conectar con el servidor. Verifica tu conexión.",

    "auth/internal-error":
      "Ocurrió un error interno. Intenta nuevamente en unos minutos.",
  };

  return errorMap[code] || "Ocurrió un error. Inténtalo de nuevo.";
};

// SUB-COMPONENTS

const DesktopHeroPanel = () => (
  <div
    className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
    style={{ backgroundImage: "url('/study-focus.png')" }}
  >
    <div className="absolute inset-0 bg-linear-to-br from-[#0d0f14]/75 via-[#0d0f14]/45 to-transparent" />
    <div className="relative z-10 flex flex-col justify-between p-10 w-full">
      <Link
        to="/"
        className="w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ab4e8] rounded-sm"
      >
        <h1 className="text-3xl font-bold text-[#5ab4e8] tracking-tight font-serif hover:text-[#7cc4ef] transition-colors">
          Space UV
        </h1>
      </Link>
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
      <h1 className="text-2xl sm:text-3xl font-bold text-[#5ab4e8] font-serif tracking-tight">
        Space UV
      </h1>
    </div>
  </div>
);

// MAIN COMPONENT

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // HANDLERS

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email);
      setStep("sent");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // RENDER

  return (
    <main className="min-h-screen flex bg-[#0d0f14]">
      <DesktopHeroPanel />

      <section className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 sm:px-8 lg:px-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <MobileHeroPanel />

          {step === "form" ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <header className="mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#5ab4e8]/10 border border-[#5ab4e8]/20 flex items-center justify-center mb-5">
                  <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 text-[#5ab4e8]" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  ¿Olvidaste tu contraseña?
                </h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  Ingresa tu correo y te enviaremos un enlace para restablecer
                  tu contraseña.
                </p>
              </header>

              <form
                onSubmit={handleSubmit}
                className="space-y-4 sm:space-y-5"
                noValidate
              >
                {/* GLOBAL ERROR */}
                {error && (
                  <div
                    role="alert"
                    className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm flex items-start gap-2 animate-in fade-in duration-200"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* EMAIL INPUT */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="forgot-email"
                    className="block text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase cursor-pointer"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                    className="w-full bg-[#1a1d24] border border-white/10 rounded-lg px-4 py-3 text-white text-base sm:text-sm placeholder-white/25 focus:outline-none focus:border-[#5ab4e8]/60 focus:ring-1 focus:ring-[#5ab4e8]/20 transition-all"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 sm:py-3 rounded-lg transition-all duration-200 text-sm tracking-wide flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Enviar enlace de recuperación</span>
                  )}
                </button>

                {/* RETURN LINK */}
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors py-2 focus-visible:outline-none focus-visible:underline rounded-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al inicio de sesión</span>
                </Link>
              </form>
            </div>
          ) : (
            /* SUCCESS SCREEN */
            <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <MailCheck className="w-7 h-7 sm:w-9 sm:h-9 text-green-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-2xl font-bold text-white">
                  Correo enviado
                </h2>
                <p className="text-white/50 text-sm">
                  Enviamos un enlace de recuperación a
                </p>
                <p className="text-[#5ab4e8] font-semibold text-sm break-all">
                  {email}
                </p>
                <p className="text-white/35 text-xs leading-relaxed pt-1 max-w-xs mx-auto">
                  Revisa tu bandeja de entrada y carpeta de spam. El enlace
                  expira en 1 hora.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setEmail("");
                }}
                className="text-sm text-white/40 hover:text-white/70 transition-colors underline underline-offset-2 focus-visible:outline-none focus-visible:text-white"
              >
                ¿No recibiste el correo? Intentar de nuevo
              </button>

              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce] text-white font-semibold py-3.5 sm:py-3 rounded-lg transition-all duration-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14]"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
