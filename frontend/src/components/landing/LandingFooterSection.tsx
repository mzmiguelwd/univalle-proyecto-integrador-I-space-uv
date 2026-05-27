import { FaInstagram, FaLinkedin, FaXTwitter } from "react-icons/fa6";

const footerSections = [
  {
    title: "PRODUCTO",
    items: ["Características", "Salas Públicas"],
  },
  {
    title: "COMPAÑÍA",
    items: ["Sobre nosotros", "Blog"],
  },
  {
    title: "SOPORTE",
    items: ["Ayuda", "Privacidad", "Términos"],
  },
];

export const LandingFooterSection = () => {
  return (
    <footer className="flex flex-col items-start gap-16 p-16 relative self-stretch w-full bg-[#201f1f] border-t border-[#40484e4c] max-md:px-6 max-md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-screen-xl w-full mx-auto">
        {/* Branding */}
        <div className="flex flex-col items-start gap-6">
          <div>
            <h2 className="font-bold text-[#8ecdfd] text-2xl leading-8">
              EstudioSíncrono
            </h2>
          </div>

          <div>
            <p className="text-[#c0c7cf] text-base leading-6">
              Redefiniendo el estudio digital a
              <br />
              través de la presencia y la
              <br />
              comunidad.
            </p>
          </div>
        </div>

        {/* Links */}
        {footerSections.map((section) => (
          <nav
            key={section.title}
            aria-label={section.title}
            className="flex flex-col items-start gap-6"
          >
            <h3 className="font-medium text-[#e5e2e1] text-xs tracking-[0.60px] leading-4">
              {section.title}
            </h3>

            <ul className="flex flex-col gap-4 w-full">
              {section.items.map((item) => (
                <li key={item} className="list-none">
                  <a
                    href="#"
                    className="text-[#c0c7cf] text-base leading-6 hover:text-[#8ecdfd] transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Bottom */}
      <div className="flex max-w-screen-xl items-center justify-between pt-8 border-t border-[#40484e33] w-full mx-auto max-md:flex-col max-md:gap-6">
        <p className="text-[#c0c7cf99] text-base leading-6 text-center">
          © 2026 EstudioSíncrono. Todos los derechos reservados.
        </p>

        {/* Socials */}
        <div className="flex items-center gap-4">
          <a
            href="#"
            aria-label="Instagram"
            className="text-[#c0c7cf] hover:text-[#8ecdfd] transition-colors"
          >
            <FaInstagram size={20} />
          </a>

          <a
            href="#"
            aria-label="X"
            className="text-[#c0c7cf] hover:text-[#8ecdfd] transition-colors"
          >
            <FaXTwitter size={20} />
          </a>

          <a
            href="#"
            aria-label="LinkedIn"
            className="text-[#c0c7cf] hover:text-[#8ecdfd] transition-colors"
          >
            <FaLinkedin size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooterSection;