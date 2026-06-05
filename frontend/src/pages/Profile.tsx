import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  Clock,
  Loader2,
  LogOut,
  Save,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { auth } from "../config/firebase";
import { logoutUser } from "../config/auth";
import {
  checkUsernameAvailability,
  deleteUserAccount,
  getUserProfile,
  updateUserProfile,
  type UpdateUserProfileData,
  type UserProfile,
} from "../config/auth";
import ReAuthModal from "../components/auth/ReAuthModal";
import FocusTrap from "../components/accessibility/FocusTrap";

import RoomCard from "../components/rooms/RoomCard";
import RoomsEmptyState from "../components/rooms/RoomsEmptyState";
import {
  getOwnStudyRooms,
  type StudyRoom,
} from "../config/rooms";

type FormErrors = Partial<Record<keyof UpdateUserProfileData, string>>;



const navItems = [
  { label: "Inicio", icon: BookOpen },
  { label: "Mis sesiones", icon: Clock },
  { label: "Comunidad", icon: Users },
  { label: "Mi perfil", icon: UserRound, active: true },
];

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UpdateUserProfileData>({
    name: "",
    username: "",
    bio: "",
    studyArea: "",
    university: "",
    program: "",
    interests: "",
    availability: "",
    notificationsEnabled: true,
    studyMode: "Deep Work",
    visibleStatus: true,
    dailyGoalHours: 6,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");
  const usernameTimeoutRef = useRef<number | null>(null);
  const lastCheckedUsernameRef = useRef("");
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          navigate("/login");
          return;
        }

        const data = await getUserProfile(currentUser.uid);

        try {
          const ownRooms = await getOwnStudyRooms(currentUser.uid);
          setRooms(ownRooms);
        } catch (roomsError) {
          console.error("Error cargando salas:", roomsError);
          setRooms([]);
        }

        if (!data) {
          navigate("/setup-profile");
          return;
        }

        setProfile(data);
        setFormData({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          studyArea: data.studyArea || "",
          university: data.university || "Universidad del Valle",
          program: data.program || "",
          interests: data.interests || "",
          availability: data.availability || "",
          notificationsEnabled: data.notificationsEnabled ?? true,
          studyMode: data.studyMode || "Deep Work",
          visibleStatus: data.visibleStatus ?? true,
          dailyGoalHours: data.dailyGoalHours ?? 6,
        });
      } catch (error) {
        console.error(error);
        setMessage("No pudimos cargar tu perfil.");
      } finally {
        setLoading(false);
        setIsLoadingRooms(false);
      }
    };

    loadProfile();
  }, [navigate]);

  useEffect(() => {
    if (usernameTimeoutRef.current) {
      window.clearTimeout(usernameTimeoutRef.current);
    }

    if (!isEditing || !profile) return;

    const currentUsername = (profile.username || "").toLowerCase();
    const nextUsername = formData.username.trim().toLowerCase();

    if (!nextUsername || nextUsername.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    if (!/^[a-zA-Z0-9._]+$/.test(nextUsername)) {
      setUsernameStatus("idle");
      return;
    }

    if (nextUsername === currentUsername) {
      setUsernameStatus("idle");
      return;
    }

    usernameTimeoutRef.current = window.setTimeout(async () => {
      try {
        if (lastCheckedUsernameRef.current === nextUsername) return;

        lastCheckedUsernameRef.current = nextUsername;
        setUsernameStatus("checking");

        const isAvailable = await checkUsernameAvailability(nextUsername);

        setUsernameStatus(isAvailable ? "available" : "unavailable");
      } catch (error) {
        console.error("Error al verificar username:", error);
        setUsernameStatus("idle");
      }
    }, 1000);

    return () => {
      if (usernameTimeoutRef.current) {
        window.clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, [formData.username, isEditing, profile]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));

    setMessage("");
  };

  const handleBooleanChange = (name: "notificationsEnabled" | "visibleStatus") => {
  setFormData((prev) => ({
    ...prev,
    [name]: !prev[name],
  }));

  setMessage("");
};

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: Number(value),
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));

    setMessage("");
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setErrors({});

      await updateUserProfile(auth.currentUser.uid, formData);

      const updatedProfile = await getUserProfile(auth.currentUser.uid);
      setProfile(updatedProfile);

      setMessage("Perfil actualizado correctamente.");
      setIsEditing(false);
      setUsernameStatus("idle");
    } catch (error: any) {
      if (error?.type === "validation") {
        setErrors(error.errors);
        setMessage("Revisa los campos marcados.");
        return;
      }

      console.error(error);
      setMessage("No pudimos actualizar tu perfil.");
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteAccount = async () => {
    if (!auth.currentUser) {
      navigate("/");
      return;
    }

    await deleteUserAccount(auth.currentUser.uid);

    setProfile(null);
    setFormData({
      name: "",
      username: "",
      bio: "",
      studyArea: "",
      university: "",
      program: "",
      interests: "",
      availability: "",
      notificationsEnabled: true,
      studyMode: "Deep Work",
      visibleStatus: true,
      dailyGoalHours: 6,
    });

    setErrors({});
    setMessage("");
    setDeleteConfirmation("");
    setShowDeleteModal(false);
    setShowReAuthModal(false);

    window.location.href = "/";
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "ELIMINAR") {
      setMessage("Debes escribir ELIMINAR para confirmar la eliminación.");
      return;
    }

    try {
      setDeleting(true);
      setShowDeleteModal(false);
      await executeDeleteAccount();
    } catch (error: any) {
      console.error(error);

      if (error?.code === "auth/requires-recent-login") {
        setShowReAuthModal(true);
        setMessage(
          "Por seguridad necesitamos verificar tu identidad antes de eliminar la cuenta.",
        );
        return;
      }

      setMessage("No pudimos eliminar tu cuenta. Inténtalo nuevamente.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    if (!profile) return;

    setFormData({
      name: profile.name || "",
      username: profile.username || "",
      bio: profile.bio || "",
      studyArea: profile.studyArea || "",
      university: profile.university || "Universidad del Valle",
      program: profile.program || "",
      interests: profile.interests || "",
      availability: profile.availability || "",
      notificationsEnabled: profile.notificationsEnabled ?? true,
      studyMode: profile.studyMode || "Deep Work",
      visibleStatus: profile.visibleStatus ?? true,
      dailyGoalHours: profile.dailyGoalHours ?? 6,
    });

    setErrors({});
    setMessage("");
    setUsernameStatus("idle");
    setIsEditing(false);
    
  };

  const displayName = profile?.name || "Usuario sin nombre";
  
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0f10] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-sky-300" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0f10] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-72 flex-col justify-between border-r border-white/5 bg-[#161617] px-6 py-8 lg:flex">
          <div>
            <div>
              <h2 className="text-lg font-bold text-sky-200">
                EstudioSíncrono
              </h2>
              <p className="text-xs text-zinc-500">Deep Work Mode</p>
            </div>

            <nav className="mt-12 space-y-3">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => item.label === "Inicio" && navigate("/dashboard")}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition ${
                      item.active
                        ? "bg-sky-900/60 text-sky-100"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-6">
            <button
              type="button"
              className="flex w-full items-center justify-center rounded-lg bg-sky-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-sky-200"
            >
              + Iniciar nueva sesión
            </button>

            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-300 text-sm font-bold text-zinc-950">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {profile?.role || "Student"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 px-5 py-8 md:px-10 lg:px-14">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-sky-200">
              Perfil del estudiante
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Gestiona tu información, preferencias de estudio y actividad
              reciente.
            </p>
          </div>

          {message && (
            <div
              role="status"
              aria-live="polite"
              className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-zinc-100"
            >
              <AlertCircle className="h-4 w-4 text-sky-300" />
              <span>{message}</span>
            </div>
          )}

          <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <article className="rounded-lg bg-[#202020] p-6 shadow-xl">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-5">
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-sky-300 text-3xl font-bold text-zinc-950">
                      {initials}
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-sky-200">
                        {displayName}
                      </h2>
                      <p className="text-sm text-zinc-300">{profile?.email}</p>
                      <p className="text-sm text-zinc-400">
                        {profile?.studyArea || "Área de estudio no configurada"}
                      </p>

                      <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                        <span className="h-2 w-2 rounded-full bg-amber-300" />
                        En línea
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditing((prev) => !prev)}
                    className="rounded border border-zinc-500 px-6 py-3 text-sm font-semibold text-white transition hover:border-sky-300 hover:text-sky-200"
                  >
                    {isEditing ? "Ver perfil" : "Editar perfil"}
                  </button>
                </div>
              </article>

              {isEditing ? (
                <form
                  onSubmit={handleSave}
                  className="rounded-lg bg-[#202020] p-6 shadow-xl"
                >
                  <h3 className="mb-5 text-lg font-bold">
                    Editar información del perfil
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <ProfileInput
                      label="Nombre"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      error={errors.name}
                    />

                    <div>
                      <ProfileInput
                        label="Usuario"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        error={errors.username}
                      />

                      <div role="status" aria-live="polite">

                      {!errors.username && usernameStatus === "checking" && (
                        <p className="mt-1 text-xs text-zinc-400">
                          Verificando disponibilidad...
                        </p>
                      )}

                      {!errors.username && usernameStatus === "available" && (
                        <p className="mt-1 text-xs text-green-300">
                          Username disponible.
                        </p>
                      )}

                      {!errors.username && usernameStatus === "unavailable" && (
                        <p className="mt-1 text-xs text-red-300">
                          Este nombre de usuario ya está en uso.
                        </p>
                      )}
                      </div>
                    </div>

                    <ProfileInput
                      label="Área de estudio"
                      name="studyArea"
                      value={formData.studyArea || ""}
                      onChange={handleChange}
                      error={errors.studyArea}
                    />
                    <ProfileInput
                      label="Universidad"
                      name="university"
                      value={formData.university || ""}
                      onChange={handleChange}
                      error={errors.university}
                    />

                    <ProfileInput
                      label="Programa"
                      name="program"
                      value={formData.program || ""}
                      onChange={handleChange}
                      error={errors.program}
                    />

                    <ProfileInput
                      label="Intereses"
                      name="interests"
                      value={formData.interests || ""}
                      onChange={handleChange}
                      error={errors.interests}
                    />

                    <ProfileInput
                      label="Disponibilidad"
                      name="availability"
                      value={formData.availability || ""}
                      onChange={handleChange}
                      error={errors.availability}
                    />

                    <ProfileInput
                      label="Modo de estudio"
                      name="studyMode"
                      value={formData.studyMode || ""}
                      onChange={handleChange}
                      error={errors.studyMode}
                    />

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-sky-300">
                        Meta diaria de estudio
                      </label>
                      <input
                        name="dailyGoalHours"
                        type="number"
                        min={1}
                        max={24}
                        value={formData.dailyGoalHours || 6}
                        onChange={handleNumberChange}
                        className="w-full rounded-md border border-white/5 bg-[#181818] px-4 py-3 text-sm outline-none transition focus:border-sky-300"
                      />
                      {errors.dailyGoalHours && (
                        <p className="mt-1 text-xs text-red-300">{errors.dailyGoalHours}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-md border border-white/5 bg-[#181818] px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-sky-300">Notificaciones</p>
                        <p className="text-xs text-zinc-500">
                          Recibir avisos de actividad y sesiones.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBooleanChange("notificationsEnabled")}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          formData.notificationsEnabled
                            ? "bg-sky-300 text-zinc-950"
                            : "bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {formData.notificationsEnabled ? "Activas" : "Inactivas"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-md border border-white/5 bg-[#181818] px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-sky-300">Estado visible</p>
                        <p className="text-xs text-zinc-500">
                          Mostrar si estás disponible para estudiar.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBooleanChange("visibleStatus")}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          formData.visibleStatus
                            ? "bg-sky-300 text-zinc-950"
                            : "bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {formData.visibleStatus ? "Visible" : "Oculto"}
                      </button>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold text-sky-300">
                        Biografía
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={4}
                        className="w-full resize-none rounded-md border border-white/5 bg-[#181818] px-4 py-3 text-sm outline-none transition focus:border-sky-300"
                        placeholder="Cuéntanos algo sobre ti"
                      />
                      {errors.bio && (
                        <p className="mt-1 text-xs text-red-300">
                          {errors.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={saving || usernameStatus === "checking" || usernameStatus === "unavailable"}
                      className="flex items-center justify-center gap-2 rounded-md bg-sky-300 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-sky-200 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Guardar cambios
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <article className="rounded-lg bg-[#202020] p-6 shadow-xl">
                    <h3 className="mb-5 text-lg font-bold">
                      Información académica
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoTile
                        label="Universidad"
                        value={profile?.university || "Universidad del Valle"}
                      />
                      <InfoTile
                        label="Programa"
                        value={profile?.program || profile?.studyArea || "No configurado"}
                      />
                      <InfoTile
                        label="Intereses"
                        value={profile?.interests || profile?.bio || "No configurados"}
                      />
                      <InfoTile
                        label="Disponibilidad"
                        value={profile?.availability || "No configurada"}
                      />
                    </div>
                  </article>

                  <article className="rounded-lg bg-[#202020] p-6 shadow-xl">
                    <h3 className="mb-5 text-lg font-bold">Salas recientes</h3>

                    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                      {isLoadingRooms ? (
                        <div className="rounded-xl border border-white/10 bg-[#202020] p-6 text-sm text-zinc-400">
                          Cargando salas...
                        </div>
                      ) : rooms.length > 0 ? (
                        rooms.map((room) => (
                          <RoomCard key={room.id} room={room} />
                        ))
                      ) : (
                        <RoomsEmptyState />
                      )}
                      
                    </div>
                  </article>
                </>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={logoutUser}
                  className="flex items-center justify-center gap-2 rounded-md bg-sky-300 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-sky-200"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center justify-center gap-2 rounded-md border border-amber-400/60 px-5 py-3 text-sm font-bold text-amber-300 transition hover:bg-amber-400/10 disabled:opacity-60"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Eliminar cuenta
                </button>
              </div>
            </div>

            <aside className="space-y-6">
              <StatsCard
                title="Resumen de actividad"
                items={[
                  ["Horas esta semana", "12 h"],
                  ["Sesiones completadas", "8"],
                  ["Salas creadas", "6"],
                ]}
              />

              <article className="rounded-lg bg-[#202020] p-6 shadow-xl">
                <h3 className="font-bold">Meta diaria</h3>
                <p className="mt-4 text-sm text-zinc-400">
                  0 h / {profile?.dailyGoalHours || 6} h · 0% completado
                </p>
                <div className="mt-3 h-2 rounded-full bg-zinc-700">
                  <div className="h-2 w-0 rounded-full bg-amber-400" />
                </div>
              </article>

              <StatsCard
                title="Preferencias"
                items={[
                  [
                    "Notificaciones",
                    profile?.notificationsEnabled ?? true ? "Activas" : "Inactivas",
                  ],
                  ["Modo de estudio", profile?.studyMode || "Deep Work"],
                  ["Estado visible", profile?.visibleStatus ?? true ? "Sí" : "No"],
                ]}
              />
            </aside>
          </div>
        </section>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <FocusTrap
            isActive={showDeleteModal}
            onEscape={() => {
              setShowDeleteModal(false);
              setDeleteConfirmation("");
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#202020] p-6 text-white shadow-2xl">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-red-200">
                  Eliminar cuenta
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Esta acción es permanente. Se eliminará tu perfil, tu nombre de
                  usuario reservado y tu cuenta de autenticación.
                </p>
              </div>

              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                <p className="font-semibold">Antes de continuar:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>No podrás recuperar tu cuenta después de eliminarla.</li>
                  <li>Tu username quedará liberado para otros usuarios.</li>
                  <li>Se cerrará tu sesión automáticamente.</li>
                </ul>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-semibold text-red-200">
                  Escribe ELIMINAR para confirmar
                </label>
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className="w-full rounded-md border border-white/5 bg-[#181818] px-4 py-3 text-sm outline-none transition focus:border-red-300"
                  placeholder="ELIMINAR"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation("");
                  }}
                  className="flex-1 rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={deleting || deleteConfirmation !== "ELIMINAR"}
                  onClick={handleDeleteAccount}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}

      <ReAuthModal
        isOpen={showReAuthModal}
        onClose={() => setShowReAuthModal(false)}
        onSuccess={executeDeleteAccount}
      />
    </main>
  );
}

type ProfileInputProps = {
  label: string;
  name: keyof UpdateUserProfileData;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  error?: string;
};

function ProfileInput({
  label,
  name,
  value,
  onChange,
  error,
}: ProfileInputProps) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-sky-300">
        {label}
      </label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-md border border-white/5 bg-[#181818] px-4 py-3 text-sm outline-none transition focus:border-sky-300"
      />
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#181818] p-4">
      <p className="text-xs text-sky-300">{label}</p>
      <p className="mt-1 text-sm text-zinc-200">{value}</p>
    </div>
  );
}



function StatsCard({
  title,
  items,
}: {
  title: string;
  items: Array<[string, string]>;
}) {
  return (
    <article className="rounded-lg bg-[#202020] p-6 shadow-xl">
      <h3 className="font-bold">{title}</h3>

      <div className="mt-5 space-y-3">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">{label}</span>
            <span className="font-semibold text-sky-300">{value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}