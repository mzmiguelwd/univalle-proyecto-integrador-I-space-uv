import icon4 from "../../assets/landing/icon-2.svg";
import icon5 from "../../assets/landing/icon-2.svg";
import icon6 from "../../assets/landing/icon-2.svg";
import icon7 from "../../assets/landing/icon-2.svg";
import icon8 from "../../assets/landing/icon-2.svg";

import { type UserProfile } from "../../config/auth";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../config/firebase";

const activeRooms = [
  {
    id: "calculo-avanzado-ii",
    status: "En curso",
    statusClass: "bg-[#4e4635] text-[#c0b49e]",
    title: "Cálculo Avanzado II",
    subtitle: "Biblioteca Central • 5 personas",
    actionLabel: "Unirse ahora",
    actionClass: "bg-[#d2c5af] text-[#372f20]",
    avatars: [
      "bg-[url(/ab6axud9hetfvaeidbnh1uquugzkpzz8lax6sk5sikdcorgtiamun6yj4-gmf-7rch-bgcsj4c-dq9t1ha0hgjpaqdy31je2mu3xsgujf-uyjahuzepvirzxb-uyhle2vcbbcxf-kzj5hvkpbwhb6yial92ygced9dyfmfa13x8t-ymqmx2tmihn7hctmamd2foy75meuequv5hi-k2hmn-gnjcnrb-3wjanwjqmkxy4qcpqygqbc5roqbtjxhly3yygqqpqjl4qwdtixbu.png)] ",
      "bg-[url(/ab6axucd7b0-jphl7ng-99hzqrv6btgi19j4bihkimcygiyvh-2atjjjl7pl-7ledryf80phnncejbcqlunloylbrlvrt5jmozrs1y7zscfwbydz7u5pj12eafch2ortvkv5vm5v-lord4jajk-rptq4svaxw9-c7zqcphwr0n6n4h0chzq-ijqxiyvemgcfl7ap9-tvnkjfje3ghe7pwotqls64uvepcrr6vv8ncnjxhkkunq842ppqeurk29n1jfvxpxfcvny-onnzxjzx.png)] ",
    ],
    extraCount: "+3",
    cardClass:
      "w-full h-fit flex flex-col items-start gap-4 p-6 bg-[#202020] rounded-lg border border-solid border-[#40484e1a]",
    statusTextClass: "text-[#c0b49e]",
    primary: true,
  },
  {
    id: "taller-de-tesis",
    status: "Próximamente",
    statusClass: "bg-[#be8639] text-[#3d2400]",
    title: "Taller de Tesis",
    subtitle: "Sala Silenciosa • Hoy, 18:00",
    actionLabel: "Ver detalles",
    actionClass:
      "border border-solid border-[#d2c5af] text-[#d2c5af]",
    icon: icon4,
    cardClass:
      "w-full h-fit flex flex-col items-start gap-4 p-6 bg-[#202020] rounded-lg border border-solid border-[#40484e1a]",
    statusTextClass: "text-[#3d2400]",
    primary: false,
  },
];

const recentActivity = [
  {
    id: "marta",
    icon: icon5,
    iconWrapperClass: "bg-[#4e4635]",
    iconSizeClass: "w-[22px] h-4",
    content: (
      <p className="mt-[-1.00px] [font-family:'Hanken_Grotesk-Bold',Helvetica] font-normal text-transparent text-base leading-6 relative w-fit tracking-[0]">
        <span className="font-bold text-[#e5e2e1]">Marta G.</span>
        <span className="[font-family:'Hanken_Grotesk-Regular',Helvetica] text-[#e5e2e1]">
          {" "}se unió a
        </span>
        <span className="font-bold text-[#e5e2e1]">
          <br />
        </span>
        <span className="[font-family:'Hanken_Grotesk-SemiBold',Helvetica] font-semibold text-[#8ecdfd]">
          Cálculo Avanzado
        </span>
      </p>
    ),
    time: "Hace 15 minutos",
  },
  {
    id: "deep-work",
    icon: icon6,
    iconWrapperClass: "bg-[#5797c44c]",
    iconSizeClass: "w-[18px] h-[21px]",
    content: (
      <p className="mt-[-1.00px] [font-family:'Hanken_Grotesk-Regular',Helvetica] font-normal text-[#e5e2e1] text-base leading-6 relative w-fit tracking-[0]">
        <span>
          Completaste una sesión <br />
          de{" "}
        </span>
        <span className="[font-family:'Hanken_Grotesk-Bold',Helvetica] font-bold">
          Deep Work
        </span>
        <span> de 50 min</span>
      </p>
    ),
    time: "Hace 2 horas",
  },
  {
    id: "luis",
    icon: icon7,
    iconWrapperClass: "bg-[#be8639]",
    iconSizeClass: "w-5 h-5",
    content: (
      <p className="relative w-fit mt-[-1.00px] [font-family:'Hanken_Grotesk-Bold',Helvetica] font-normal text-transparent text-base tracking-[0] leading-6">
        <span className="font-bold text-[#e5e2e1]">Luis P.</span>
        <span className="[font-family:'Hanken_Grotesk-Regular',Helvetica] text-[#e5e2e1]">
          {" "}envió un mensaje <br />
          en{" "}
        </span>
        <span className="[font-family:'Hanken_Grotesk-SemiBold',Helvetica] font-semibold text-[#8ecdfd]">
          Taller de Tesis
        </span>
      </p>
    ),
    time: "Hace 4 horas",
  },
  {
    id: "meta-diaria",
    icon: icon8,
    iconWrapperClass: "bg-[#4e4635]",
    iconSizeClass: "w-[18px] h-[18px]",
    content: (
      <p className="relative w-fit mt-[-1.00px] [font-family:'Hanken_Grotesk-Regular',Helvetica] font-normal text-[#e5e2e1] text-base tracking-[0] leading-6">
        ¡Has alcanzado tu{" "}
        <span className="font-bold">meta <br /> diaria</span>!
      </p>
    ),
    time: "Ayer",
  },
];

