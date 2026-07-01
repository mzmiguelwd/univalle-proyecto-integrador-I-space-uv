import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Check,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";

import {
  registerWithEmail,
  loginWithGoogle,
  checkUsernameAvailability,
} from "../../config/auth.ts";

// CONSTANTS

const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// UTILS

const getErrorMessage = (error: unknown): string => {
  const code =
    error && typeof error === "object" && "code" in error
      ? (error as { code: string }).code
      : "";

  const message =
    error && typeof error === "object" && "message" in error
      ? (error as { message: string }).message
      : "";

  const errorMap: Record<string, string> = {
    "auth/email-already-in-use":
      "Este correo electrónico ya está registrado.",

    "auth/invalid-email":
      "El correo electrónico no tiene un formato válido.",

    "auth/weak-password":
      "La contraseña es demasiado débil. Usa al menos 8 caracteres.",

    "auth/network-request-failed":
      "No fue posible conectar con el servidor. Verifica tu conexión.",

    "auth/too-many-requests":
      "Has realizado demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
  };

  return (
    errorMap[code] ??
    message ??
    "No fue posible crear la cuenta. Inténtalo nuevamente."
  );
};

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "Muy débil", bar: "bg-red-500", text: "text-red-400" },
    { label: "Débil", bar: "bg-orange-500", text: "text-orange-400" },
    { label: "Aceptable", bar: "bg-yellow-500", text: "text-yellow-400" },
    { label: "Fuerte", bar: "bg-green-500", text: "text-green-400" },
  ];
  return { score, ...levels[Math.max(0, score - 1)] };
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

