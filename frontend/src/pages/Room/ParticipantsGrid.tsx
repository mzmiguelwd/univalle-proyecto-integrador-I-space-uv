import { useRef, useEffect } from "react";
import { VideoOff, MicOff, Pin } from "lucide-react";

// Types & Interfaces

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
  profile: UserProfile;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  participants: Participant[];
  remoteStreams: RemoteStream[];
  pinnedUserId: string | null;
  onPinUser: (id: string) => void;
}

// Constants & Helpers

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

/**
 * Calculates the grid layout columns based on the total number of users.
 */
function getGridCols(totalParticipants: number): string {
  if (totalParticipants <= 1) return "grid-cols-1";
  if (totalParticipants <= 4) return "grid-cols-2";
  return "grid-cols-3";
}

// Sub-components

/**
 * Renders the user's avatar based on their profile settings (URL, Emoji, or Initial).
 */
function ParticipantAvatar({
  name,
  avatar,
  size = 13,
}: {
  name: string;
  avatar?: string | null;
  size?: number;
}) {
  const cls = `h-${size} w-${size} rounded-full object-cover`;

  if (avatar && avatar.startsWith("http")) {
    return <img src={avatar} alt={name} className={cls} />;
  }

  if (avatar && AVATARS[avatar]) {
    return (
      <div
        className={`h-${size} w-${size} rounded-full bg-slate-700 flex items-center justify-center text-2xl shrink-0`}
      >
        {AVATARS[avatar]}
      </div>
    );
  }

  return (
    <div
      className={`h-${size} w-${size} rounded-full bg-sky-700 flex items-center justify-center font-bold text-white text-base shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * Renders the video feed for a remote participant.
 */
function RemoteVideoCard({
  stream,
  participant,
}: {
  stream: MediaStream;
  participant: Participant;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover rounded-xl"
      >
        <track kind="captions" label="Captions" />
      </video>

      {/* Name Tag */}
      <div className="absolute bottom-1.5 left-2 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-gray-200 truncate max-w-[80%]">
        {participant.name.split(" ")[0]}
      </div>

      {/* Status Icons */}
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

/**
 * Renders a fallback UI when the user's camera is turned off.
 */
function AvatarCard({
  name,
  avatar,
  isYou = false,
  micOn = true,
}: {
  name: string;
  avatar?: string | null;
  isYou?: boolean;
  micOn?: boolean;
}) {
  return (
    <div className="w-full h-full flex items-center justify-between gap-3 px-4 py-3 bg-[#111827] rounded-xl">
      <div className="flex items-center gap-2.5 min-w-0">
        <ParticipantAvatar name={name} avatar={avatar} size={11} />
        <div className="min-w-0 flex flex-col">
          <p className="text-xs font-semibold text-white leading-tight truncate">
            {name.split(" ")[0]}
            {isYou && (
              <span className="ml-1 text-[9px] text-sky-400">(tú)</span>
            )}
          </p>
          <div className="text-[10px] text-gray-400 mt-0.5">
            <VideoOff className="w-3 h-3" aria-hidden="true" />
          </div>
        </div>
      </div>

      {!micOn && (
        <div className="bg-red-600/90 rounded-full p-0.5 shrink-0">
          <MicOff
            className="w-3.5 h-3.5 text-white"
            aria-label="Micrófono apagado"
          />
        </div>
      )}
    </div>
  );
}

// Main Component

/**
 * Displays a dynamic grid of all participants in the room.
 * Allows clicking on a participant's card to pin their video to the main stage.
 */
export default function ParticipantsGrid({
  profile,
  isCameraOn,
  isMicrophoneOn,
  localVideoRef,
  participants,
  remoteStreams,
  pinnedUserId,
  onPinUser,
}: ParticipantsGridProps) {
  const total = participants.length + 1; // +1 includes the local user
  const isSingleParticipant = total === 1;

  // Base classes for video cards (handling the "Pin" interactive state)
  const baseCardStyles = `rounded-xl overflow-hidden relative border transition-all duration-200 cursor-pointer hover:border-sky-500/80 shadow-sm`;
  const getPinStyles = (isPinned: boolean) =>
    isPinned
      ? "border-sky-500 ring-2 ring-sky-500/50 scale-[0.98]"
      : "border-gray-800 bg-[#1E1E1E]";

  return (
    <div className="shrink-0 flex flex-col">
      {/* ── Room Stats ── */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-1">
        <p>
          {total} participante{total !== 1 ? "s" : ""}
        </p>

        {pinnedUserId && (
          <span className="text-[10px] text-sky-400 bg-sky-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Pin className="w-3 h-3" /> Fijado
          </span>
        )}
      </div>

      {/* ── Dynamic Grid ── */}
      <div
        className={`grid ${getGridCols(total)} gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar`}
      >
        {/* 1. LOCAL USER CARD */}
        <div
          onClick={() => onPinUser("local")}
          className={`${baseCardStyles} ${getPinStyles(pinnedUserId === "local")} ${isSingleParticipant ? "h-36" : "aspect-video"}`}
          style={{ minHeight: isSingleParticipant ? 144 : 72 }}
          role="button"
          tabIndex={0}
          aria-label="Fijar mi video"
        >
          {/* Active Local Video */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] rounded-xl ${!isCameraOn ? "hidden" : ""}`}
          />

          {/* Inactive Local Video (Avatar) */}
          {!isCameraOn && (
            <AvatarCard
              name={profile.name || "Tú"}
              avatar={profile.avatar}
              isYou
              micOn={isMicrophoneOn}
            />
          )}

          {/* Floating Badges for Active Video */}
          {isCameraOn && (
            <>
              <div className="absolute top-1.5 left-2 bg-sky-600/80 text-[9px] font-semibold px-1.5 py-0.5 rounded text-white shadow-sm">
                Tú
              </div>
              {!isMicrophoneOn && (
                <div className="absolute bottom-1.5 right-2 bg-red-600/90 rounded-full p-0.5 shadow-sm">
                  <MicOff
                    className="w-3 h-3 text-white"
                    aria-label="Micrófono apagado"
                  />
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-gray-200 shadow-sm truncate max-w-[70%]">
                {profile.name?.split(" ")[0] || "Tú"}
              </div>
            </>
          )}
        </div>

        {/* 2. REMOTE PARTICIPANTS CARDS */}
        {participants.map((participant) => {
          // Resolve the correct ID used for streaming (PeerJS ID)
          const streamKey = participant.peerId || participant.id;
          const remoteVideo = remoteStreams.find((s) => s.id === streamKey);

          // Check if the stream actually has active video tracks being sent
          const hasActiveVideo =
            !!remoteVideo &&
            remoteVideo.stream
              .getVideoTracks()
              .some((track) => track.readyState === "live" && track.enabled);

          return (
            <div
              key={participant.id}
              onClick={() => onPinUser(streamKey)}
              className={`${baseCardStyles} ${getPinStyles(pinnedUserId === streamKey)} ${isSingleParticipant ? "h-36" : "aspect-video"}`}
              style={{ minHeight: isSingleParticipant ? 144 : 72 }}
              role="button"
              tabIndex={0}
              aria-label={`Fijar video de ${participant.name}`}
            >
              {hasActiveVideo ? (
                <RemoteVideoCard
                  stream={remoteVideo.stream}
                  participant={participant}
                />
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
