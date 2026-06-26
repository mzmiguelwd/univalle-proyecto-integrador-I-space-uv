import { useRef, useEffect } from "react";
import { VideoOff, MicOff, Pin } from "lucide-react";

import type { Participant, RemoteStream } from "../../hooks/useWebRTC.ts";

// TYPES & INTERFACES

export interface UserProfilePayload {
  name?: string;
  avatar?: string | null;
}

export interface ParticipantsGridProps {
  isPresenterMode: boolean;
  profile: UserProfilePayload;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  participants: Participant[];
  remoteStreams: RemoteStream[];
  pinnedUserId: string | null;
  onPinUser: (id: string) => void;
  remoteTracksUpdate?: number; // Optional trigger for deep re-renders if needed
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

/**
 * Renders the user's avatar based on their profile settings (URL, Emoji, or Initial).
 */
function ParticipantAvatar({
  name,
  avatar,
  size = 13,
}: Readonly<{
  name: string;
  avatar?: string | null;
  size?: number;
}>) {
  const cls = `h-${size} w-${size} rounded-full object-cover shrink-0`;

  if (avatar?.startsWith("http")) {
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
}: Readonly<{
  stream: MediaStream;
  participant: Participant;
}>) {
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
      />

      {/* Name Tag */}
      <div className="absolute bottom-1.5 left-2 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-gray-200 truncate max-w-[80%] pointer-events-none">
        {participant.name.split(" ")[0]}
      </div>

      {/* Status Icons */}
      <div className="absolute bottom-1.5 right-2 flex gap-1 pointer-events-none">
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
}: Readonly<{
  name: string;
  avatar?: string | null;
  isYou?: boolean;
  micOn?: boolean;
}>) {
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
  pinnedUserId,
  onPinUser,
}: Readonly<ParticipantsGridProps>) {
  const total = participants.length + 1; // +1 includes the local user
  const isSingleParticipant = total === 1;

  // Base classes for video cards (handling the "Pin" interactive state)
  const baseCardStyles = `rounded-xl overflow-hidden relative border transition-all duration-200 cursor-pointer hover:border-sky-500/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`;
  const getPinStyles = (isPinned: boolean) =>
    isPinned
      ? "border-sky-500 ring-2 ring-sky-500/50 scale-[0.98]"
      : "border-gray-800 bg-[#1E1E1E]";

  const cardSizeClass = isPresenterMode
    ? "h-20"
    : isSingleParticipant
      ? "h-36"
      : "aspect-video";

  const cardMinHeight = isPresenterMode ? 80 : isSingleParticipant ? 144 : 72;

  // Keyboard accessibility handler for pinning users
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPinUser(id);
    }
  };

  return (
    <div className="shrink-0 flex flex-col">
      {/* ── Room Stats ── */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-1">
        <p>
          {total} pppparticipante{total === 1 ? "" : "s"}
        </p>

        {pinnedUserId && (
          <span className="text-[10px] text-sky-400 bg-sky-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Pin className="w-3 h-3" aria-hidden="true" /> Fijado
          </span>
        )}
      </div>

      {/* ── Dynamic Grid ── */}
      <div
        className={`grid ${
          isPresenterMode ? "grid-cols-2" : getGridCols(total)
        } gap-2 overflow-y-auto pr-1 custom-scrollbar ${
          isPresenterMode ? "max-h-40" : "max-h-56"
        }`}
      >
        {/* 1. LOCAL USER CARD */}
        <div
          onClick={() => onPinUser("local")}
          onKeyDown={(e) => handleKeyDown(e, "local")}
          className={`${baseCardStyles} ${getPinStyles(pinnedUserId === "local")} ${cardSizeClass}`}
          style={{ minHeight: cardMinHeight }}
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
            className={`w-full h-full object-cover transform scale-x-[-1] rounded-xl ${
              isCameraOn ? "" : "hidden"
            }`}
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
              <div className="absolute top-1.5 left-2 bg-sky-600/80 text-[9px] font-semibold px-1.5 py-0.5 rounded text-white shadow-sm pointer-events-none">
                Tú
              </div>
              {!isMicrophoneOn && (
                <div className="absolute bottom-1.5 right-2 bg-red-600/90 rounded-full p-0.5 shadow-sm pointer-events-none">
                  <MicOff
                    className="w-3 h-3 text-white"
                    aria-label="Micrófono apagado"
                  />
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-gray-200 shadow-sm truncate max-w-[70%] pointer-events-none">
                {profile.name?.split(" ")[0] || "Tú"}
              </div>
            </>
          )}
        </div>

        {/* 2. REMOTE PARTICIPANTS CARDS */}
        {participants.map((participant) => {
          // Resolve the correct ID used for streaming (PeerJS ID acts as the stream key)
          const streamKey = participant.peerId || participant.id;
          const remoteVideo = remoteStreams.find((s) => s.id === streamKey);

          // The source of truth for the camera state comes from the Socket.IO sync,
          // paired with the actual existence of the remote stream.
          const isCamActive = participant.camOn && !!remoteVideo;

          return (
            <div
              key={participant.id}
              onClick={() => onPinUser(streamKey)}
              onKeyDown={(e) => handleKeyDown(e, streamKey)}
              className={`${baseCardStyles} ${getPinStyles(pinnedUserId === streamKey)} ${cardSizeClass}`}
              style={{ minHeight: cardMinHeight }}
              role="button"
              tabIndex={0}
              aria-label={`Fijar video de ${participant.name}`}
            >
              {isCamActive ? (
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
