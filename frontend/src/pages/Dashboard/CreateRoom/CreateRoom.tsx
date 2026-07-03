import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  LogIn,
  Users,
} from "lucide-react";

import { auth } from "../../../config/firebase.ts";
import {
  createStudyRoom,
  subscribeToOwnStudyRooms,
  getRoomById,
  type StudyRoom,
} from "../../../config/rooms.ts";

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
  code?: string;
}

const getCreateRoomErrorMessage = (error: unknown): string => {
  const errorObj = error as CustomError;

  switch (errorObj?.code) {
    case "permission-denied":
      return "No tienes permisos para crear salas. Inicia sesión nuevamente.";

    case "unavailable":
      return "No fue posible conectar con el servidor. Verifica tu conexión.";

    case "deadline-exceeded":
      return "La operación tardó demasiado. Intenta nuevamente.";

    default:
      return (
        errorObj?.message ??
        "Ocurrió un error al crear la sala. Inténtalo nuevamente."
      );
  }
};

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
  const [ownRooms, setOwnRooms] = useState<StudyRoom[]>([]);
  const [isLoadingOwnRooms, setIsLoadingOwnRooms] = useState(true);
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

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
        setError(getCreateRoomErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    const code = roomCode.trim();

    if (!code) {
      setJoinError("Ingresa un código de sala.");
      return;
    }

    setIsJoiningRoom(true);
    setJoinError("");

    try {
      const room = await getRoomById(code);

      if (!room) {
        setJoinError("No encontramos una sala con ese código.");
        return;
      }

      navigate(`/room/${code}`);
    } catch {
      setJoinError("No fue posible ingresar a la sala.");
    } finally {
      setIsJoiningRoom(false);
    }
  };

  useEffect(() => {
  const currentUser = auth.currentUser;

  if (!currentUser?.uid) {
    setOwnRooms([]);
    setIsLoadingOwnRooms(false);
    return;
  }

  const unsubscribe = subscribeToOwnStudyRooms(
    currentUser.uid,
      (rooms) => {
        setOwnRooms(rooms.slice(0, 3));
        setIsLoadingOwnRooms(false);
      },
      () => {
        setOwnRooms([]);
        setIsLoadingOwnRooms(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <main className="flex min-h-screen justify-center bg-[#131313] px-5 py-8 text-gray-100 md:px-10 lg:px-14">
      <div className="w-full max-w-6xl">
        <header className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          {/* IZQUIERDA */}
          <div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </button>

            <h1 className="text-4xl font-bold tracking-tight text-white">
              Crear <span className="text-sky-400">nueva sala</span>
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
              Configura un espacio colaborativo para estudiar con tus compañeros en
              tiempo real.
            </p>
          </div>

          {/* DERECHA */}
          <div className="w-full max-w-xl rounded-2xl border border-sky-500/20 bg-linear-to-r from-sky-500/10 to-sky-400/5 p-5 shadow-lg shadow-sky-900/10">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15">
                <Sparkles className="h-5 w-5 text-sky-400" />
              </div>

              <div className="flex-1">
                <h2 className="mb-1 text-base font-semibold text-sky-200">
                  ¿Ya tienes una sala?
                </h2>

                <p className="text-sm leading-relaxed text-sky-100/80">
                  Puedes <strong>crear una nueva sala</strong> para iniciar una sesión de
                  estudio, <strong>ingresar mediante un código</strong> o retomar una de
                  tus <strong>salas activas</strong> desde el panel lateral.
                </p>
              </div>
            </div>
          </div>
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
          <section className="h-fit rounded-2xl border border-gray-800 bg-[#1A1A1A] p-6 shadow-lg shadow-black/20 transition-all lg:col-span-2">
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
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={
                      fieldErrors.title ? "room-title-error" : undefined
                    }
                    type="text"
                    placeholder="Ej: Sala de estudio de Cálculo II"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData({ ...formData, title: event.target.value })
                    }
                    className={`w-full rounded-lg border bg-[#121212] px-4 py-2.5 text-white transition-colors focus:border-sky-500 focus:outline-none ${fieldErrors.title ? "border-red-500" : "border-gray-700"}`}
                  />
                  {fieldErrors.title && (
                    <p
                      id="room-title-error"
                      className="text-xs text-red-400"
                    >{fieldErrors.title}</p>
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
                    aria-invalid={Boolean(fieldErrors.topic)}
                    aria-describedby={
                      fieldErrors.topic ? "room-topic-error" : undefined
                    }
                    placeholder="Ej: Un espacio para estudiar Cálculo II y resolver dudas entre compañeros."
                    value={formData.topic}
                    onChange={(event) =>
                      setFormData({ ...formData, topic: event.target.value })
                    }
                    rows={3}
                    className={`w-full resize-none rounded-lg border bg-[#121212] px-4 py-2.5 text-white transition-colors focus:border-sky-500 focus:outline-none ${fieldErrors.topic ? "border-red-500" : "border-gray-700"}`}
                  />

                  {fieldErrors.topic && (
                    <p
                      id="room-topic-error"
                      className="text-xs text-red-400"
                    >
                      {fieldErrors.topic}
                    </p>
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
                    aria-invalid={Boolean(fieldErrors.limit)}
                    aria-describedby={fieldErrors.limit ? "room-limit-error" : undefined}
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

                  {fieldErrors.limit && (
                    <p id="room-limit-error" className="text-xs text-red-400">
                      {fieldErrors.limit}
                    </p>
                  )}
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
                  className="w-full rounded-xl bg-sky-500 px-4 py-3 font-bold text-sky-950 shadow-md shadow-sky-500/20 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313]"
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
          <PreviewCard
            formData={formData}
            ownRooms={ownRooms}
            isLoadingOwnRooms={isLoadingOwnRooms}
            roomCode={roomCode}
            setRoomCode={setRoomCode}
            joinError={joinError}
            isJoiningRoom={isJoiningRoom}
            handleJoinByCode={handleJoinByCode}
          />
        </div>
      </div>
    </main>
  );
}

// PREVIEW COMPONENT

const PreviewCard = ({
  formData,
  ownRooms,
  isLoadingOwnRooms,
  roomCode,
  setRoomCode,
  joinError,
  isJoiningRoom,
  handleJoinByCode,
}: {
  formData: RoomFormData;
  ownRooms: StudyRoom[];
  isLoadingOwnRooms: boolean;
  roomCode: string;
  setRoomCode: React.Dispatch<React.SetStateAction<string>>;
  joinError: string;
  isJoiningRoom: boolean;
  handleJoinByCode: () => void;
}) => {
  const navigate = useNavigate();

  return (
  <aside className="space-y-6">
    <section className="rounded-xl border border-gray-800 bg-[#1C1C1C] p-6">
      <div className="mb-4 flex items-center gap-2">
        <LogIn className="h-5 w-5 text-sky-400" />
        <h3 className="text-sm font-semibold text-white">
          Unirse con código
        </h3>
      </div>

      <input
        value={roomCode}
        onChange={(e) => {
          setRoomCode(e.target.value);
          setJoinError("");
        }}
        placeholder="Ej: ABC123"
        className="mb-3 w-full rounded-lg border border-gray-700 bg-[#121212] px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
      />

      {joinError && (
        <p className="mb-3 text-xs text-red-400">
          {joinError}
        </p>
      )}

      <button
        type="button"
        onClick={handleJoinByCode}
        disabled={isJoiningRoom}
        className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {isJoiningRoom ? "Ingresando..." : "Unirse a la sala"}
      </button>
    </section>
    <section className="rounded-xl border border-gray-800 bg-[#1C1C1C] p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Tus salas activas
          </h3>
          <p className="text-xs text-gray-500">
            Retoma una sala creada recientemente.
          </p>
        </div>
        <Users className="h-5 w-5 text-sky-400" aria-hidden="true" />
      </div>

      {isLoadingOwnRooms ? (
        <p className="text-sm text-gray-500">Cargando salas...</p>
      ) : ownRooms.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aún no tienes salas activas.
        </p>
      ) : (
        <div className="space-y-3">
          {ownRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => navigate(`/room/${room.id}`)}
              className="w-full rounded-xl border border-gray-800 bg-[#121212] p-3 text-left transition-colors hover:border-sky-700 hover:bg-[#16202A]"
            >
              <p className="line-clamp-1 text-sm font-semibold text-sky-100">
                {room.title}
              </p>
              <p className="line-clamp-1 text-xs text-gray-500">
                {room.topic || "Sin descripción"}
              </p>
              <p className="mt-2 text-[11px] font-medium text-gray-400">
                ID: <span className="font-mono text-sky-300">{room.id}</span>
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
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

    
    
  </aside>
  );
};


