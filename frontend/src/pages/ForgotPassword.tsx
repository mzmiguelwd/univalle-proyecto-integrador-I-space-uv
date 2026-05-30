import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { resetPassword } from "../config/auth.ts";

type Step = "form" | "sent";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const parseError = (err: any): string => {
    const code = err?.code || "";
    const map: Record<string, string> = {
      "auth/user-not-found":         "No existe una cuenta con este correo.",
      "auth/invalid-email":          "El correo electrónico no es válido.",
      "auth/too-many-requests":      "Demasiados intentos. Espera unos minutos.",
      "auth/network-request-failed": "Error de red. Verifica tu conexión.",
    };
    return map[code] || "Ocurrió un error. Inténtalo de nuevo.";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@")) return setError("Ingresa un correo electrónico válido.");
    setIsLoading(true);
    try {
      await resetPassword(email);
      setStep("sent");
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0d0f14]">

      {/* ── Panel izquierdo — solo desktop ── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: "url('/Study-focus.jpeg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0f14]/75 via-[#0d0f14]/45 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <h1 className="text-3xl font-bold text-[#5ab4e8] tracking-tight font-serif">
            EstudioSíncrono
          </h1>
          <blockquote className="text-white/75 text-lg italic font-light leading-relaxed max-w-sm">
            "La concentración es la raíz de todas las facultades del hombre."
          </blockquote>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="flex-1 flex items-start lg:items-center justify-center
                      px-5 py-8 sm:px-8 lg:px-12 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Hero móvil */}
          <div className="lg:hidden relative rounded-2xl overflow-hidden mb-8 h-32 sm:h-40"
               style={{ backgroundImage: "url('/Study-focus.jpeg')", backgroundSize: "cover", backgroundPosition: "center" }}>
            <div className="absolute inset-0 bg-[#0d0f14]/60" />
            <div className="relative z-10 flex items-center justify-center h-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#5ab4e8] font-serif tracking-tight">
                EstudioSíncrono
              </h1>
            </div>
          </div>

          {step === "form" ? (
            <>
              <div className="mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#5ab4e8]/10 border border-[#5ab4e8]/20
                                flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#5ab4e8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  ¿Olvidaste tu contraseña?
                </h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3
                                  text-red-400 text-sm flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
                    Correo electrónico
                  </label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com" autoComplete="email" autoFocus
                    className="w-full bg-[#1a1d24] border border-white/10 rounded-lg px-4 py-3
                               text-white text-base sm:text-sm placeholder-white/25
                               focus:outline-none focus:border-[#5ab4e8]/60 focus:ring-1
                               focus:ring-[#5ab4e8]/20 transition-all"
                  />
                </div>

                <button type="submit" disabled={isLoading}
                  className="w-full bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce]
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white font-semibold py-3.5 sm:py-3 rounded-lg
                             transition-all duration-200 text-sm tracking-wide
                             flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enviando...
                    </>
                  ) : "Enviar enlace de recuperación"}
                </button>

                <Link to="/login"
                  className="w-full flex items-center justify-center gap-2
                             text-sm text-white/40 hover:text-white/70 transition-colors py-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  Volver al inicio de sesión
                </Link>

              </form>
            </>
          ) : (
            /* ── Pantalla de confirmación ── */
            <div className="flex flex-col items-center text-center space-y-6 py-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500/10 border border-green-500/20
                              flex items-center justify-center">
                <svg className="w-7 h-7 sm:w-9 sm:h-9 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-2xl font-bold text-white">Correo enviado</h2>
                <p className="text-white/50 text-sm">Enviamos un enlace de recuperación a</p>
                <p className="text-[#5ab4e8] font-semibold text-sm break-all">{email}</p>
                <p className="text-white/35 text-xs leading-relaxed pt-1 max-w-xs mx-auto">
                  Revisa tu bandeja de entrada y carpeta de spam. El enlace expira en 1 hora.
                </p>
              </div>

              <button type="button"
                onClick={() => { setStep("form"); setEmail(""); }}
                className="text-sm text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">
                ¿No recibiste el correo? Intentar de nuevo
              </button>

              <Link to="/login"
                className="w-full flex items-center justify-center gap-2
                           bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce]
                           text-white font-semibold py-3.5 sm:py-3 rounded-lg
                           transition-all duration-200 text-sm">
                Volver al inicio de sesión
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
