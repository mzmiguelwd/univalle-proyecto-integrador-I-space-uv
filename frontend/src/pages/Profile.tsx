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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-500/20 p-3">
            <User className="h-6 w-6 text-indigo-300" />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Mi perfil</h1>
            <p className="text-sm text-slate-300">
              Consulta, edita o elimina tu cuenta.
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 p-3 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{message}</span>
          </div>
        )}

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

          <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-300">
            <p>
              <strong>Email:</strong> {profile?.email}
            </p>
            <p>
              <strong>Rol:</strong> {profile?.role || "student"}
            </p>
            <p>
              <strong>Proveedor:</strong> {profile?.provider || "email"}
            </p>
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
              disabled={deleting}
              onClick={handleDeleteAccount}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-3 font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
              Eliminar cuenta
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}