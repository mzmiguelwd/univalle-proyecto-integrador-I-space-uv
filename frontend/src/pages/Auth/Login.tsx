import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Loader2, Check } from "lucide-react";

import { loginWithEmail, loginWithGoogle } from "../../config/auth.ts";

// UTILS

const getErrorMessage = (error: unknown): string => {
  const code =
    error && typeof error === "object" && "code" in error
      ? (error as { code: string }).code
      : "";

  const errorMap: Record<string, string> = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No existe una cuenta con este correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-email": "El correo electrónico no tiene un formato válido.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
    "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
    "auth/network-request-failed": "Error de red. Verifica tu conexión.",
  };
  return errorMap[code] || "Credenciales inválidas o usuario no encontrado.";
};

const getGoogleLoginErrorMessage = (error: unknown): string => {
  const code =
    error && typeof error === "object" && "code" in error
      ? (error as { code: string }).code
      : "";

  const errorMap: Record<string, string> = {
    "auth/popup-closed-by-user":
      "Cerraste la ventana de Google antes de completar el inicio de sesión.",
    "auth/cancelled-popup-request":
      "Ya hay una ventana de inicio de sesión abierta.",
    "auth/popup-blocked":
      "El navegador bloqueó la ventana emergente de Google. Permite pop-ups e inténtalo de nuevo.",
    "auth/network-request-failed": "Error de red. Verifica tu conexión.",
  };

  return (
    errorMap[code] ||
    "No pudimos iniciar sesión con Google. Inténtalo nuevamente."
  );
};

// SUB-COMPONENTS

const DesktopHeroPanel = () => (
  <div
    className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
    style={{ backgroundImage: "url('/study-focus.png')" }}
  >
    <div className="absolute inset-0 bg-linear-to-br from-[#0d0f14]/90 via-[#0d0f14]/60 to-transparent" />
    <div className="relative z-10 flex flex-col justify-between p-10 w-full">
      <Link
        to="/"
        className="w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ab4e8] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d0f14] rounded-sm"
        aria-label="Volver a la página de inicio"
      >
        {/* CORRECCIÓN H1: Cambiado a span para no competir con el título principal */}
        <span className="text-3xl font-bold text-[#5ab4e8] tracking-tight font-serif hover:text-[#7cc4ef] transition-colors block">
          Space UV
        </span>
      </Link>
      <blockquote className="text-white text-lg italic font-light leading-relaxed max-w-sm">
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
    <div className="absolute inset-0 bg-[#0d0f14]/80" />
    <div className="relative z-10 flex items-center justify-center h-full">
      {/* CORRECCIÓN H1: Cambiado a span */}
      <span className="text-2xl sm:text-3xl font-bold text-[#5ab4e8] font-serif tracking-tight block">
        Space UV
      </span>
    </div>
  </div>
);

const GoogleIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
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

const FormField = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label
      htmlFor={htmlFor}
      className="text-sm font-semibold tracking-[0.1em] text-white/90 uppercase block"
    >
      {label}
    </label>
    {children}
  </div>
);

// MAIN COMPONENT

export default function Login() {
  const navigate = useNavigate();

  // FORM STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // UI STATE
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // HANDLERS
  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setIsLoading(true);

    try {
      await loginWithEmail(email, password);
      navigate("/dashboard");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Google Login Error:", error);
      setError(getGoogleLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // STYLES
  const inputStyles =
    "w-full bg-[#1a1d24] border border-white/20 rounded-lg px-4 py-3 text-white text-base sm:text-sm placeholder-white/50 focus:outline-none focus:border-[#5ab4e8] focus:ring-2 focus:ring-[#5ab4e8]/50 transition-all aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-400/50";

  // RENDER
  return (
    <main className="min-h-screen flex bg-[#0d0f14]">
      <DesktopHeroPanel />

      <section className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 sm:px-8 lg:px-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <MobileHeroPanel />

          <header className="mb-6 sm:mb-8">
            {/* CORRECCIÓN H1: Ahora este es el H1 descriptivo de la página */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Bienvenido
            </h1>
            <p className="text-white/80 text-base">
              Inicia sesión con tus datos
            </p>
          </header>

          <form
            onSubmit={handleEmailLogin}
            className="space-y-4 sm:space-y-5"
            noValidate
          >
            {/* ERROR MESSAGE */}
            {error && (
              <div
                id="login-error-message"
                role="alert"
                className="bg-red-900/30 border border-red-500/50 rounded-lg px-4 py-3 text-red-200 text-sm flex items-start gap-2 animate-in fade-in duration-200"
              >
                <AlertCircle
                  className="w-5 h-5 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            {/* EMAIL INPUT */}
            <FormField label="Correo electrónico" htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                required
                autoFocus // CORRECCIÓN FOCUS: Ayuda a asegurar el enfoque inicial
                aria-invalid={!!error}
                aria-describedby={error ? "login-error-message" : undefined}
                className={inputStyles}
              />
            </FormField>

            {/* PASSWORD INPUT */}
            <FormField label="Contraseña" htmlFor="login-password">
              <div className="flex justify-end -mt-2 mb-1">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[#5ab4e8] hover:text-[#7cc4ef] transition-colors focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-[#5ab4e8] rounded-sm"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error-message" : undefined}
                  className={`${inputStyles} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ab4e8]"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </FormField>

            {/* REMEMBER ME CHECKBOX */}
            <label
              htmlFor="remember-me"
              className="flex items-center gap-3 cursor-pointer group py-2 w-fit"
            >
              <div className="relative flex items-center justify-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                    rememberMe
                      ? "bg-[#5ab4e8] border-[#5ab4e8]"
                      : "bg-transparent border-white/50 group-hover:border-white/80 peer-focus-visible:ring-2 peer-focus-visible:ring-[#5ab4e8] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0d0f14] peer-focus-visible:border-transparent"
                  }`}
                  aria-hidden="true"
                >
                  {rememberMe && (
                    <Check
                      className="w-3.5 h-3.5 text-[#0d0f14]"
                      strokeWidth={4}
                    />
                  )}
                </div>
              </div>
              <span className="text-base text-white/80 group-hover:text-white transition-colors select-none">
                Recordarme
              </span>
            </label>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce] disabled:opacity-60 disabled:cursor-not-allowed text-[#0d0f14] font-bold py-3.5 sm:py-3 rounded-lg transition-all duration-200 text-base tracking-wide flex items-center justify-center gap-2 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14]"
            >
              {isLoading ? (
                <>
                  <Loader2
                    className="animate-spin w-5 h-5"
                    aria-hidden="true"
                  />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>

            {/* DIVIDER */}
            <div className="relative my-4" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0d0f14] px-3 text-sm text-white/70 tracking-widest uppercase">
                  Acceso rápido con
                </span>
              </div>
            </div>

            {/* GOOGLE LOGIN */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-transparent border border-white/30 hover:border-white/50 hover:bg-white/10 active:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3.5 sm:py-3 rounded-lg transition-all duration-200 text-base flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14]"
            >
              <GoogleIcon />
              <span>GOOGLE</span>
            </button>

            {/* REGISTER LINK */}
            <p className="text-center text-base text-white/80 pb-4 sm:pb-0 pt-2">
              ¿No tienes cuenta?{" "}
              <Link
                to="/register"
                className="text-[#5ab4e8] hover:text-[#7cc4ef] font-bold transition-colors focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-[#5ab4e8] rounded-sm"
              >
                Regístrate Aquí
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
