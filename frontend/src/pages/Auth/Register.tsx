import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  registerWithEmail,
  loginWithGoogle,
  checkUsernameAvailability,
} from "../../config/auth.ts";

// ── Avatares predefinidos ──────────────────────────────────────
const AVATARS = [
  { id: "owl", emoji: "🦉", label: "Búho" },
  { id: "rocket", emoji: "🚀", label: "Cohete" },
  { id: "brain", emoji: "🧠", label: "Cerebro" },
  { id: "star", emoji: "⭐", label: "Estrella" },
  { id: "fire", emoji: "🔥", label: "Fuego" },
  { id: "diamond", emoji: "💎", label: "Diamante" },
  { id: "plant", emoji: "🌱", label: "Planta" },
  { id: "bolt", emoji: "⚡", label: "Rayo" },
  { id: "moon", emoji: "🌙", label: "Luna" },
  { id: "book", emoji: "📚", label: "Libros" },
  { id: "atom", emoji: "⚛️", label: "Átomo" },
  { id: "compass", emoji: "🧭", label: "Brújula" },
];

// ── Dominios de correo aceptados ───────────────────────────────
const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Todos los dominios son válidos — solo validamos formato.
// Los correos institucionales (*.edu.co, etc.) pasan naturalmente.

export default function RegisterPage() {
  // Campos
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Estados UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Estados username
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [usernameError, setUsernameError] = useState("");

  const navigate = useNavigate();

  // ── Fortaleza contraseña ───────────────────────────────────
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const levels = [
      { label: "Muy débil", bar: "bg-red-500", text: "text-red-400" },
      { label: "Débil", bar: "bg-orange-500", text: "text-orange-400" },
      { label: "Aceptable", bar: "bg-yellow-500", text: "text-yellow-400" },
      { label: "Fuerte", bar: "bg-green-500", text: "text-green-400" },
    ];
    return { score, ...levels[Math.max(0, score - 1)] };
  };
  const strength = getStrength(password);

  // ── Validación username con debounce manual ────────────────
  const handleUsernameChange = useCallback(async (value: string) => {
    // Solo letras, números, guiones bajos — sin espacios
    const clean = value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
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

  // ── Traducción errores Firebase ────────────────────────────
  const parseError = (err: any): string => {
    const code = err?.code || "";
    const map: Record<string, string> = {
      "auth/email-already-in-use": "Este correo ya está registrado.",
      "auth/invalid-email": "El correo electrónico no es válido.",
      "auth/weak-password": "La contraseña es demasiado débil.",
      "auth/network-request-failed": "Error de red. Verifica tu conexión.",
    };
    return map[code] || err?.message || "Ocurrió un error al crear la cuenta.";
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("El nombre completo es obligatorio.");
    if (username.length < 3 || usernameAvailable !== true)
      return setError("Elige un nombre de usuario válido y disponible.");
    if (!VALID_EMAIL_REGEX.test(email))
      return setError("Ingresa un correo electrónico válido.");
    if (password.length < 6)
      return setError("La contraseña debe tener al menos 6 caracteres.");
    if (password !== confirmPassword)
      return setError("Las contraseñas no coinciden.");
    if (!selectedAvatar)
      return setError("Selecciona un avatar para tu perfil.");
    if (!acceptTerms)
      return setError("Debes aceptar los términos y condiciones.");

    setIsLoading(true);
    try {
      await registerWithEmail(
        email,
        password,
        name.trim(),
        username,
        selectedAvatar,
      );
      navigate("/dashboard");
    } catch (err: any) {
      setError(parseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setError("");
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch {
      setError("Ocurrió un error al registrarse con Google.");
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
          <Link
            to="/"
            className="text-[#5ab4e8] hover:text-[#7cc4ef] font-semibold transition-colors"
          >
            <h1 className="text-3xl font-bold text-[#5ab4e8] tracking-tight font-serif">
              Space UV
            </h1>
          </Link>
          <blockquote className="text-white/75 text-lg italic font-light leading-relaxed max-w-sm">
            "La concentración es la raíz de todas las facultades del hombre."
          </blockquote>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div
        className="flex-1 flex items-start lg:items-center justify-center
                      px-5 py-8 sm:px-8 lg:px-12 overflow-y-auto"
      >
        <div className="w-full max-w-md">
          {/* Hero móvil */}
          <div
            className="lg:hidden relative rounded-2xl overflow-hidden mb-8 h-32 sm:h-40"
            style={{
              backgroundImage: "url('/Study-focus.jpeg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-[#0d0f14]/60" />
            <div className="relative z-10 flex items-center justify-center h-full">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#5ab4e8] font-serif tracking-tight">
                EstudioSíncrono
              </h1>
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Crear una cuenta
            </h2>
            <p className="text-white/50 text-sm">
              Únete a la comunidad de estudio profundo.
            </p>
          </div>

          <form
            onSubmit={handleRegister}
            className="space-y-4 sm:space-y-5"
            noValidate
          >
            {/* Error global */}
            {error && (
              <div
                className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3
                              text-red-400 text-sm flex items-start gap-2"
              >
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                {error}
              </div>
            )}

            {/* Nombre completo */}
            <Field label="Nombre completo">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                className={inputClass}
              />
            </Field>

            {/* Username */}
            <Field label="Nombre de usuario">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm select-none">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="tu_usuario"
                  maxLength={20}
                  autoComplete="off"
                  className={`${inputClass} pl-8 pr-11 ${
                    usernameAvailable === false
                      ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20"
                      : usernameAvailable === true
                        ? "border-green-500/50 focus:border-green-500/70 focus:ring-green-500/20"
                        : ""
                  }`}
                />
                {/* Ícono de estado */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {usernameChecking && (
                    <svg
                      className="animate-spin w-4 h-4 text-[#5ab4e8]"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}
                  {!usernameChecking && usernameAvailable === true && (
                    <svg
                      className="w-4 h-4 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {!usernameChecking && usernameAvailable === false && (
                    <svg
                      className="w-4 h-4 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>
              </div>
              {/* Feedback username */}
              {usernameError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <svg
                    className="w-3 h-3 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    />
                  </svg>
                  {usernameError}
                </p>
              )}
              {usernameAvailable && !usernameError && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <svg
                    className="w-3 h-3 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  ¡Disponible!
                </p>
              )}
              <p className="text-[10px] text-white/25 mt-1">
                Solo letras, números y guiones bajos. Sin espacios.
              </p>
            </Field>

            {/* Email — acepta cualquier dominio incluyendo institucionales */}
            <Field label="Correo electrónico">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com o usuario@correounivalle.edu.co"
                autoComplete="email"
                className={inputClass}
              />
              <p className="text-[10px] text-white/25 mt-1">
                Se aceptan correos institucionales (.edu.co, .edu, etc.)
              </p>
            </Field>

            {/* Contraseña */}
            <Field label="Contraseña">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                />
                <EyeToggle
                  show={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                />
              </div>
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          lvl <= strength.score ? strength.bar : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${strength.text}`}>{strength.label}</p>
                </div>
              )}
            </Field>

            {/* Confirmar contraseña */}
            <Field label="Confirmar contraseña">
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`${inputClass} pr-11 ${
                    confirmPassword.length > 0
                      ? confirmPassword === password
                        ? "border-green-500/50 focus:border-green-500/70"
                        : "border-red-500/40 focus:border-red-500/60"
                      : ""
                  }`}
                />
                <EyeToggle
                  show={showConfirm}
                  onToggle={() => setShowConfirm(!showConfirm)}
                />
              </div>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-xs text-red-400 mt-1">
                  Las contraseñas no coinciden
                </p>
              )}
            </Field>

            {/* ── Selector de avatar ── */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
                Elige tu avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.id)}
                    title={av.label}
                    className={`aspect-square rounded-xl text-2xl flex items-center justify-center
                                transition-all duration-150 border-2
                                ${
                                  selectedAvatar === av.id
                                    ? "border-[#5ab4e8] bg-[#5ab4e8]/15 scale-110 shadow-lg shadow-[#5ab4e8]/20"
                                    : "border-white/10 bg-[#1a1d24] hover:border-white/25 hover:bg-white/5"
                                }`}
                    aria-label={av.label}
                    aria-pressed={selectedAvatar === av.id}
                  >
                    {av.emoji}
                  </button>
                ))}
              </div>
              {selectedAvatar && (
                <p className="text-xs text-white/30">
                  Seleccionado:{" "}
                  {AVATARS.find((a) => a.id === selectedAvatar)?.label}
                </p>
              )}
            </div>

            {/* Términos */}
            <label className="flex items-start gap-3 cursor-pointer group py-1">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border transition-all ${
                    acceptTerms
                      ? "bg-[#5ab4e8] border-[#5ab4e8]"
                      : "bg-transparent border-white/30 group-hover:border-white/50"
                  }`}
                >
                  {acceptTerms && (
                    <svg
                      className="w-3 h-3 text-white mx-auto mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-white/50 leading-relaxed">
                Acepto los{" "}
                <button
                  type="button"
                  className="text-[#5ab4e8] hover:underline"
                >
                  términos y condiciones
                </button>{" "}
                y la política de privacidad.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold py-3.5 sm:py-3 rounded-lg
                         transition-all duration-200 text-sm tracking-widest uppercase
                         flex items-center justify-center gap-2 mt-1"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </>
              )}
            </button>

            {/* Divisor */}
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0d0f14] px-3 text-xs text-white/30 tracking-widest uppercase">
                  O continuar con
                </span>
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isLoading}
              className="w-full bg-transparent border border-white/15 hover:border-white/30
                         hover:bg-white/5 active:bg-white/10
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white/80 hover:text-white font-medium
                         py-3.5 sm:py-3 rounded-lg transition-all duration-200
                         text-sm flex items-center justify-center gap-3"
            >
              <GoogleIcon />
              GOOGLE
            </button>

            <p className="text-center text-sm text-white/40 pb-4 sm:pb-0">
              ¿Ya tienes una cuenta?{" "}
              <Link
                to="/login"
                className="text-[#5ab4e8] hover:text-[#7cc4ef] font-semibold transition-colors"
              >
                Iniciar Sesión
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

const inputClass =
  "w-full bg-[#1a1d24] border border-white/10 rounded-lg px-4 py-3 text-white text-base sm:text-sm placeholder-white/25 focus:outline-none focus:border-[#5ab4e8]/60 focus:ring-1 focus:ring-[#5ab4e8]/20 transition-all";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

function EyeToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
      aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
    >
      {show ? (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
}
