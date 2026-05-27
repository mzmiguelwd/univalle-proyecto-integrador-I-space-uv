import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";

const navItems = [
  { label: "Home", href: "#", active: true },
  { label: "Explore", href: "#", active: false },
  { label: "Rooms", href: "#", active: false },
  { label: "Community", href: "#", active: false },
];

export const LandingHeaderSection = () => {
  return (
    <header className="fixed top-0 left-0 z-50 flex w-full items-center justify-between border-b border-[#40484e4c] bg-[#131313cc] px-16 py-4 backdrop-blur-md max-md:px-6">
      {/* Logo */}
      <a
        href="#"
        aria-label="EstudioSíncrono home"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ecdfd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313]"
      >
        <h1 className="font-['Sora'] text-2xl font-bold tracking-[-0.03em] text-[#8ecdfd]">
          EstudioSíncrono
        </h1>
      </a>

      {/* Navigation */}
      <nav
        aria-label="Primary"
        className="hidden md:flex items-center gap-8"
      >
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`text-xs font-medium tracking-[0.60px] transition-colors hover:text-[#8ecdfd] ${
              item.active
                ? "text-[#8ecdfd] border-b-2 border-[#8ecdfd] pb-1"
                : "text-[#c0c7cf]"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* CTA */}
      <div className="flex items-center gap-6">
        <Link
            to="/login"
            aria-label="Iniciar sesión"
            className="
                inline-flex
                items-center
                gap-2
                rounded-lg
                bg-[#8ecdfd]
                px-5
                py-2.5
                font-['Inter']
                text-sm
                font-semibold
                text-[#00344e]
                transition-all
                duration-300
                hover:scale-[1.03]
                cursor-pointer
                hover:bg-[#a5d7fd]
                hover:shadow-lg
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-white
                focus-visible:ring-offset-2
                focus-visible:ring-offset-[#131313]
            "
            >
            <LogIn className="w-4 h-4" />
            Entrar
        </Link>
      </div>
    </header>
  );
};

export default LandingHeaderSection;