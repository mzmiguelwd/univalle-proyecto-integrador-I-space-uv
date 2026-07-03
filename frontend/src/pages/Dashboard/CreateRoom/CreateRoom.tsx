import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";

import { auth } from "../../../config/firebase.ts";
import { createStudyRoom } from "../../../config/rooms.ts";

// TYPES

interface RoomFormData {
  title: string;
  topic: string;
  type: string;
  limit: string;
  privacy: string;
}

interface CustomError {
  customErrors?: Record<string, string>;
  message?: string;
}

// MAIN COMPONENT

export default function CreateRoom() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RoomFormData>({
    title: "",
    topic: "",
    type: "Estudio grupal",
    limit: "6",
    privacy: "Pública",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // HANDLERS

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Debes iniciar sesión para crear una sala.");
      setIsLoading(false);
      return;
    }

    // Validación de campos requeridos en el cliente
    const newFieldErrors: Record<string, string> = {};
    const titleTrimmed = formData.title.trim();
    const topicTrimmed = formData.topic.trim();

    if (!titleTrimmed) {
      newFieldErrors.title = "El nombre de la sala es obligatorio.";
    }
    if (!topicTrimmed) {
      newFieldErrors.topic = "La descripción es obligatoria.";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      await createStudyRoom({
        title: titleTrimmed,
        topic: topicTrimmed,
        ownerId: currentUser.uid,
        type: formData.type,
        limit: Number.parseInt(formData.limit, 10),
        privacy: formData.privacy,
      });
      navigate("/dashboard", {
        state: {
          roomCreated: true,
          roomTitle: titleTrimmed || "Tu sala",
        },
      });
    } catch (error: unknown) {
      const errorObj = error as CustomError;
      if (errorObj?.customErrors) {
        setFieldErrors(errorObj.customErrors);
      } else {
        setError(
          errorObj?.message || "Ocurrió un error inesperado al crear la sala.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen justify-center bg-[#121212] p-8 text-gray-100">
      <div className="w-full max-w-6xl">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-sky-200">
            Crear nueva sala
          </h1>
          <p className="text-sm text-gray-400">
            Configura el espacio base para tu sesión de estudio colaborativo.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/50 p-4 text-sm text-red-200"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* FORM */}
          <section className="h-fit rounded-xl border border-gray-800 bg-[#1C1C1C] p-6 lg:col-span-2">
            <h2 className="mb-6 text-lg font-bold text-white">
              Detalles de la sala
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-4">
                {/* TITLE INPUT */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="room-title"
                    className="block text-sm text-gray-400"
                  >
                    Nombre de la sala
                  </label>
                  <input
                    id="room-title"
                    type="text"
                    placeholder="Ej: Sala de estudio de Cálculo II"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData({ ...formData, title: event.target.value })
                    }
                    className={`w-full rounded-lg border bg-[#121212] px-4 py-2.5 text-white transition-colors focus:border-sky-500 focus:outline-none ${fieldErrors.title ? "border-red-500" : "border-gray-700"}`}
                  />
                  {fieldErrors.title && (
                    <p className="text-xs text-red-400">{fieldErrors.title}</p>
                  )}
                </div>

                {/* TOPIC TEXTAREA */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="room-topic"
                    className="block text-sm text-gray-400"
                  >
                    Descripción
                  </label>
                  <textarea
                    id="room-topic"
                    placeholder="Ej: Un espacio para estudiar Cálculo II y resolver dudas entre compañeros."
                    value={formData.topic}
                    onChange={(event) =>
                      setFormData({ ...formData, topic: event.target.value })
                    }
                    rows={3}
                    className={`w-full resize-none rounded-lg border bg-[#121212] px-4 py-2.5 text-white transition-colors focus:border-sky-500 focus:outline-none ${fieldErrors.topic ? "border-red-500" : "border-gray-700"}`}
                  />
                  {fieldErrors.topic && (
                    <p className="text-xs text-red-400">{fieldErrors.topic}</p>
                  )}
                </div>
              </div>

              {/* SELECTORS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="session-type"
                    className="block text-sm text-gray-400"
                  >
                    Tipo de sesión
                  </label>
                  <select
                    id="session-type"
                    value={formData.type}
                    onChange={(event) =>
                      setFormData({ ...formData, type: event.target.value })
                    }
                    className="w-full appearance-none rounded-lg border border-gray-700 bg-[#121212] px-4 py-2.5 text-white focus:border-sky-500 focus:outline-none cursor-pointer"
                  >
                    <option>Estudio grupal</option>
                    <option>Sesión de concentración</option>
                    <option>Tutoría</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="participant-limit"
                    className="block text-sm text-gray-400"
                  >
                    Límite
                  </label>
                  <select
                    id="participant-limit"
                    value={formData.limit}
                    onChange={(event) =>
                      setFormData({ ...formData, limit: event.target.value })
                    }
                    className="w-full appearance-none rounded-lg border border-gray-700 bg-[#121212] px-4 py-2.5 text-white focus:border-sky-500 focus:outline-none cursor-pointer"
                  >
                    <option value="2">2 participantes</option>
                    <option value="4">4 participantes</option>
                    <option value="6">6 participantes</option>
                    <option value="10">10 participantes</option>
                  </select>
                </div>
              </div>

              {/* PRIVACY BUTTONS */}
              <div className="space-y-1.5">
                <p className="text-sm text-gray-400">Privacidad</p>
                <div className="flex overflow-hidden rounded-lg border border-gray-700 bg-[#121212] p-1">
                  {["Privada", "Pública", "Solo invitados"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, privacy: option })
                      }
                      className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${formData.privacy === option ? "bg-[#E5B567] text-gray-900" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex items-center gap-4 border-t border-gray-800 pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg bg-sky-300 px-6 py-2.5 font-bold text-sky-950 transition-colors hover:bg-sky-400 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isLoading ? "Creando..." : "Crear sala"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="rounded-lg border border-gray-600 px-6 py-2.5 font-medium text-gray-300 transition-colors hover:bg-gray-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>

          {/* PREVIEW PANEL */}
          <PreviewCard formData={formData} />
        </div>
      </div>
    </main>
  );
}

// PREVIEW COMPONENT

const PreviewCard = ({ formData }: { formData: RoomFormData }) => (
  <aside className="space-y-6">
    <div className="rounded-xl border border-gray-800 bg-[#1C1C1C] p-6">
      <span className="mb-4 inline-block rounded bg-[#E5B567] px-3 py-1 text-xs font-bold text-gray-900">
        Vista previa
      </span>
      <h3 className="mb-3 wrap-break-word text-xl font-bold text-sky-200">
        {formData.title || "Nombre de la sala"}
      </h3>
      <p className="mb-6 min-h-16 text-sm text-gray-400 line-clamp-4">
        {formData.topic || "La descripción de tu sala aparecerá aquí..."}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Participantes", value: `${formData.limit} máx.` },
          { label: "Privacidad", value: formData.privacy },
          { label: "Cámara/Audio", value: "Libre", color: "text-emerald-400" },
          { label: "Historial", value: "Guardado", color: "text-sky-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-800 bg-[#121212] p-3"
          >
            <p className="mb-1 text-xs text-gray-500">{stat.label}</p>
            <p className={`text-sm font-bold text-white ${stat.color || ""}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-xl border border-[#3A4B5C] bg-[#2A3746] p-6">
      <h4 className="mb-2 flex items-center gap-2 font-bold text-sky-200">
        <Sparkles className="h-4 w-4" /> Libertad de colaboración
      </h4>
      <p className="text-sm text-sky-100/80">
        Los participantes podrán decidir si activar su micrófono o cámara de
        forma individual una vez ingresen a la sesión. El chat se guardará
        automáticamente.
      </p>
    </div>
  </aside>
);
