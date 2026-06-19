
import { useRef, useEffect } from "react";
import { VideoOff, MicOff } from "lucide-react";

// Copia de los mismos tipos que ya tienes en Room.tsx
type Participant = {
  id: string;
  name: string;
  avatar?: string | null;
  micOn?: boolean;
  peerId?: string;
};

type RemoteStream = {
  id: string;
  stream: MediaStream;
};

type UserProfile = {
  name?: string;
  avatar?: string | null;
};

const AVATARS: Record<string, string> = {
  owl: "🦉", rocket: "🚀", brain: "🧠", star: "⭐", fire: "🔥",
  diamond: "💎", plant: "🌱", bolt: "⚡", moon: "🌙", book: "📚",
  atom: "⚛️", compass: "🧭",
};

function ParticipantAvatar({
  name, avatar, size = 13,
}: {
  name: string; avatar?: string | null; size?: number;
}) {
  const cls = `h-${size} w-${size} rounded-full object-cover`;
  if (avatar && avatar.startsWith("http"))
    return <img src={avatar} alt={name} className={cls} />;
  if (avatar && AVATARS[avatar])
    return (
      <div className={`h-${size} w-${size} rounded-full bg-slate-700 flex items-center justify-center text-2xl`}>
        {AVATARS[avatar]}
      </div>
    );
  return (
    <div className={`h-${size} w-${size} rounded-full bg-sky-700 flex items-center justify-center font-bold text-white text-base`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Tarjeta de video remoto ───────────────────────────────────
function RemoteVideoCard({
  stream, participant,
}: {
  stream: MediaStream; participant: Participant;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover rounded-xl"
      >
        <track kind="captions" label="Captions" />
      </video>
      {/* Nombre */}
      <div className="absolute bottom-1.5 left-2 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-gray-200 truncate max-w-[80%]">
        {participant.name.split(" ")[0]}
      </div>
      {/* Íconos de estado */}
      <div className="absolute bottom-1.5 right-2 flex gap-1">
        {participant.micOn === false && (
          <div className="bg-red-600/90 rounded-full p-0.5">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta con cámara apagada ────────────────────────────────
function AvatarCard({
  name, avatar, isYou = false, micOn = true,
}: {
  name: string; avatar?: string | null; isYou?: boolean; micOn?: boolean;
}) {
  return (
    <div className="w-full h-full flex items-center justify-between gap-3 px-4 py-3 bg-[#111827]">
      <div className="flex items-center gap-2.5 min-w-0">
        <ParticipantAvatar name={name} avatar={avatar} size={11} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white leading-tight truncate">
            {name.split(" ")[0]}
            {isYou && <span className="ml-1 text-[9px] text-sky-400">(tú)</span>}
          </p>
          <p className="text-[10px] text-gray-400 flex items-center">
            <VideoOff className="w-2.5 h-2.5" aria-hidden="true" />
          </p>
        </div>
      </div>
      {!micOn && (
        <div className="bg-red-600/90 rounded-full p-0.5 shrink-0">
          <MicOff className="w-3.5 h-3.5 text-white" aria-label="Micrófono apagado" />
        </div>
      )}
    </div>
  );
}

// ── Componente principal: grid dinámico ───────────────────────
// Número de columnas según cantidad de participantes
function gridCols(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n <= 4) return "grid-cols-2";
  return "grid-cols-3";
}

type ParticipantsGridProps = {
  profile: UserProfile;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  participants: Participant[];
  remoteStreams: RemoteStream[];
};

export default function ParticipantsGrid({
  profile, isCameraOn, isMicrophoneOn, localVideoRef,
  participants, remoteStreams,
}: ParticipantsGridProps) {
  const total = participants.length + 1; // +1 = yo
  const isSingleParticipant = total === 1;

  return (
    <div className="shrink-0">
      {/* Contador */}
      <p className="text-xs text-gray-400 mb-2 px-1">
        {total} participante{total !== 1 ? "s" : ""} ·{" "}
        {participants.length} invitado{participants.length !== 1 ? "s" : ""}
      </p>

      {/* Grid dinámico */}
      <div className={`grid ${gridCols(total)} gap-2 max-h-56 overflow-y-auto`}>

        {/* ── TU TARJETA ── */}
        <div
          className={`bg-[#1E1E1E] rounded-xl overflow-hidden relative border border-sky-800/40 ${isSingleParticipant ? "h-36" : "aspect-video"}`}
          style={{ minHeight: isSingleParticipant ? 144 : 72 }}
        >
          {/* Video activo */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] rounded-xl ${!isCameraOn ? "hidden" : ""}`}
          />

          {/* Avatar cuando cámara apagada */}
          {!isCameraOn && (
            <AvatarCard
              name={profile.name || "Tú"}
              avatar={profile.avatar}
              isYou
              micOn={isMicrophoneOn}
            />
          )}

          {/* Badge "Tú" + estado micrófono cuando cámara encendida */}
          {isCameraOn && (
            <>
              <div className="absolute top-1.5 left-2 bg-sky-600/80 text-[9px] font-semibold px-1.5 py-0.5 rounded text-white">
                Tú
              </div>
              {!isMicrophoneOn && (
                <div className="absolute bottom-1.5 right-2 bg-red-600/90 rounded-full p-0.5">
                  <MicOff className="w-3 h-3 text-white" aria-label="Micrófono apagado" />
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-gray-200">
                {profile.name?.split(" ")[0] || "Tú"}
              </div>
            </>
          )}
        </div>

        {/* ── TARJETAS REMOTAS ── */}
        {participants.map((participant) => {
          const streamKey = participant.peerId || participant.id;
          const remoteVideo = remoteStreams.find((s) => s.id === streamKey);
          const hasActiveVideo =
            !!remoteVideo &&
            remoteVideo.stream.getVideoTracks().some(
              (track) => track.readyState === "live" && track.enabled,
            );

          return (
            <div
              key={participant.id}
              className={`bg-[#1E1E1E] rounded-xl overflow-hidden relative border border-gray-800 ${isSingleParticipant ? "h-36" : "aspect-video"}`}
              style={{ minHeight: isSingleParticipant ? 144 : 72 }}
            >
              {hasActiveVideo ? (
                <RemoteVideoCard stream={remoteVideo.stream} participant={participant} />
              ) : (
                <AvatarCard
                  name={participant.name}
                  avatar={participant.avatar}
                  micOn={participant.micOn}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}