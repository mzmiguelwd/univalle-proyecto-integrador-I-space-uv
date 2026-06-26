import { useNavigate } from "react-router-dom";
import { BookOpen, UserRound, Plus } from "lucide-react";

import { type UserProfile } from "../../config/auth.ts";

// TYPES

interface NavigationSidebarProps {
  activePage: "Inicio" | "Mi perfil";
  profile: UserProfile | null;
}

// CONSTANTS

const NAV_ITEMS = [
  {
    label: "Inicio",
    icon: BookOpen,
    route: "/dashboard",
  },
  {
    label: "Mi perfil",
    icon: UserRound,
    route: "/profile",
  },
];

// MAIN COMPONENT

export default function NavigationSidebar({
  activePage,
  profile,
}: Readonly<NavigationSidebarProps>) {
  const navigate = useNavigate();

  // DERIVED STATE

  const displayName = profile?.name || "Usuario";

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  // RENDER

  return (
    <aside className="hidden w-64 flex-col justify-between border-r border-white/5 bg-[#161617] px-6 py-8 lg:flex">
      <div>
        {/* BRAND HEADER */}
        <div>
          <h2 className="text-lg font-bold text-sky-200 select-none">
            Space UV
          </h2>
          <p className="text-xs text-zinc-500 select-none">Modo Enfoque</p>
        </div>

        {/* NAVIGATION MENU */}
        <nav aria-label="Navegación Principal" className="mt-12 space-y-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.label;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.route)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isActive
                    ? "bg-sky-900/60 text-sky-100"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM ACTIONS & PROFILE */}
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate("/create-room")}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition-colors duration-200 hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161617]"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Iniciar nueva reunión</span>
        </button>

        {/* USER CARD */}
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 overflow-hidden">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-300 text-sm font-bold text-zinc-950 select-none"
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="flex-1 overflow-hidden">
            <p
              className="truncate text-sm font-medium text-white"
              title={displayName}
            >
              {displayName}
            </p>
            <p
              className="truncate text-[10px] uppercase tracking-wider text-zinc-500"
              title={"Estudiante"}
            >
              {"Estudiante"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
