import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";

const NAV_ITEMS = [
  { label: "Inicio", path: "/", active: true },
  { label: "Explorar", path: "/explorar", active: false },
  { label: "Salas", path: "/salas", active: false },
  { label: "Comunidad", path: "/comunidad", active: false },
];

export default function Header() {
  return (
    <header className="fixed top-0 left-0 z-50 flex w-full items-center justify-between border-b border-[#40484e4c] bg-[#131313cc] px-6 py-4 backdrop-blur-md md:px-16">
      {/* Brand Logo */}
      <Link
        to="/"
        aria-label="Space UV Inicio"
        className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ecdfd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313]"
      >
        <h1 className="font-['Sora'] text-2xl font-bold tracking-tight text-[#8ecdfd]">
          Space UV
        </h1>
      </Link>

      {/* Primary Navigation */}
      <nav
        aria-label="Navegación Principal"
        className="hidden md:flex items-center gap-8"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            aria-current={item.active ? "page" : undefined}
            className={`text-xs font-medium tracking-wide transition-colors hover:text-[#8ecdfd] ${
              item.active
                ? "border-b-2 border-[#8ecdfd] pb-1 text-[#8ecdfd]"
                : "text-[#c0c7cf]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Call to Action */}
      <div className="flex items-center gap-6">
        <Link
          to="/login"
          aria-label="Iniciar sesión"
          className="inline-flex items-center gap-2 rounded-lg bg-[#8ecdfd] px-5 py-2.5 font-['Inter'] text-sm font-semibold text-[#00344e] transition-all duration-300 hover:scale-105 hover:bg-[#a5d7fd] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313]"
        >
          <LogIn className="w-4 h-4" />
          <span>Entrar</span>
        </Link>
      </div>
    </header>
  );
}
