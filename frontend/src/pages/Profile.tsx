import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, Save, Trash2, User } from "lucide-react";
import { auth } from "../config/firebase";
import {
  deleteUserAccount,
  getUserProfile,
  updateUserProfile,
  type UpdateUserProfileData,
  type UserProfile,
} from "../config/auth";

type FormErrors = Partial<Record<keyof UpdateUserProfileData, string>>;

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UpdateUserProfileData>({
    name: "",
    username: "",
    bio: "",
    studyArea: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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
        setFormData({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          studyArea: data.studyArea || "",
        });
      } catch (error) {
        console.error(error);
        setMessage("No pudimos cargar tu perfil.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

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

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    const confirmDelete = window.confirm(
      "¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.",
    );

    if (!confirmDelete) return;

    try {
      setDeleting(true);
      await deleteUserAccount(auth.currentUser.uid);
      navigate("/register");
    } catch (error) {
      console.error(error);
      setMessage(
        "No pudimos eliminar tu cuenta. Si iniciaste sesión hace mucho tiempo, cierra sesión, vuelve a entrar e inténtalo otra vez.",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  const handleCancelEdit = () => {
    if (!profile) return;

    setFormData({
        name: profile.name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        studyArea: profile.studyArea || "",
    });

    setErrors({});
    setMessage("");
    setIsEditing(false);
    };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-2xl font-bold text-indigo-200">
                {(profile?.name || profile?.username || "U").charAt(0).toUpperCase()}
            </div>

            <div>
                <h1 className="text-2xl font-bold">
                {profile?.name || "Usuario sin nombre"}
                </h1>
                <p className="text-sm text-indigo-300">
                @{profile?.originalUsername || profile?.username || "sin_usuario"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                {profile?.email}
                </p>
            </div>
            </div>

            {!isEditing && (
            <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
                Editar perfil
            </button>
            )}
        </div>

        {message && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 p-3 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{message}</span>
            </div>
        )}

        {!isEditing ? (
            <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                    Nombre
                </p>
                <p className="mt-1 font-semibold">
                    {profile?.name || "No configurado"}
                </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                    Usuario
                </p>
                <p className="mt-1 font-semibold">
                    @{profile?.originalUsername || profile?.username || "No configurado"}
                </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                    Área de estudio
                </p>
                <p className="mt-1 font-semibold">
                    {profile?.studyArea || "No configurada"}
                </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                    Rol
                </p>
                <p className="mt-1 font-semibold">
                    {profile?.role || "student"}
                </p>
                </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                Biografía
                </p>
                <p className="mt-2 text-slate-200">
                {profile?.bio || "Aún no has agregado una biografía."}
                </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <h2 className="font-semibold text-red-200">Zona de peligro</h2>
                <p className="mt-1 text-sm text-red-100/70">
                Esta acción eliminará tu perfil y tu cuenta de autenticación.
                </p>

                <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/90 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
                >
                {deleting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Trash2 className="h-5 w-5" />
                )}
                Eliminar cuenta
                </button>
            </div>
            </div>
        ) : (
            <form onSubmit={handleSave} className="space-y-5">
            <div>
                <label className="mb-2 block text-sm font-medium">Nombre</label>
                <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400"
                placeholder="Tu nombre"
                />
                {errors.name && (
                <p className="mt-1 text-sm text-red-300">{errors.name}</p>
                )}
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium">Usuario</label>
                <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400"
                placeholder="usuario"
                />
                {errors.username && (
                <p className="mt-1 text-sm text-red-300">{errors.username}</p>
                )}
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium">Biografía</label>
                <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400"
                placeholder="Cuéntanos algo sobre ti"
                />
                {errors.bio && (
                <p className="mt-1 text-sm text-red-300">{errors.bio}</p>
                )}
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium">
                Área de estudio
                </label>
                <input
                name="studyArea"
                value={formData.studyArea}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400"
                placeholder="Ej: Ingeniería de software"
                />
                {errors.studyArea && (
                <p className="mt-1 text-sm text-red-300">{errors.studyArea}</p>
                )}
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
                >
                {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Save className="h-5 w-5" />
                )}
                Guardar cambios
                </button>

                <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
                >
                Cancelar
                </button>
            </div>
            </form>
        )}
        </section>
    </main>
  );
}