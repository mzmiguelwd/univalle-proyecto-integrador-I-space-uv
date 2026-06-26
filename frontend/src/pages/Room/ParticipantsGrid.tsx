import { useRef, useEffect, useState } from "react";
import { VideoOff, MicOff, Pin } from "lucide-react";

// INTERFACES

export interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  micOn?: boolean;
  camOn?: boolean;
  peerId?: string;
  isScreenSharing?: boolean;
}

export interface RemoteStream {
  peerId: string;
  stream: MediaStream;
}

export interface UserProfile {
  name?: string;
  avatar?: string | null;
}

export interface ParticipantsGridProps {
  isPresenterMode: boolean;
  profile: UserProfile;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  participants: Participant[];
  remoteStreams: RemoteStream[];
  pinnedUserId: string | null;
  onPinUser: (id: string) => void;
}

// CONSTANTS

const AVATARS: Record<string, string> = {
  owl: "🦉",
  rocket: "🚀",
  brain: "🧠",
  star: "⭐",
  fire: "🔥",
  diamond: "💎",
  plant: "🌱",
  bolt: "⚡",
  moon: "🌙",
  book: "📚",
  atom: "⚛️",
  compass: "🧭",
};

// HELPERS

function getGridCols(totalParticipants: number): string {
  if (totalParticipants <= 1) return "grid-cols-1";
  if (totalParticipants <= 4) return "grid-cols-2";
  return "grid-cols-3";
}

// SUB-COMPONENTS

interface ParticipantAvatarProps {
  name: string;
  avatar?: string | null;
  sizeClass?: string;
}

