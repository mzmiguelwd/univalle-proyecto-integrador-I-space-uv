import { useRef, useEffect, useMemo } from "react";
import { VideoOff, MicOff, Pin } from "lucide-react";

// INTERFACES

export interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  micOn?: boolean;
  peerId?: string;
}

export interface RemoteStream {
  id: string;
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
  remoteTracksUpdate: number;
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

/**
 * Calculates the grid layout columns based on the total number of users.
 */
function getGridCols(totalParticipants: number): string {
  if (totalParticipants <= 1) return "grid-cols-1";
  if (totalParticipants <= 4) return "grid-cols-2";
  return "grid-cols-3";
}

// SUB-COMPONENTS

interface ParticipantAvatarProps {
  name: string;
  avatar?: string | null;
  sizeClass?: string; // Changed from 'size' to 'sizeClass' to support Tailwind's compiler
}

/**
 * Renders the user's avatar based on their profile settings (URL, Emoji, or Initial).
 */
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
}

/**
 * Renders the video feed for a remote participant.
 */
function RemoteVideoCard({
  stream,
  participant,
}: Readonly<RemoteVideoCardProps>) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative h-full w-full bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full rounded-xl object-cover"
      />

      {/* NAME TAG */}
      <div className="absolute bottom-1.5 left-2 max-w-[80%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-gray-200">
        {participant.name.split(" ")[0]}
      </div>

      {/* STATUS ICON */}
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

/**
 * Renders a fallback UI when the user's camera is turned off.
 */
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

// MAIN COMPONENT

/**
 * Displays a dynamic grid of all participants in the room.
 * Allows clicking on a participant's card to pin their video to the main stage.
 */
export default function ParticipantsGrid({
  profile,
  isPresenterMode,
  isCameraOn,
  isMicrophoneOn,
  localVideoRef,
  participants,
  remoteStreams,
  remoteTracksUpdate,
  pinnedUserId,
  onPinUser,
}: Readonly<ParticipantsGridProps>) {
  const total = participants.length + 1; // +1 includes the local user
  const isSingleParticipant = total === 1;

  // Recalculate video states when remoteTracksUpdate changes
  // This ensures UI updates when track replacements occur
  const remoteVideoStates = useMemo(() => {
    const states: Record<string, boolean> = {};
    participants.forEach((participant) => {
      const streamKey = participant.peerId || participant.id;
      const remoteVideo = remoteStreams.find((s) => s.id === streamKey);

      states[streamKey] = !!remoteVideo?.stream
        .getVideoTracks()
        .some((track) => track.readyState === "live" && track.enabled);
    });
    return states;
    // We intentionally include remoteTracksUpdate to force re-evaluation
    // when mutable MediaStream tracks change state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, remoteStreams, remoteTracksUpdate]);

  // Base classes for video cards (handling the "Pin" interactive state)
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
      {/*  ROOM STATS */}
      <div className="mb-2 flex items-center justify-between px-1 text-xs text-gray-400">
        <p>
          {total} Participante{total === 1 ? "" : "s"}
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
          {/* ACTIVE LOCAL VIDEO */}
          {}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full scale-x-[-1] transform rounded-xl object-cover ${
              isCameraOn ? "" : "hidden"
            }`}
          />

          {/* INACTIVE LOCAL VIDEO (AVATAR) */}
          {!isCameraOn && (
            <AvatarCard
              name={profile.name || "Tú"}
              avatar={profile.avatar}
              isYou
              micOn={isMicrophoneOn}
            />
          )}

          {/* FLOATING BADGES FOR ACTIVE VIDEO */}
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
          // Resolve the correct ID used for streaming (PeerJS ID)
          const streamKey = participant.peerId || participant.id;
          const remoteVideo = remoteStreams.find(
            (stream) => stream.id === streamKey,
          );
          const hasActiveVideo = remoteVideoStates[streamKey] || false;

          return (
            <button
              key={participant.id}
              type="button"
              onClick={() => onPinUser(streamKey)}
              className={`block w-full text-left ${baseCardStyles} ${getPinStyles(pinnedUserId === streamKey)} ${cardSizeClass}`}
              style={{ minHeight: cardMinHeight }}
              aria-label={
                pinnedUserId === streamKey
                  ? `Desfijar video de ${participant.name}`
                  : `Fijar video de ${participant.name}`
              }
            >
              {hasActiveVideo && remoteVideo ? (
                <RemoteVideoCard
                  stream={remoteVideo.stream}
                  participant={participant}
                />
              ) : (
                <AvatarCard
                  name={participant.name}
                  avatar={participant.avatar}
                  micOn={participant.micOn}
                  statusText="Conectando..."
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
