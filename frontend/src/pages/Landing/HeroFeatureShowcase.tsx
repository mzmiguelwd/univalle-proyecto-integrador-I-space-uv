import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";

import iconSync from "../../assets/landing/icon-1.svg";
import iconFeature from "../../assets/landing/icon-2.svg";
import iconCalm from "../../assets/landing/icon-3.svg";
import iconCommunity from "../../assets/landing/icon-4.svg";

// CONSTANTS

const COMMUNITY_FEATURES = [
  { icon: iconFeature, text: "Compartir pantalla instantáneo" },
  { icon: iconFeature, text: "Hilos de discusión organizados" },
];

const CALM_COLORS = ["bg-[#8ecdfd33]", "bg-[#d2c5af33]", "bg-[#fabb6833]"];

// MAIN COMPONENT

export default function HeroFeatureShowcase() {
  // RENDER

  return (
    <section className="w-full flex flex-col">
      {/* ── HERO SECTION ── */}
      <div className="w-full bg-[#131313] px-6 py-20 md:px-16 md:py-32">
        <div className="mx-auto flex max-w-7xl flex-col lg:flex-row items-center justify-between gap-12">
          {/* HERO CONTENT */}
          <div className="flex flex-1 flex-col gap-8 w-full">
            <header>
              <h1 className="font-['Sora'] text-4xl md:text-5xl font-bold text-[#8ecdfd] leading-tight tracking-tight">
                Tu espacio de estudio,
                <br />
                estés donde estés.
              </h1>
            </header>

            <p className="font-['Inter'] text-lg text-[#c0c7cf] leading-relaxed max-w-xl">
              Conéctate con estudiantes de todo el mundo en salas de estudio
              síncronas. Encuentra el foco que necesitas con un espacio diseñado
              para la productividad y la calma.
            </p>

            <Link
              to="/register"
              aria-label="Crear cuenta"
              className="inline-flex w-full sm:w-fit min-w-85 items-center justify-center gap-3 rounded-xl bg-[#8ecdfd] px-8 py-5 transition-all duration-300 hover:scale-105 hover:bg-[#a5d7fd] shadow-lg"
            >
              <UserPlus className="w-5 h-5 text-[#00344e]" />
              <span className="font-['Inter'] text-lg font-medium tracking-wide text-[#00344e]">
                Quiero registrarme
              </span>
            </Link>
          </div>

          {/* HERO IMAGE */}
          <div className="flex-1 w-full rounded-2xl overflow-hidden border border-[#40484e4c] shadow-2xl relative bg-[#ffffff01]">
            <img
              src="/students-studying.png"
              alt="Grupo diverso de estudiantes universitarios estudiando en un entorno moderno"
              className="h-75 w-full md:h-103 object-cover object-center"
            />

            {/* LIVE COUNTER BADGE */}
            <div className="absolute bottom-6 left-6 inline-flex items-center gap-3 rounded bg-[#201f1fe6] px-4 py-3 border border-[#40484e] backdrop-blur-sm">
              <div
                className="h-3 w-3 rounded-full bg-[#d2c5af] animate-pulse"
                aria-hidden="true"
              />
              <p className="font-['JetBrains_Mono'] text-xs font-medium tracking-wide text-[#e5e2e1]">
                1,240 estudiantes conectados
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div className="w-full bg-[#1c1b1b] px-6 py-16 md:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-16">
          <header className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-['Sora'] text-2xl font-semibold text-[#8ecdfd]">
              Herramientas
            </h2>
            <p className="font-['Inter'] text-base text-[#c0c7cf] max-w-md">
              Diseñado para minimizar distracciones y maximizar tu progreso.
            </p>
          </header>

          {/* FeEATURES GRID*/}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* FEATURE 1: SYNC PRESENCE */}
            <article className="flex flex-col justify-between rounded-lg border border-[#40484e33] bg-[#0e0e0e] p-8 lg:col-span-1">
              <div className="flex flex-col gap-4 mb-8">
                <img
                  src={iconSync}
                  alt="Icono de presencia síncrona"
                  className="h-6.5 w-8.25"
                />
                <h3 className="font-['Sora'] text-2xl font-semibold text-[#e5e2e1]">
                  Presencia Síncrona
                </h3>
                <p className="font-['Inter'] text-base text-[#c0c7cf] leading-relaxed">
                  Siente la compañía de otros sin la presión del ruido. Video y
                  audio opcional para sesiones enfocadas.
                </p>
              </div>
              <div className="h-40 w-full overflow-hidden rounded bg-[#201f1f]">
                <img
                  src="/student-focus-session.png"
                  alt="Sesión de estudio enfocada"
                  className="h-full w-full object-cover object-center opacity-60"
                />
              </div>
            </article>

            {/* FEATURE 2: COMMUNITY */}
            <article className="flex flex-col md:flex-row items-center gap-8 rounded-lg border border-[#d2c5af33] bg-[#4e46351a] p-8 lg:col-span-2">
              <div className="flex w-full md:w-82.5 flex-col gap-4">
                <img
                  src={iconCommunity}
                  alt="Icono de comunidad de aprendizaje"
                  className="h-6.5 w-9"
                />
                <h3 className="font-['Sora'] text-2xl font-semibold text-[#8ecdfd]">
                  Comunidad de Aprendizaje
                </h3>
                <p className="font-['Inter'] text-base text-[#c0c7cf] leading-relaxed">
                  Chat grupal por temas, intercambio de recursos y resolución de
                  dudas en tiempo real.
                </p>
                <ul className="mt-2 flex flex-col gap-3">
                  {COMMUNITY_FEATURES.map((item) => (
                    <li key={item.text} className="flex items-center gap-3">
                      <img
                        src={item.icon}
                        alt=""
                        aria-hidden="true"
                        className="h-3.75 w-3.75"
                      />
                      <span className="font-['JetBrains_Mono'] text-xs font-medium tracking-wide text-[#d2c5af]">
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-h-62.5 w-full md:w-83 overflow-hidden rounded-lg border border-[#40484e4c] bg-[#ffffff01] shadow-lg">
                <img
                  src="/collaborative-digital-interface.png"
                  alt="Interfaz digital colaborativa"
                  className="h-full w-full object-cover object-center"
                />
              </div>
            </article>

            {/* FEATURE 3: VISUAL CALM */}
            <article className="flex flex-col justify-between rounded-lg border border-[#40484e33] bg-[#0e0e0e] p-8 lg:col-span-1 lg:col-start-2">
              <div className="flex flex-col gap-4 mb-8">
                <img
                  src={iconCalm}
                  alt="Icono de calma visual"
                  className="h-6.25 w-9"
                />
                <h3 className="font-['Sora'] text-2xl font-semibold text-[#e5e2e1]">
                  Calma Visual
                </h3>
                <p className="font-['Inter'] text-base text-[#c0c7cf] leading-relaxed">
                  Interfaz limpia que reduce la fatiga cognitiva. Colores suaves
                  y tipografía legible para largas sesiones.
                </p>
              </div>
              <div className="flex w-full items-center gap-2 pt-8">
                {CALM_COLORS.map((barClass) => (
                  <div
                    key={barClass}
                    className={`h-2 flex-1 rounded-xl ${barClass}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>

      {/* FINAL CTA SECTION */}
      <div className="w-full bg-[#131313] px-6 py-20 lg:px-48 lg:py-32">
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 overflow-hidden rounded-3xl border border-[#8ecdfd33] bg-[#5797c433] p-10 md:p-24 text-center">
          {/* DECORATIVE GLOWS */}
          <div
            className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[#8ecdfd1a] blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#d2c5af1a] blur-3xl"
            aria-hidden="true"
          />

          <h2 className="font-['Sora'] text-4xl md:text-5xl font-bold tracking-tight text-[#8ecdfd] leading-tight">
            ¿Listo para elevar tu <br /> productividad?
          </h2>

          <p className="max-w-2xl font-['Inter'] text-lg text-[#c0c7cf] leading-relaxed">
            Únete a miles de estudiantes que ya han transformado sus hábitos de
            estudio. <br />
            Gratis, para siempre, para todos.
          </p>

          <Link
            to="/register"
            className="z-10 mt-6 inline-flex items-center justify-center rounded-xl bg-[#8ecdfd] px-10 py-5 transition-all duration-300 hover:scale-105 hover:bg-[#a5d7fd] shadow-lg"
          >
            <span className="font-['Sora'] text-xl md:text-2xl font-semibold text-[#00344e]">
              Comienza a conectarte gratis
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
