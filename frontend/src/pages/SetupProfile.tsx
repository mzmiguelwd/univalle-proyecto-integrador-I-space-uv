import { useState } from "react";
import { AtSign, Loader2, CheckCircle, XCircle } from "lucide-react";
import { auth } from "../config/firebase";

import { checkUsernameAvailability, saveUsername } from "../config/auth.ts";

interface SetupProfileProps {
  onComplete: () => void;
}

export default function SetupProfile({ onComplete }: SetupProfileProps) {
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCheckUsername = async (value: string) => {
    setUsername(value);
    const cleanValue = value.trim();

    if (cleanValue.length < 3) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    try {
      const available = await checkUsernameAvailability(cleanValue);
      setIsAvailable(available);
      if (!available) {
        setError("El nombre de usuario ya está en uso. Intenta con otro.");
      } else {
        setError("");
      }
    } catch (error: any) {
      setError("Error al verificar el nombre de usuario. Intenta nuevamente.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveUsername = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAvailable || username.length < 3) return;

    setIsSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado.");

      await saveUsername(currentUser.uid, username.trim());
      onComplete();
    } catch (error: any) {
      setError("Error al guardar el nombre de usuario. Intenta nuevamente.");
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Último paso</h1>
          <p className="text-gray-400">
            Elige un nombre de usuario único para identificarte en las salas de
            estudio.
          </p>
        </div>

        <form onSubmit={handleSaveUsername} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300">
              Nombre de Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <AtSign className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => handleCheckUsername(e.target.value)}
                className={`block w-full pl-10 pr-10 py-2 border rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isAvailable === false
                    ? "border-red-500 focus:ring-red-500"
                    : isAvailable === true
                      ? "border-green-500 focus:ring-green-500"
                      : "border-gray-700"
                }`}
                placeholder="estudiante_uv"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {isChecking && (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                )}
                {!isChecking && isAvailable === true && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {!isChecking && isAvailable === false && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            {isAvailable && !error && (
              <p className="text-xs text-green-400 mt-1">
                ¡Usuario disponible!
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isAvailable || isSaving || isChecking}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Completar Perfil"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