function FormField({
  label,
  htmlFor,
  children,
}: Readonly<{
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase cursor-pointer"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

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

// MAIN COMPONENT

export default function Register() {
  const navigate = useNavigate();

  // FORM STATE
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // UI STATE
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // USERNAME STATE
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [usernameError, setUsernameError] = useState("");

  const strength = getPasswordStrength(password);
  const inputStyles =
    "w-full bg-[#1a1d24] border border-white/10 rounded-lg px-4 py-3 text-white text-base sm:text-sm placeholder-white/25 focus:outline-none focus:border-[#5ab4e8]/60 focus:ring-1 focus:ring-[#5ab4e8]/20 transition-all";

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

  const handleRegister = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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
    } catch (error: unknown) {
      console.error("Google register error:", error);
      setError("Ocurrió un error al registrarse con Google.");
    } finally {
      setIsLoading(false);
    }
  };

  // DYNAMIC STYLES

  let usernameValidationStyles = "";
  if (usernameAvailable === false) {
    usernameValidationStyles =
      "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/20";
  } else if (usernameAvailable === true) {
    usernameValidationStyles =
      "border-green-500/50 focus:border-green-500/70 focus:ring-green-500/20";
  }

  let confirmPasswordValidationStyles = "";
  if (confirmPassword.length > 0) {
    if (confirmPassword === password) {
      confirmPasswordValidationStyles =
        "border-green-500/50 focus:border-green-500/70";
    } else {
      confirmPasswordValidationStyles =
        "border-red-500/40 focus:border-red-500/60";
    }
  }

  // RENDER

  return (
    <main className="min-h-screen flex bg-[#0d0f14]">
      <DesktopHeroPanel />

      <section className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 sm:px-8 lg:px-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <MobileHeroPanel />

          <header className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Crear una cuenta
            </h2>
            <p className="text-white/50 text-sm">
              Únete a la comunidad de estudio profundo.
            </p>
          </header>

          <form
            onSubmit={handleRegister}
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

            {/* FULL NAME */}
            <FormField label="Nombre completo" htmlFor="register-name">
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                className={inputStyles}
              />
            </FormField>

            {/* USERNAME */}
            <FormField label="Nombre de usuario" htmlFor="register-username">
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm select-none"
                  aria-hidden="true"
                >
                  @
                </span>
                <input
                  id="register-username"
                  type="text"
                  value={username}
                  onChange={(event) => handleUsernameChange(event.target.value)}
                  placeholder="tu_usuario"
                  maxLength={20}
                  autoComplete="off"
                  className={`${inputStyles} pl-8 pr-11 ${usernameValidationStyles}`}
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
              {usernameError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{usernameError}</span>
                </p>
              )}
              {usernameAvailable && !usernameError && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                  <span>¡Disponible!</span>
                </p>
              )}
              <p className="text-[10px] text-white/25 mt-1">
                Solo letras, números y guiones bajos. Sin espacios.
              </p>
            </FormField>

            {/* EMAIL */}
            <FormField label="Correo electrónico" htmlFor="register-email">
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com o usuario@correounivalle.edu.co"
                autoComplete="email"
                className={inputStyles}
              />
              <p className="text-[10px] text-white/25 mt-1">
                Se aceptan correos institucionales (.edu.co, .edu, etc.)
              </p>
            </FormField>

            {/* PASSWORD */}
            <FormField label="Contraseña" htmlFor="register-password">
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
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

              {/* PASSWORD STRENGTH INDICATOR */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1 animate-in fade-in duration-300">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          lvl <= strength.score ? strength.bar : "bg-white/10"
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${strength.text}`}>{strength.label}</p>
                </div>
              )}
            </FormField>

            {/* CONFIRM PASSWORD */}
            <FormField label="Confirmar contraseña" htmlFor="register-confirm-password">
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`${inputStyles} pr-11 ${confirmPasswordValidationStyles}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1 focus-visible:outline-none focus-visible:text-[#5ab4e8]"
                  aria-label={
                    showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-xs text-red-400 mt-1 animate-in fade-in">
                  Las contraseñas no coinciden
                </p>
              )}
            </FormField>

            {/* AVATAR SELECTOR */}
            <div className="space-y-2">
              <label
                className="text-[10px] font-semibold tracking-[0.15em] text-white/50 uppercase"
                htmlFor="avatar"
              >
                Elige tu avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    title={avatar.label}
                    className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14] ${
                      selectedAvatar === avatar.id
                        ? "border-[#5ab4e8] bg-[#5ab4e8]/15 scale-110 shadow-lg shadow-[#5ab4e8]/20 z-10"
                        : "border-white/10 bg-[#1a1d24] hover:border-white/25 hover:bg-white/5"
                    }`}
                    aria-label={avatar.label}
                    aria-pressed={selectedAvatar === avatar.id}
                  >
                    <span aria-hidden="true">{avatar.emoji}</span>
                  </button>
                ))}
              </div>
              {selectedAvatar && (
                <p className="text-xs text-white/30 animate-in fade-in">
                  Seleccionado:{" "}
                  <span className="text-white/70 font-medium">
                    {
                      AVATARS.find((avatar) => avatar.id === selectedAvatar)
                        ?.label
                    }
                  </span>
                </p>
              )}
            </div>

            {/* TERMS AND CONDITIONS */}
            <label className="flex items-start gap-3 cursor-pointer group py-1 w-fit"  htmlFor="register-terms">
              <div className="relative mt-0.5 shrink-0 flex items-center justify-center">
                <input
                  id="register-terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                    acceptTerms
                      ? "bg-[#5ab4e8] border-[#5ab4e8]"
                      : "bg-transparent border-white/30 group-hover:border-white/50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#5ab4e8] peer-focus-visible:border-transparent"
                  }`}
                >
                  {acceptTerms && (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  )}
                </div>
              </div>
              <span className="text-sm text-white/50 leading-relaxed select-none">
                Acepto los{" "}
                <Link
                  to="/terminos"
                  className="text-[#5ab4e8] hover:underline focus-visible:outline-none focus-visible:bg-white/10 rounded px-1 -ml-1"
                >
                  términos y condiciones
                </Link>{" "}
                y la política de privacidad.
              </span>
            </label>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5ab4e8] hover:bg-[#4aa8de] active:bg-[#3a98ce] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 sm:py-3 rounded-lg transition-all duration-200 text-sm tracking-widest uppercase flex items-center justify-center gap-2 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <>
                  <span>Crear cuenta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* DIVIDER */}
            <div className="relative my-1" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0d0f14] px-3 text-xs text-white/30 tracking-widest uppercase">
                  O continuar con
                </span>
              </div>
            </div>

            {/* GOOGLE REGISTER */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isLoading}
              className="w-full bg-transparent border border-white/15 hover:border-white/30 hover:bg-white/5 active:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white/80 hover:text-white font-medium py-3.5 sm:py-3 rounded-lg transition-all duration-200 text-sm flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f14]"
            >
              <GoogleIcon />
              <span>GOOGLE</span>
            </button>

            {/* LOGIN LINK */}
            <p className="text-center text-sm text-white/40 pb-4 sm:pb-0 pt-2">
              ¿Ya tienes una cuenta?{" "}
              <Link
                to="/login"
                className="text-[#5ab4e8] hover:text-[#7cc4ef] font-semibold transition-colors focus-visible:outline-none focus-visible:underline"
              >
                Iniciar Sesión
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