function ParticipantAvatar({
  name,
  avatar,
  sizeClass = "h-13 w-13",
}: Readonly<ParticipantAvatarProps>) {
  const baseClasses = `${sizeClass} rounded-full shrink-0 flex items-center justify-center`;

  if (avatar?.startsWith("http")) {
    return (
      <img
        src={avatar}
        alt={`Avatar de ${name}`}
        className={`${baseClasses} object-cover`}
      />
    );
  }

  if (avatar && AVATARS[avatar]) {
    return (
      <div className={`${baseClasses} bg-slate-700 text-2xl`}>
        {AVATARS[avatar]}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-sky-700 text-base font-bold text-white`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

interface RemoteVideoCardProps {
  stream: MediaStream;
  participant: Participant;
  /**
   * FIX #9: Callback para notificar al padre cuando el track de video
   * termina, de modo que pueda mostrar el AvatarCard en su lugar.
   */
  onVideoEnded: () => void;
}

/**
 * FIX #9: RemoteVideoCard ahora observa el estado real de los tracks
 * para detectar cuando la cámara remota se apaga, incluso si el stream
 * permanece en el DOM. Esto elimina el efecto de "cámara congelada".
 */
function RemoteVideoCard({
  stream,
  participant,
  onVideoEnded,
}: Readonly<RemoteVideoCardProps>) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.srcObject = stream;

    // Escuchar el evento ended en cada video track
    const videoTracks = stream.getVideoTracks();
    const handleTrackEnded = () => {
      // Verificar si TODOS los video tracks terminaron
      const allEnded = stream
        .getVideoTracks()
        .every((t) => t.readyState === "ended");
      if (allEnded) {
        onVideoEnded();
      }
    };

    for (const track of videoTracks) {
      track.addEventListener("ended", handleTrackEnded);
    }

    // También escuchar el evento mute del track (cuando se deshabilita)
    const handleTrackMute = () => {
      const allMuted = stream.getVideoTracks().every((t) => t.muted);
      if (allMuted) {
        onVideoEnded();
      }
    };

    for (const track of videoTracks) {
      track.addEventListener("mute", handleTrackMute);
    }

    return () => {
      for (const track of videoTracks) {
        track.removeEventListener("ended", handleTrackEnded);
        track.removeEventListener("mute", handleTrackMute);
      }
      // Limpiar srcObject para liberar memoria de la MediaStream
      videoEl.srcObject = null;
    };
  }, [stream, onVideoEnded]);

  return (
    <div className="relative h-full w-full bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full rounded-xl object-cover"
      />

      <div className="absolute bottom-1.5 left-2 max-w-[80%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-gray-200">
        {participant.name.split(" ")[0]}
      </div>

      <div className="absolute bottom-1.5 right-2 flex gap-1">
        {participant.micOn === false && (
          <div className="rounded-full bg-red-600/90 p-0.5">
            <MicOff className="h-3 w-3 text-white" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}

interface AvatarCardProps {
  name: string;
  avatar?: string | null;
  isYou?: boolean;
  micOn?: boolean;
  statusText?: string;
}

function AvatarCard({
  name,
  avatar,
  isYou = false,
  micOn = true,
  statusText,
}: Readonly<AvatarCardProps>) {
  return (
    <div className="flex h-full w-full flex-col justify-between gap-3 rounded-xl bg-[#111827] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <ParticipantAvatar name={name} avatar={avatar} sizeClass="h-11 w-11" />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-xs font-semibold leading-tight text-white">
            {name.split(" ")[0]}
            {isYou && (
              <span className="ml-1 text-[9px] text-sky-400">(tú)</span>
            )}
          </p>
          <div className="mt-0.5 text-[10px] text-gray-400">
            {statusText || (
              <span className="inline-flex items-center gap-1">
                <VideoOff className="h-3 w-3" aria-hidden="true" />
                Cámara apagada
              </span>
            )}
          </div>
        </div>
      </div>

      {!micOn && (
        <div className="shrink-0 self-end rounded-full bg-red-600/90 p-0.5">
          <MicOff
            className="h-3.5 w-3.5 text-white"
            aria-label="Micrófono apagado"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper de tarjeta remota que gestiona el estado de video activo/inactivo
 * de forma local para evitar re-renders globales en el grid completo.
 */
interface RemoteParticipantCardProps {
  participant: Participant;
  remoteStream: RemoteStream | undefined;
  isPinned: boolean;
  baseCardStyles: string;
  cardSizeClass: string;
  cardMinHeight: number;
  onPin: () => void;
}

function RemoteParticipantCard({
  participant,
  remoteStream,
  isPinned,
  baseCardStyles,
  cardSizeClass,
  cardMinHeight,
  onPin,
}: Readonly<RemoteParticipantCardProps>) {
  /**
   * FIX #9: Estado local de video activo.
   * Se inicializa según el estado del socket (camOn) y se actualiza
   * cuando el track del stream termina realmente.
   */
  const [hasActiveVideo, setHasActiveVideo] = useState<boolean>(() => {
    if (!remoteStream) return false;
    return remoteStream.stream
      .getVideoTracks()
      .some((t) => t.readyState === "live" && !t.muted);
  });

  // Sincronizar con cambios externos (nuevo stream, stream removido)
  useEffect(() => {
    if (!remoteStream) {
      setHasActiveVideo(false);
      return;
    }

    const videoTracks = remoteStream.stream.getVideoTracks();
    const isActive =
      videoTracks.length > 0 &&
      videoTracks.some((t) => t.readyState === "live" && !t.muted);

    setHasActiveVideo(isActive);
  }, [remoteStream]);

  // También sincronizar con el estado camOn que llega del socket
  useEffect(() => {
    if (participant.camOn === false) {
      setHasActiveVideo(false);
    }
  }, [participant.camOn]);

  const getPinStyles = (pinned: boolean) =>
    pinned
      ? "border-sky-500 scale-[0.98] ring-2 ring-sky-500/50"
      : "border-gray-800 bg-[#1E1E1E]";

  return (
    <button
      key={participant.id}
      type="button"
      onClick={onPin}
      className={`block w-full text-left ${baseCardStyles} ${getPinStyles(isPinned)} ${cardSizeClass}`}
      style={{ minHeight: cardMinHeight }}
      aria-label={
        isPinned
          ? `Desfijar video de ${participant.name}`
          : `Fijar video de ${participant.name}`
      }
    >
      {hasActiveVideo && remoteStream ? (
        <RemoteVideoCard
          stream={remoteStream.stream}
          participant={participant}
          onVideoEnded={() => setHasActiveVideo(false)}
        />
      ) : (
        <AvatarCard
          name={participant.name}
          avatar={participant.avatar}
          micOn={participant.micOn}
          statusText={remoteStream ? undefined : "Conectando..."}
        />
      )}
    </button>
  );
}

// MAIN COMPONENT

/**
 * FIX #9: Se eliminó remoteTracksUpdate como prop.
 * El estado de video activo/inactivo ahora se maneja localmente
 * en cada RemoteParticipantCard, sin necesidad de forzar re-renders globales.
 */
export default function ParticipantsGrid({
  profile,
  isPresenterMode,
  isCameraOn,
  isMicrophoneOn,
  localVideoRef,
  participants,
  remoteStreams,
  pinnedUserId,
  onPinUser,
}: Readonly<ParticipantsGridProps>) {
  const total = participants.length + 1;
  const isSingleParticipant = total === 1;

  const baseCardStyles = `relative overflow-hidden rounded-xl border shadow-sm transition-all duration-200 cursor-pointer hover:border-sky-500/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`;
  const getPinStyles = (isPinned: boolean) =>
    isPinned
      ? "border-sky-500 scale-[0.98] ring-2 ring-sky-500/50"
      : "border-gray-800 bg-[#1E1E1E]";

  let cardSizeClass = "aspect-video";
  let cardMinHeight = 72;

  if (isPresenterMode) {
    cardSizeClass = "h-20";
    cardMinHeight = 80;
  } else if (isSingleParticipant) {
    cardSizeClass = "h-36";
    cardMinHeight = 144;
  }

  return (
    <div className="flex shrink-0 flex-col">
      {/* ROOM STATS */}
      <div className="mb-2 flex items-center justify-between px-1 text-xs text-gray-400">
        <p>
          {total} pparticipante{total === 1 ? "" : "s"}
        </p>

        {pinnedUserId && (
          <span className="flex items-center gap-1 rounded-full bg-sky-900/30 px-2 py-0.5 text-[10px] text-sky-400">
            <Pin className="h-3 w-3" aria-hidden="true" /> Fijado
          </span>
        )}
      </div>

      {/* DYNAMIC GRID */}
      <div
        className={`custom-scrollbar grid gap-2 overflow-y-auto pr-1 ${
          isPresenterMode
            ? "grid-cols-2 max-h-40"
            : `${getGridCols(total)} max-h-56`
        }`}
      >
        {/* LOCAL USER CARD */}
        <button
          type="button"
          onClick={() => onPinUser("local")}
          className={`block w-full text-left ${baseCardStyles} ${getPinStyles(pinnedUserId === "local")} ${cardSizeClass}`}
          style={{ minHeight: cardMinHeight }}
          aria-label={
            pinnedUserId === "local" ? "Desfijar mi video" : "Fijar mi video"
          }
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full scale-x-[-1] transform rounded-xl object-cover ${
              isCameraOn ? "" : "hidden"
            }`}
          />

          {!isCameraOn && (
            <AvatarCard
              name={profile.name || "Tú"}
              avatar={profile.avatar}
              isYou
              micOn={isMicrophoneOn}
            />
          )}

          {isCameraOn && (
            <>
              <div className="absolute left-2 top-1.5 rounded bg-sky-600/80 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                Tú
              </div>
              {!isMicrophoneOn && (
                <div className="absolute bottom-1.5 right-2 rounded-full bg-red-600/90 p-0.5 shadow-sm">
                  <MicOff
                    className="h-3 w-3 text-white"
                    aria-label="Micrófono apagado"
                  />
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 max-w-[70%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-gray-200 shadow-sm">
                {profile.name?.split(" ")[0] || "Tú"}
              </div>
            </>
          )}
        </button>

        {/* REMOTE PARTICIPANTS CARDS */}
        {participants.map((participant) => {
          const streamKey = participant.peerId || participant.id;
          const remoteStream = remoteStreams.find(
            (s) => s.peerId === streamKey,
          );

          return (
            <RemoteParticipantCard
              key={participant.id}
              participant={participant}
              remoteStream={remoteStream}
              isPinned={pinnedUserId === streamKey}
              baseCardStyles={baseCardStyles}
              cardSizeClass={cardSizeClass}
              cardMinHeight={cardMinHeight}
              onPin={() => onPinUser(streamKey)}
            />
          );
        })}
      </div>
    </div>
  );
}
