import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStudyRoom } from "../config/rooms";
import { auth } from "../config/firebase";
import { Loader2, AlertCircle } from "lucide-react";

export default function CreateRoom() {
  const navigate = useNavigate();

  // Estados del formulario
  const [formData, setFormData] = useState({
    title: "Cálculo Avanzado II",
    topic:
      "Sesión enfocada en resolver ejercicios, compartir pantalla y discutir dudas del taller.",
    type: "Estudio grupal",
    limit: "6",
    privacy: "Privada",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Debes iniciar sesion para crear una sala.");
      setIsLoading(false);
      return;
    }

    try {
      const roomData = {
        title: formData.title,
        topic: formData.topic,
        ownerId: currentUser.uid,
        type: formData.type,
        limit: parseInt(formData.limit, 10),
        privacy: formData.privacy,
      };

      await createStudyRoom(roomData);
      navigate("/dashboard");
    } catch (error: any) {
      if (error.customErrors) {
        setFieldErrors(error.customErrors);
      } else {
        setError(
          error.message || "Ocurrio un error inesperado al crear la sala.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 p-8 flex justify-center">
      <div className="max-w-6xl w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-sky-200 mb-2">
            Crear nueva sala
          </h1>
          <p className="text-gray-400 text-sm">
            Configura el espacio base para tu sesión de estudio colaborativo.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/50 border border-red-800 flex items-center gap-2 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-2 bg-[#1C1C1C] rounded-xl p-6 border border-gray-800 h-fit">
            <h2 className="text-lg font-bold text-white mb-6">
              Detalles de la sala
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Nombre de la sala
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={`w-full bg-[#121212] border ${fieldErrors.title ? "border-red-500" : "border-gray-700"} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 transition-colors`}
                  />
                  {fieldErrors.title && (
                    <p className="text-red-400 text-xs mt-1">
                      {fieldErrors.title}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Descripción
                  </label>
                  <textarea
                    value={formData.topic}
                    onChange={(e) =>
                      setFormData({ ...formData, topic: e.target.value })
                    }
                    rows={3}
                    className={`w-full bg-[#121212] border ${fieldErrors.topic ? "border-red-500" : "border-gray-700"} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 transition-colors resize-none`}
                  />
                  {fieldErrors.topic && (
                    <p className="text-red-400 text-xs mt-1">
                      {fieldErrors.topic}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Tipo de sesión
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 appearance-none"
                  >
                    <option>Estudio grupal</option>
                    <option>Sesión de concentración</option>
                    <option>Tutoría</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Límite de participantes
                  </label>
                  <select
                    value={formData.limit}
                    onChange={(e) =>
                      setFormData({ ...formData, limit: e.target.value })
                    }
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 appearance-none"
                  >
                    <option value="2">2 participantes</option>
                    <option value="4">4 participantes</option>
                    <option value="6">6 participantes</option>
                    <option value="10">10 participantes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Privacidad
                </label>
                <div className="flex bg-[#121212] border border-gray-700 rounded-lg overflow-hidden p-1">
                  {["Privada", "Pública", "Solo invitados"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, privacy: option })
                      }
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        formData.privacy === option
                          ? "bg-[#E5B567] text-gray-900"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-gray-800">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-sky-300 hover:bg-sky-400 text-sky-950 font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? "Creando..." : "Crear sala"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 font-medium py-2.5 px-6 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>

          {/* Vista Previa */}
          <div className="space-y-6">
            <div className="bg-[#1C1C1C] rounded-xl p-6 border border-gray-800">
              <span className="inline-block bg-[#E5B567] text-gray-900 text-xs font-bold px-3 py-1 rounded mb-4">
                Vista previa
              </span>

              <h3 className="text-xl font-bold text-sky-200 mb-3 break-words">
                {formData.title || "Nombre de la sala"}
              </h3>
              <p className="text-sm text-gray-400 mb-6 line-clamp-4 min-h-[4rem]">
                {formData.topic ||
                  "La descripción de tu sala aparecerá aquí..."}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#121212] p-3 rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">Participantes</p>
                  <p className="text-sm font-bold text-white">
                    {formData.limit} máx.
                  </p>
                </div>
                <div className="bg-[#121212] p-3 rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">Privacidad</p>
                  <p className="text-sm font-bold text-white">
                    {formData.privacy}
                  </p>
                </div>
                {/* Los datos fijos de la sala */}
                <div className="bg-[#121212] p-3 rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">Cámara/Audio</p>
                  <p className="text-sm font-bold text-white text-emerald-400">
                    Elección libre
                  </p>
                </div>
                <div className="bg-[#121212] p-3 rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">Historial</p>
                  <p className="text-sm font-bold text-white text-sky-400">
                    Guardado aut.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#2A3746] rounded-xl p-6 border border-[#3A4B5C]">
              <h4 className="text-sky-200 font-bold mb-2">
                Libertad de colaboración
              </h4>
              <p className="text-sm text-sky-100/80">
                Los participantes podrán decidir si activar su micrófono o
                cámara de forma individual una vez ingresen a la sesión. El chat
                se guardará automáticamente para futuras referencias.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
