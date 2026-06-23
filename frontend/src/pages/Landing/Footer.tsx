import { Link } from "react-router-dom";
import { FaInstagram, FaLinkedin, FaXTwitter } from "react-icons/fa6";

// CONSTANTS

const FOOTER_SECTIONS = [
  {
    title: "PRODUCTO",
    items: [
      { label: "Características", href: "/caracteristicas" },
      { label: "Salas Públicas", href: "/salas" },
    ],
  },
  {
    title: "COMPAÑÍA",
    items: [
      { label: "Sobre nosotros", href: "/nosotros" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "SOPORTE",
    items: [
      { label: "Ayuda", href: "/ayuda" },
      { label: "Privacidad", href: "/privacidad" },
      { label: "Términos", href: "/terminos" },
    ],
  },
];

// MAIN COMPONENT

export default function Footer() {
  // RENDER

  return (
    <footer className="w-full bg-[#201f1f] border-t border-[#40484e4c] px-6 py-12 md:px-16">
      {/* TOP SECTION */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 md:grid-cols-4 gap-12 pb-16">
        {/* BRANDING & DESCRIPTION */}
        <div className="flex flex-col gap-4">
          <h2 className="font-['Sora'] text-2xl font-bold text-[#8ecdfd]">
            Space UV
          </h2>
          <p className="text-base text-[#c0c7cf] leading-relaxed">
            Redefiniendo el estudio digital a través de la presencia y la
            comunidad.
          </p>
        </div>

        {/* FOOTER LINKS MAP */}
        {FOOTER_SECTIONS.map((section) => (
          <nav
            key={section.title}
            aria-label={section.title}
            className="flex flex-col gap-6"
          >
            <h3 className="text-xs font-medium tracking-wide text-[#e5e2e1]">
              {section.title}
            </h3>
            <ul className="flex flex-col gap-4">
              {section.items.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="text-base text-[#c0c7cf] transition-colors hover:text-[#8ecdfd]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* BOTTOM SECTION */}
      <div className="mx-auto flex w-full max-w-7xl flex-col-reverse md:flex-row items-center justify-between gap-6 border-t border-[#40484e33] pt-8">
        <p className="text-center text-base text-[#c0c7cf99]">
          © {new Date().getFullYear()} Space UV. Todos los derechos reservados.
        </p>

        {/* SOCIAL LINKS */}
        <div className="flex items-center gap-6">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-[#c0c7cf] transition-colors hover:text-[#8ecdfd]"
          >
            <FaInstagram size={20} />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter)"
            className="text-[#c0c7cf] transition-colors hover:text-[#8ecdfd]"
          >
            <FaXTwitter size={20} />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-[#c0c7cf] transition-colors hover:text-[#8ecdfd]"
          >
            <FaLinkedin size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
}
