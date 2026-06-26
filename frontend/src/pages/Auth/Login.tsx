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
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
    "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
    "auth/network-request-failed": "Error de red. Verifica tu conexión.",
  };
  return errorMap[code] || "Credenciales inválidas o usuario no encontrado.";
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

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
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

  const handleEmailLogin = async (
    event: React.SubmitEvent<HTMLFormElement>,
  ) => {
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
      setError("Ocurrió un error al iniciar sesión con Google.");
    } finally {
      setIsLoading(false);
    }
  };

  // STYLES

  const inputStyles =
    "w-full bg-[#1a1d24] border border-white/10 rounded-lg px-4 py-3 text-white text-base sm:text-sm placeholder-white/25 focus:outline-none focus:border-[#5ab4e8]/60 focus:ring-1 focus:ring-[#5ab4e8]/20 transition-all";

  // RENDER

  return (
    <main className="min-h-screen flex bg-[#0d0f14]">
      <DesktopHeroPanel />

      <section className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 sm:px-8 lg:px-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <MobileHeroPanel />

          <header className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Bienvenido
            </h2>
            <p className="text-white/50 text-sm">Inicia sesión con tus datos</p>
          </header>

          <form
            onSubmit={handleEmailLogin}
            className="space-y-4 sm:space-y-5"
            noValidate
          >
            {/* ERROR MESSAGE */}
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
            <FormField label="Correo electrónico">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                className={inputStyles}
              />
            </FormField>

            {/* PASSWORD INPUT */}
            <FormField label="Contraseña">
              <div className="flex justify-end -mt-1 mb-1">
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#5ab4e8] hover:text-[#7cc4ef] transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`${inputStyles} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1 focus-visible:outline-none focus-visible:text-[#5ab4e8]"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </FormField>

            {/* REMEMBER ME CHECKBOX */}
            <label className="flex items-center gap-3 cursor-pointer group py-1 w-fit">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                    rememberMe
                      ? "bg-[#5ab4e8] border-[#5ab4e8]"
                      : "bg-transparent border-white/30 group-hover:border-white/50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#5ab4e8] peer-focus-visible:border-transparent"
                  }`}
                >
                  {rememberMe && (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  )}
                </div>
              </div>
              <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors select-none">
                Recordarme
              </span>
            </label>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 sm:py-3 rounded-lg transition-all duration-200 text-sm tracking-wide flex items-center justify-center gap-2 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>

            {/* DIVIDER */}
            <div className="relative my-1" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0d0f14] px-3 text-xs text-white/30 tracking-widest uppercase">
                  Acceso rápido con
                </span>
              </div>
            </div>

            {/* GOOGLE LOGIN */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-transparent border border-white/15 hover:border-white/30 hover:bg-white/5 active:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 hover:text-white font-medium py-3.5 sm:py-3 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14]"
            >
              <GoogleIcon />
              <span>GOOGLE</span>
            </button>

            {/* REGISTER LINK */}
            <p className="text-center text-sm text-white/40 pb-4 sm:pb-0 pt-2">
              ¿No tienes cuenta?{" "}
              <Link
                to="/register"
                className="text-[#5ab4e8] hover:text-[#7cc4ef] font-semibold transition-colors focus-visible:outline-none focus-visible:underline"
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
