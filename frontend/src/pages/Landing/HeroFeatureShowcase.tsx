import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";

import icon from "../../assets/landing/icon.svg";
import icon2 from "../../assets/landing/icon-2.svg";
import icon3 from "../../assets/landing/icon-3.svg";
import icon4 from "../../assets/landing/icon-4.svg";

const featureListItems = [
  { icon: icon2, text: "Compartir pantalla instantáneo" },
  { icon: icon2, text: "Hilos de discusión organizados" },
];

const colorBars = ["bg-[#8ecdfd33]", "bg-[#d2c5af33]", "bg-[#fabb6833]"];

export function HeroFeatureShowcase() {
  return (
    <section className="flex flex-col items-start pb-0 px-0 relative self-stretch w-full flex-[0_0_auto]">
      <div className="flex flex-col items-start px-16 py-32 relative self-stretch w-full flex-[0_0_auto] bg-[#131313] max-md:px-6 max-md:py-20">
        <div className="flex max-w-screen-xl items-center justify-center gap-12 relative w-full flex-[0_0_auto] mx-auto max-lg:flex-col max-lg:items-start">
          <div className="flex flex-col items-start gap-6 relative flex-1 grow w-full">
            <header className="items-start flex flex-col relative self-stretch w-full flex-[0_0_auto]">
              <h1 className="relative self-stretch mt-[-1px] font-['Sora'] font-bold text-[#8ecdfd] text-5xl tracking-[-0.96px] leading-[56px] max-md:text-4xl max-md:leading-[44px]">
                Tu espacio de estudio,
                <br />
                estés donde estés.
              </h1>
            </header>

            <div className="flex flex-col max-w-xl items-start relative w-full flex-[0_0_auto]">
              <p className="relative self-stretch mt-[-1px] font-['Inter'] font-normal text-[#c0c7cf] text-lg tracking-[0] leading-7">
                Conéctate con estudiantes de todo el mundo en salas
                <br />
                de estudio síncronas.
                <br />
                Encuentra el foco que necesitas con un espacio
                <br />
                diseñado para la productividad y la calma.
              </p>
            </div>

            <div className="flex items-start gap-4 pt-4">
              <Link
                to="/register"
                aria-label="Crear cuenta"
                className="
                        inline-flex
                        items-center
                        justify-center
                        gap-3
                        px-8
                        py-5
                        bg-[#8ecdfd]
                        rounded-xl
                        shadow-lg
                        hover:bg-[#a5d7fd]
                        hover:scale-105
                        transition-all
                        duration-300
                        cursor-pointer
                        min-w-[340px]
                        h-[74px]
                    "
              >
                <UserPlus className="w-5 h-5 text-[#00344e]" />

                <span className="font-['Inter'] font-medium text-[#00344e] text-lg tracking-wide">
                  Quiero registrarme
                </span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-start relative flex-1 grow w-full">
            <div className="flex flex-col items-start justify-center relative self-stretch w-full flex-[0_0_auto] bg-[#ffffff01] rounded-2xl overflow-hidden border border-solid border-[#40484e4c] shadow-[0px_25px_50px_-12px_#00000040] aspect-[1.33]">
              <div
                className="relative self-stretch w-full h-[412px] bg-[url(/students-studying.png)] bg-cover bg-[50%_50%] max-md:h-[300px]"
                role="img"
                aria-label="Grupo diverso de estudiantes universitarios estudiando en un entorno moderno"
              />

              <div className="inline-flex items-center gap-3 p-3 absolute left-[25px] bottom-[25px] bg-[#201f1fe6] rounded border border-solid border-[#40484e] backdrop-blur-[6px]">
                <div
                  className="relative w-3 h-3 bg-[#d2c5af] rounded-xl"
                  aria-hidden="true"
                />

                <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
                  <p className="flex items-center mt-[-1px] font-['JetBrains_Mono'] font-medium text-[#e5e2e1] text-xs tracking-[0.60px] leading-4 whitespace-nowrap relative w-fit">
                    1,240 estudiantes conectados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start px-16 py-16 relative self-stretch w-full flex-[0_0_auto] bg-[#1c1b1b] max-md:px-6 max-md:py-16">
        <div className="flex flex-col max-w-screen-xl items-start gap-16 relative w-full flex-[0_0_auto] mx-auto">
          <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
            <div className="items-center flex flex-col relative self-stretch w-full flex-[0_0_auto]">
              <h2 className="relative flex items-center justify-center w-fit mt-[-1px] font-['Sora'] font-semibold text-[#8ecdfd] text-2xl text-center tracking-[0] leading-8 whitespace-nowrap">
                Herramientas
              </h2>
            </div>

            <div className="flex flex-col items-center relative self-stretch w-full flex-[0_0_auto]">
              <p className="flex items-center justify-center mt-[-1px] font-['Inter'] font-normal text-[#c0c7cf] text-base text-center tracking-[0] leading-6 whitespace-nowrap relative w-fit max-md:whitespace-normal">
                Diseñado para minimizar distracciones y maximizar tu progreso.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 grid-rows-[442px_322px] h-fit gap-6 max-lg:grid-cols-1 max-lg:grid-rows-none">
            <article className="relative row-[1_/_2] col-[1_/_2] w-full h-fit flex flex-col items-start justify-between p-8 bg-[#0e0e0e] rounded-lg border border-solid border-[#40484e33] max-lg:row-auto max-lg:col-auto">
              <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
                <img
                  className="relative w-[33.33px] h-[26.67px]"
                  alt="Icono de presencia síncrona"
                  src={icon}
                />

                <div className="items-start pt-2 pb-0 px-0 flex flex-col relative self-stretch w-full flex-[0_0_auto]">
                  <h3 className="relative flex items-center self-stretch mt-[-1px] font-['Sora'] font-semibold text-[#e5e2e1] text-2xl tracking-[0] leading-8">
                    Presencia Síncrona
                  </h3>
                </div>

                <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                  <p className="relative self-stretch mt-[-1px] font-['Inter'] font-normal text-[#c0c7cf] text-base tracking-[0] leading-6">
                    Siente la compañía de otros sin la presión
                    <br />
                    del ruido. Video y audio opcional para
                    <br />
                    sesiones enfocadas.
                  </p>
                </div>
              </div>

              <div className="h-48 flex flex-col items-start pt-8 pb-0 px-0 relative self-stretch w-full">
                <div className="flex h-40 items-center justify-center relative self-stretch w-full bg-[#201f1f] rounded overflow-hidden">
                  <div
                    className="relative flex-1 self-stretch grow opacity-60 bg-[url(/student-focus-session.png)] bg-cover bg-[50%_50%]"
                    role="img"
                    aria-label="Sesión de estudio enfocada"
                  />
                </div>
              </div>
            </article>

            <article className="relative row-[1_/_2] col-[2_/_4] w-full h-[442px] flex items-center justify-center gap-8 p-8 bg-[#4e46351a] rounded-lg border border-solid border-[#d2c5af33] max-lg:row-auto max-lg:col-auto max-lg:h-auto max-md:flex-col">
              <div className="flex flex-col w-[330px] items-start gap-4 relative max-md:w-full">
                <img
                  className="relative w-[36.67px] h-[26.67px]"
                  alt="Icono de comunidad de aprendizaje"
                  src={icon4}
                />

                <div className="items-start pt-2 pb-0 px-0 flex flex-col relative self-stretch w-full flex-[0_0_auto]">
                  <h3 className="relative flex items-center self-stretch mt-[-1px] font-['Sora'] font-semibold text-[#8ecdfd] text-2xl tracking-[0] leading-8">
                    Comunidad de Aprendizaje
                  </h3>
                </div>

                <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                  <p className="relative self-stretch mt-[-1px] font-['Inter'] font-normal text-[#c0c7cf] text-base tracking-[0] leading-6">
                    Chat grupal por temas, intercambio de recursos y resolución
                    de dudas en tiempo real.
                  </p>
                </div>

                <ul className="gap-3 pt-2 pb-0 px-0 flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                  {featureListItems.map((item) => (
                    <li
                      key={item.text}
                      className="flex items-center gap-3 flex-[0_0_auto] relative self-stretch w-full list-none"
                    >
                      <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
                        <img
                          className="relative w-[15px] h-[15px]"
                          alt=""
                          aria-hidden="true"
                          src={item.icon}
                        />
                      </div>

                      <span className="flex items-center mt-[-1px] font-['JetBrains_Mono'] font-medium text-[#d2c5af] text-xs tracking-[0.60px] leading-4 whitespace-nowrap relative w-fit">
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col w-[332px] min-h-[250px] items-start justify-center relative self-stretch bg-[#ffffff01] rounded-lg overflow-hidden border border-solid border-[#40484e4c] shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a] max-md:w-full">
                <div
                  className="relative flex-1 self-stretch w-full grow bg-[url(/collaborative-digital-interface.png)] bg-cover bg-[50%_50%] min-h-[250px]"
                  role="img"
                  aria-label="Interfaz digital colaborativa"
                />
              </div>
            </article>

            <article className="relative row-[2_/_3] col-[2_/_3] w-full h-fit flex flex-col items-start justify-between p-8 bg-[#0e0e0e] rounded-lg border border-solid border-[#40484e33] max-lg:row-auto max-lg:col-auto">
              <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
                <img
                  className="relative w-[36.67px] h-[25px]"
                  alt="Icono de calma visual"
                  src={icon3}
                />

                <div className="items-start pt-2 pb-0 px-0 flex flex-col relative self-stretch w-full flex-[0_0_auto]">
                  <h3 className="relative flex items-center self-stretch mt-[-1px] font-['Sora'] font-semibold text-[#e5e2e1] text-2xl tracking-[0] leading-8">
                    Calma Visual
                  </h3>
                </div>

                <div className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                  <p className="relative self-stretch mt-[-1px] font-['Inter'] font-normal text-[#c0c7cf] text-base tracking-[0] leading-6">
                    Interfaz limpia que reduce la fatiga cognitiva. Colores
                    suaves y tipografía legible para largas sesiones.
                  </p>
                </div>
              </div>

              <div className="flex-[0_0_auto] flex flex-col items-start pt-8 pb-0 px-0 relative self-stretch w-full">
                <div className="flex items-start justify-center gap-2 relative self-stretch w-full flex-[0_0_auto]">
                  {colorBars.map((barClass, index) => (
                    <div
                      key={index}
                      className={`relative flex-1 grow h-2 ${barClass} rounded-xl`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="flex flex-col items-start px-48 py-32 relative self-stretch w-full flex-[0_0_auto] bg-[#131313] max-lg:px-16 max-md:px-6 max-md:py-20">
        <div className="flex flex-col max-w-4xl items-center gap-6 p-24 relative w-full flex-[0_0_auto] bg-[#5797c433] rounded-3xl overflow-hidden border border-solid border-[#8ecdfd33] mx-auto max-md:p-10">
          {/* Glow decorativo */}
          <div
            className="absolute top-[-159px] right-[-159px] w-80 h-80 bg-[#8ecdfd1a] rounded-xl blur-[32px]"
            aria-hidden="true"
          />

          <div
            className="absolute left-[-159px] bottom-[-159px] w-80 h-80 bg-[#d2c5af1a] rounded-xl blur-[32px]"
            aria-hidden="true"
          />

          {/* Título */}
          <div className="flex flex-col items-center relative self-stretch w-full flex-[0_0_auto]">
            <h2 className="font-['Sora'] font-bold text-[#8ecdfd] text-5xl text-center tracking-[-0.96px] leading-[56px] relative w-fit max-md:text-4xl max-md:leading-[44px]">
              ¿Listo para elevar tu
              <br />
              productividad?
            </h2>
          </div>

          {/* Texto */}
          <div className="flex flex-col max-w-2xl w-full items-center relative flex-[0_0_auto]">
            <p className="font-['Inter'] font-normal text-[#c0c7cf] text-lg text-center tracking-[0] leading-7 relative w-fit">
              Únete a miles de estudiantes que ya han transformado sus hábitos
              de estudio.
              <br />
              Gratis, para siempre, para todos.
            </p>
          </div>

          {/* Botón */}
          <div className="flex flex-col items-center pt-6 pb-0 px-0 relative self-stretch w-full flex-[0_0_auto]">
            <Link
              to="/register"
              aria-label="Comienza a conectarte gratis"
              className="
                    inline-flex
                    items-center
                    justify-center
                    px-10
                    py-5
                    bg-[#8ecdfd]
                    rounded-xl
                    shadow-lg
                    hover:bg-[#a5d7fd]
                    hover:scale-105
                    transition-all
                    duration-300
                    cursor-pointer
                "
            >
              <span className="font-['Sora'] font-semibold text-[#00344e] text-2xl text-center">
                Comienza a conectarte gratis
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
