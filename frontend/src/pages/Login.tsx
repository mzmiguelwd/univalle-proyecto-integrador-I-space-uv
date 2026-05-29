import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginWithEmail, loginWithGoogle } from "../config/auth.ts";
 
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
 
  const parseError = (err: any): string => {
    const code = err?.code || "";
    const map: Record<string, string> = {
      "auth/invalid-credential":     "Correo o contraseña incorrectos.",
      "auth/user-not-found":         "No existe una cuenta con este correo.",
      "auth/wrong-password":         "Contraseña incorrecta.",
      "auth/too-many-requests":      "Demasiados intentos. Espera unos minutos.",
      "auth/user-disabled":          "Esta cuenta ha sido deshabilitada.",
      "auth/network-request-failed": "Error de red. Verifica tu conexión.",
    };
    return map[code] || "Credenciales inválidas o usuario no encontrado.";
  };
 
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Por favor completa todos los campos.");
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(parseError(err));
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
    } catch (err: any) {
      setError("Ocurrió un error al iniciar sesión con Google.");
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
 
          {/* Hero móvil con imagen */}
          <div className="lg:hidden relative rounded-2xl overflow-hidden mb-8 h-32 sm:h-40"
               style={{ backgroundImage: "url('/Study-focus.jpeg')", backgroundSize: "cover", backgroundPosition: "center" }}>
            <div className="absolute inset-0 bg-[#0d0f14]/60" />
            <div className="relative z-10 flex items-center justify-center h-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#5ab4e8] font-serif tracking-tight">
                EstudioSíncrono
              </h1>
            </div>
          </div>
 
          {/* Encabezado */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Bienvenido</h2>
            <p className="text-white/50 text-sm">Inicia sesión con tus datos</p>
          </div>
 
          <form onSubmit={handleEmailLogin} className="space-y-4 sm:space-y-5" noValidate>
 
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
 
            <Field label="Correo electrónico">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com" autoComplete="email" className={inputClass} />
            </Field>
 
            <Field label="Contraseña">
              {/* Link olvidé contraseña alineado a la derecha del label */}
              <div className="flex justify-end -mt-1 mb-1">
                <Link to="/forgot-password"
                  className="text-xs text-[#5ab4e8] hover:text-[#7cc4ef] transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className={`${inputClass} pr-11`}
                />
                <EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
              </div>
            </Field>
 
            {/* Recordarme — área de toque más grande en móvil */}
            <label className="flex items-center gap-3 cursor-pointer group py-1">
              <div className="relative">
                <input type="checkbox" checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)} className="sr-only" />
                <div className={`w-5 h-5 rounded border transition-all ${
                  rememberMe ? "bg-[#5ab4e8] border-[#5ab4e8]"
                             : "bg-transparent border-white/30 group-hover:border-white/50"}`}>
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white mx-auto mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
                Recordarme
              </span>
            </label>
 
            <button type="submit" disabled={isLoading}
              className="w-full bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold py-3.5 sm:py-3 rounded-lg
                         transition-all duration-200 text-sm tracking-wide
                         flex items-center justify-center gap-2 mt-1">
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando sesión...
                </>
              ) : "Iniciar sesión"}
            </button>
 
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0d0f14] px-3 text-xs text-white/30 tracking-widest uppercase">
                  Acceso rápido con
                </span>
              </div>
            </div>
 
            <button type="button" onClick={handleGoogleLogin} disabled={isLoading}
              className="w-full bg-transparent border border-white/15 hover:border-white/30
                         hover:bg-white/5 active:bg-white/10
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white/80 hover:text-white font-medium
                         py-3.5 sm:py-3 rounded-lg transition-all duration-200
                         text-sm flex items-center justify-center gap-3">
              <GoogleIcon />
              GOOGLE
            </button>
 
            <p className="text-center text-sm text-white/40 pb-4 sm:pb-0">
              No tienes cuenta?{" "}
              <Link to="/register"
                className="text-[#5ab4e8] hover:text-[#7cc4ef] font-semibold transition-colors">
                Regístrate aquí
              </Link>
            </p>
 
          </form>
 
          {/* Footer — oculto en móvil para no saturar */}
          <div className="hidden sm:flex mt-10 justify-center gap-5 text-xs text-white/20">
            <button type="button" className="hover:text-white/40 transition-colors">Privacy Policy</button>
            <button type="button" className="hover:text-white/40 transition-colors">Terms of Service</button>
            <button type="button" className="hover:text-white/40 transition-colors">Accessibility Support</button>
          </div>
 
        </div>
      </div>
    </div>
  );
}
 
// ── Helpers ────────────────────────────────────────────────────
 
const inputClass =
  "w-full bg-[#1a1d24] border border-white/10 rounded-lg px-4 py-3 text-white text-base sm:text-sm placeholder-white/25 focus:outline-none focus:border-[#5ab4e8]/60 focus:ring-1 focus:ring-[#5ab4e8]/20 transition-all";
 
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}
 
function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
      aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
      {show ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}
 
function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
 