type Props = {
    profile: UserProfile | null;
  };

  export const StudySessionDashboardSection = ({
    profile,
  }: Props) => {
    const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };
  return (
    <section
      aria-label="Panel de sesión de estudio"
      className="flex-1
                  px-5
                  py-8
                  md:px-10
                  lg:px-14
                  bg-[#131313]"
    >
      {/* HEADER */}
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sky-200">
            ¡Hola, {profile?.name || "Usuario"}! Listo para una sesión?
          </h1>

          <p className="mt-1 text-sm text-zinc-400">
            Has completado 12 horas de estudio esta semana. Mantén el ritmo.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="
            flex
            items-center
            gap-2
            rounded-lg
            border
            border-white/10
            bg-[#202020]
            px-4
            py-2
            text-sm
            text-zinc-300
            transition
            hover:bg-white/5
            hover:text-white
          "
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">
            Cerrar sesión
          </span>
        </button>
      </header>

      {/* GRID */}
      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        {/* ACTIVE ROOMS */}
        <section className="xl:row-[1_/_2] xl:col-[1_/_3] w-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="[font-family:'Literata-Regular',Helvetica] text-[#e5e2e1]">
              Mis salas activas
            </h2>

            <button
              type="button"
              className="[font-family:'Hanken_Grotesk-Regular',Helvetica] text-[#8ecdfd]"
            >
              Ver todo
            </button>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {activeRooms.map((room) => (
              <article key={room.id} className={room.cardClass}>
                <div className="flex items-start justify-between w-full">
                  <div
                    className={`px-2 py-1 rounded-sm ${room.statusClass}`}
                  >
                    <span className={room.statusTextClass}>
                      {room.status}
                    </span>
                  </div>

                  {room.avatars ? (
                    <div className="flex">
                      {room.avatars.map((avatarClass, i) => (
                        <div
                          key={`${room.id}-${i}`}
                          className={`w-6 h-6 rounded-xl border-2 border-[#202020] bg-cover ${avatarClass} ${
                            i !== 0 ? "-ml-2" : ""
                          }`}
                        />
                      ))}
                      <div className="-ml-2 w-6 h-6 flex items-center justify-center bg-[#353534] rounded-xl text-[#e5e2e1] text-[10px]">
                        {room.extraCount}
                      </div>
                    </div>
                  ) : (
                    <img src={room.icon} alt="Opciones" />
                  )}
                </div>

                <h3 className="text-[#8ecdfd]">{room.title}</h3>
                <p className="text-[#c0c7cf]">{room.subtitle}</p>

                <button
                  type="button"
                  className={`w-full py-2 rounded ${
                    room.primary
                      ? "bg-[#d2c5af] text-[#372f20]"
                      : "border border-[#d2c5af] text-[#d2c5af]"
                  }`}
                >
                  {room.actionLabel}
                </button>
              </article>
            ))}
          </div>

          {/* CTA */}
          <aside className="rounded-lg
                            bg-sky-300
                            p-6
                            flex
                            flex-col
                            gap-4
                            md:flex-row
                            md:items-center
                            md:justify-between">
            <div>
              <h3>¿Necesitas concentrarte ya?</h3>
              <p>Inicia una sesión ahora</p>
            </div>

            <button className="rounded-lg
                                bg-zinc-950
                                px-6
                                py-3
                                font-semibold
                                text-sky-300
                                transition
                                hover:bg-black">
              Iniciar ya!
            </button>
          </aside>
        </section>

        {/* ACTIVITY */}
        <aside className="xl:col-[3_/_4] flex flex-col gap-4">
          <h2 className="text-[#e5e2e1]">Actividad reciente</h2>

          <div className="rounded-lg bg-[#202020] p-6 shadow-xl">
            {recentActivity.map((activity, index) => (
              <article
                key={activity.id}
                className={`flex gap-4 py-4 ${
                  index > 0 ? "border-t border-[#40484e1a]" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-xl ${activity.iconWrapperClass}`}
                >
                  <img
                    src={activity.icon}
                    className={activity.iconSizeClass}
                    alt=""
                  />
                </div>

                <div>
                  {activity.content}
                  <time className="text-[#8a9199] text-base">
                    {activity.time}
                  </time>
                </div>
              </article>
            ))}
          </div>

          {/* PROGRESS */}
          <section className="p-6 bg-[#2a2a2a] rounded-lg border border-[#40484e1a]">
            <h3 className="text-[#e5e2e1]">Meta de enfoque diario</h3>

            <div className="mt-3 h-2 rounded-full bg-zinc-700">
              <div className="h-2 w-[75%] rounded-full bg-amber-400" />
            </div>

            <div className="flex justify-between text-[#c0c7cf]">
              <span>4.5h / 6h</span>
              <span className="text-[#d2c5af]">75% completado</span>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
};