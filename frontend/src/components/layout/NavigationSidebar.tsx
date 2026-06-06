import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Users,
  UserRound,
  Plus,
} from "lucide-react";

import { type UserProfile } from "../../config/auth";

type Props = {
  activePage: "Inicio" | "Mis sesiones" | "Comunidad" | "Mi perfil";
  profile: UserProfile | null;
};

const navItems = [
  {
    label: "Inicio",
    icon: BookOpen,
    route: "/dashboard",
  },
  {
    label: "Mis sesiones",
    icon: Clock,
    route: "/sessions",
  },
  {
    label: "Comunidad",
    icon: Users,
    route: "/community",
  },
  {
    label: "Mi perfil",
    icon: UserRound,
    route: "/profile",
  },
];

export default function NavigationSidebar({
  activePage,
  profile,
}: Props) {
  const navigate = useNavigate();

  const displayName = profile?.name || "Usuario";

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <aside
      className="
        hidden
        lg:flex
        w-72
        flex-col
        justify-between
        border-r
        border-white/5
        bg-[#161617]
        px-6
        py-8
      "
    >
      <div>
        <div>
          <h2 className="text-lg font-bold text-sky-200">
            EstudioSíncrono
          </h2>

          <p className="text-xs text-zinc-500">
            Deep Work Mode
          </p>
        </div>

        <nav className="mt-12 space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.route)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition ${
                  activePage === item.label
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
          className="
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-lg
            bg-sky-300
            px-4
            py-3
            text-sm
            font-semibold
            text-zinc-950
            transition
            hover:bg-sky-200
          "
        >
          <Plus className="h-4 w-4" />
          Iniciar nueva sesión
        </button>

        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-lg
              bg-sky-300
              text-sm
              font-bold
              text-zinc-950
            "
          >
            {initials}
          </div>

          <div>
            <p className="text-sm font-medium">
              {displayName}
            </p>

            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              {profile?.role || "Student"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}