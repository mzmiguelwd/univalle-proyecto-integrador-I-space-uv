import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, LogOut, Save, Trash2 } from "lucide-react";

import { auth } from "../../../config/firebase.ts";
import {
  logoutUser,
  checkUsernameAvailability,
  deleteUserAccount,
  getUserProfile,
  updateUserProfile,
  type UpdateUserProfileData,
  type UserProfile,
} from "../../../config/auth.ts";

import NavigationSidebar from "../NavigationSidebar.tsx";
import ReAuthModal from "./ReAuthModal.tsx";

import { AVATARS } from "./constants.ts";
import { AvatarDisplay } from "./AvatarDisplay.tsx";
import { ProfileInput, InfoTile } from "./UI.tsx";
import { DeleteAccountModal } from "./DeleteAccountModal.tsx";

// TYPES

type FormErrors = Partial<Record<keyof UpdateUserProfileData, string>>;

// MAIN COMPONENT

export default function Profile() {
  const navigate = useNavigate();

  // STATES
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UpdateUserProfileData>({
    name: "",
    username: "",
    university: "",
    program: "",
  });
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  // UI STATES
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

  // EFFECTS

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigate("/login");
          return;
        }

        const data = await getUserProfile(currentUser.uid);
        if (!data) {
          navigate("/setup-profile");
          return;
        }

        setProfile(data);
        setSelectedAvatar(data.avatar ?? null);
        setFormData({
          name: data.name || "",
          username: data.username || "",
          university: data.university || "Universidad del Valle",
          program: data.program || "",
        });
      } catch (error: unknown) {
        console.error("Error loading profile configuration:", error);
        setMessage("No pudimos cargar tu perfil de estudiante.");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [navigate]);

  useEffect(() => {
    if (usernameTimeoutRef.current) {
      globalThis.clearTimeout(usernameTimeoutRef.current);
    }

    if (!isEditing || !profile) return;

    const currentUsername = (profile.username || "").toLowerCase();
    const nextUsername = (formData.username || "").trim().toLowerCase();

    if (
      !nextUsername ||
      nextUsername.length < 3 ||
      !/^[a-zA-Z0-9._]+$/.test(nextUsername) ||
      nextUsername === currentUsername
    ) {
      return;
    }

    usernameTimeoutRef.current = globalThis.setTimeout(async () => {
      try {
        if (lastCheckedUsernameRef.current === nextUsername) return;
        lastCheckedUsernameRef.current = nextUsername;
        setUsernameStatus("checking");
        const isAvailable = await checkUsernameAvailability(nextUsername);
        setUsernameStatus(isAvailable ? "available" : "unavailable");
      } catch (error: unknown) {
        console.error("Error evaluating username availability bounds:", error);
        setUsernameStatus("idle");
      }
    }, 1000);

    return () => {
      if (usernameTimeoutRef.current) {
        globalThis.clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, [formData.username, isEditing, profile]);

  // HANDLERS

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setMessage("");

    if (name === "username") {
      setUsernameStatus("idle");
    }
  };

  const handleSave = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setErrors({});

      const dataToSave: UpdateUserProfileData = { ...formData };

      if (profile?.avatarType === "emoji" && selectedAvatar) {
        dataToSave.avatar = selectedAvatar;
        dataToSave.avatarType = "emoji";
      }

      await updateUserProfile(auth.currentUser.uid, dataToSave);
      const updatedProfile = await getUserProfile(auth.currentUser.uid);

      setProfile(updatedProfile);
      setMessage("Perfil actualizado correctamente.");
      setIsEditing(false);
      setUsernameStatus("idle");
    } catch (error: unknown) {
      const isValidationError =
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error as Record<string, unknown>).type === "validation";

      if (isValidationError) {
        const validationError = error as {
          type: "validation";
          errors: FormErrors;
        };

        setErrors(validationError.errors);
        setMessage("Revisa los campos marcados del formulario.");
        return;
      }

      console.error("Error executing profile update operation:", error);
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
    setErrors({});
    setMessage("");
    setDeleteConfirmation("");
    setShowDeleteModal(false);
    setShowReAuthModal(false);
    globalThis.location.href = "/";
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "ELIMINAR") {
      setMessage("Debes escribir ELIMINAR para confirmar la acción.");
      return;
    }
    try {
      setDeleting(true);
      setShowDeleteModal(false);
      await executeDeleteAccount();
    } catch (error: unknown) {
      console.error("Error processing user data purging request:", error);

      const isAuthError =
        typeof error === "object" && error !== null && "code" in error;

      if (
        isAuthError &&
        (error as Record<string, unknown>).code === "auth/requires-recent-login"
      ) {
        setShowReAuthModal(true);
        setMessage(
          "Por seguridad, necesitamos verificar tu identidad antes de eliminar la cuenta.",
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
      university: profile.university || "Universidad del Valle",
      program: profile.program || "",
    });
    setSelectedAvatar(profile.avatar ?? null);
    setErrors({});
    setMessage("");
    setUsernameStatus("idle");
    setIsEditing(false);
  };

  // DERIVED STATES

  const displayName = profile?.name || "Usuario";
  const username = profile?.username || "Usuario";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0f10] text-white">
        <Loader2
          className="h-8 w-8 animate-spin text-sky-300"
          aria-hidden="true"
        />
      </main>
    );
  }

  // RENDER

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#0f0f10] text-white pb-16 lg:pb-0">
      <NavigationSidebar activePage="Mi perfil" profile={profile} />

      <section className="flex-1 h-full overflow-y-auto px-5 py-8 md:px-10 lg:px-14">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-sky-200">
            Perfil del estudiante
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gestiona tu información personal y credenciales académicas.
          </p>
        </header>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-100"
          >
            <AlertCircle className="h-4 w-4 text-sky-300" aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}

        <div className="mx-auto max-w-4xl space-y-6">
          {/* PROFILE HEADER BLOCK */}
          <article className="rounded-lg bg-[#202020] p-6 shadow-xl border border-white/5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <AvatarDisplay
                  profile={profile}
                  size="lg"
                  initials={initials}
                />
                <div>
                  <h2 className="text-2xl font-bold text-sky-200">
                    {displayName} (@{username})
                  </h2>
                  <p className="text-sm text-zinc-300">{profile?.email}</p>
                  <p className="text-sm text-zinc-400">
                    {profile?.program || "Programa académico no configurado"}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    <span
                      className="h-2 w-2 rounded-full bg-amber-300"
                      aria-hidden="true"
                    />
                    <span>Conectado</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing((prev) => !prev)}
                className="rounded-lg border border-zinc-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-sky-300 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                {isEditing ? "Ver perfil" : "Editar perfil"}
              </button>
            </div>
          </article>

          {/* PROFILE FORMS / VIEWER SEGMENT */}
          {isEditing ? (
            <form
              onSubmit={handleSave}
              className="rounded-lg bg-[#202020] p-6 shadow-xl border border-white/5 space-y-6"
              noValidate
            >
              <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">
                Información del perfil
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <ProfileInput
                  label="Nombre completo"
                  name="name"
                  id="edit-name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  error={errors.name}
                />

                <div className="space-y-1.5">
                  <ProfileInput
                    label="Nombre de usuario"
                    name="username"
                    id="edit-username"
                    value={formData.username || ""}
                    onChange={handleChange}
                    error={errors.username}
                  />
                  <div role="status" aria-live="polite">
                    {!errors.username && usernameStatus === "checking" && (
                      <p className="text-xs text-zinc-400 animate-pulse">
                        Verificando disponibilidad...
                      </p>
                    )}
                    {!errors.username && usernameStatus === "available" && (
                      <p className="text-xs text-green-400">
                        Nombre de usuario disponible.
                      </p>
                    )}
                    {!errors.username && usernameStatus === "unavailable" && (
                      <p className="text-xs text-red-400">
                        Este nombre de usuario ya está en uso.
                      </p>
                    )}
                  </div>
                </div>

                <ProfileInput
                  label="Universidad"
                  name="university"
                  id="edit-university"
                  value={formData.university || ""}
                  onChange={handleChange}
                  error={errors.university}
                />

                <ProfileInput
                  label="Programa académico"
                  name="program"
                  id="edit-program"
                  value={formData.program || ""}
                  onChange={handleChange}
                  error={errors.program}
                />
              </div>

              {/* AVATAR GRID FOR EMOJI USERS */}
              {profile?.avatarType === "emoji" && (
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <p className="text-xs font-semibold text-sky-300">
                    Cambiar diseño del avatar
                  </p>
                  <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.id)}
                        title={avatar.label}
                        aria-label={avatar.label}
                        aria-pressed={selectedAvatar === avatar.id}
                        className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all border-2 ${selectedAvatar === avatar.id ? "border-sky-300 bg-sky-900/40 scale-105" : "border-white/10 bg-[#181818] hover:border-white/30"}`}
                      >
                        {avatar.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row border-t border-white/5 pt-4">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    usernameStatus === "checking" ||
                    usernameStatus === "unavailable"
                  }
                  className="flex items-center justify-center gap-2 rounded-md bg-sky-300 px-5 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-sky-200 disabled:opacity-50 flex-1 sm:flex-none"
                >
                  {saving ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>Guardar cambios</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <article className="rounded-lg bg-[#202020] p-6 shadow-xl border border-white/5">
              <h3 className="text-lg font-bold text-white mb-5">
                Información académica
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoTile
                  label="Universidad"
                  value={profile?.university || "Universidad del Valle"}
                />
                <InfoTile
                  label="Programa"
                  value={profile?.program || "No configurado"}
                />
              </div>
            </article>
          )}

          {/* BASE CORE UTILITIES ACTIONS */}
          <div className="flex flex-col gap-3 sm:flex-row pt-2">
            <button
              type="button"
              onClick={logoutUser}
              className="flex items-center justify-center gap-2 rounded-md bg-sky-300 px-5 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center justify-center gap-2 rounded-md border border-amber-400/60 px-5 py-3 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-400/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Eliminar cuenta</span>
            </button>
          </div>
        </div>
      </section>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmation("");
        }}
        onConfirm={handleDeleteAccount}
        deleting={deleting}
        deleteConfirmation={deleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
      />

      <ReAuthModal
        isOpen={showReAuthModal}
        onClose={() => setShowReAuthModal(false)}
        onSuccess={executeDeleteAccount}
      />
    </main>
  );
}
