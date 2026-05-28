import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";

import { loginWithEmail, loginWithGoogle } from "../config/auth.ts";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authStatus, setAuthStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const successTimerRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
      sessionStorage.removeItem("auth-login-success");
    };
  }, []);

  const setAuthError = () => {
    setAuthStatus("error");
    setAuthMessage("Usuario o contraseña incorrectos");
  };

  const showSuccessAndNavigate = () => {
    setAuthStatus("success");
    setAuthMessage("¡Bienvenido de nuevo!");
    sessionStorage.setItem("auth-login-success", "1");

    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }

    successTimerRef.current = window.setTimeout(() => {
      sessionStorage.removeItem("auth-login-success");
      navigate("/dashboard");
    }, 650);
  };

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthMessage("");

    try {
      await loginWithEmail(email, password);
      showSuccessAndNavigate();
    } catch (error: any) {
      const errorCode = error?.code as string | undefined;
      if (
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/invalid-login-credentials"
      ) {
        setAuthError();
      } else {
        setAuthError();
      }
    }
  };

  const handleGoogleLogin = async () => {
    setAuthStatus("loading");
    setAuthMessage("");
    try {
      await loginWithGoogle();
      showSuccessAndNavigate();
    } catch (error: any) {
      setAuthStatus("error");
      setAuthMessage("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            Bienvenido de vuelta
          </h1>
          <p className="text-gray-400">Ingresa a tu salón colaborativo</p>
        </div>

        {authStatus === "error" && authMessage && (
          <div className="p-3 rounded-lg bg-red-900/50 border border-red-800 flex items-center gap-2 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{authMessage}</p>
          </div>
        )}

        {authStatus === "success" && authMessage && (
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-800 flex items-center gap-2 text-green-200 text-sm">
            <p>{authMessage}</p>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={authStatus === "loading"}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {authStatus === "loading" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">
              O continúa con
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={authStatus === "loading"}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-700 rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>

        <p className="text-center text-sm text-gray-400">
          ¿No tienes una cuenta?{" "}
          <Link
            to="/register"
            className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
