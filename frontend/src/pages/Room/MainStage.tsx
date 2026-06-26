import { useEffect, useRef } from "react";
import { MonitorUp, Pin } from "lucide-react";

import type { RemoteStream } from "../../hooks/useWebRTC.ts";

// INTERFACES

interface RemoteVideoProps {
  stream: MediaStream;
  className?: string;
  muted?: boolean;
}

interface MainStageProps {
  isPresenterMode: boolean;
  isScreenSharing: boolean;
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteStreams: RemoteStream[];
  activeScreenStream: RemoteStream | null;
  myStream: MediaStream | null;
  pinnedUserId: string | null;
}

// SUB-COMPONENTS

const RemoteVideo = ({
  stream,
  className = "h-full w-full object-cover",
  muted = false,
}: Readonly<RemoteVideoProps>) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
};

// MAIN COMPONENT

export default function MainStage({
  isScreenSharing,
  screenVideoRef,
  remoteStreams,
  isPresenterMode,
  activeScreenStream,
  myStream,
  pinnedUserId,
}: Readonly<MainStageProps>) {
  let displayedStream: MediaStream | null = null;

  // Display priority logic
  if (!isScreenSharing) {
    if (pinnedUserId === "local" && myStream) {
      displayedStream = myStream;
    } else if (pinnedUserId) {
      displayedStream =
        remoteStreams.find((s) => s.peerId === pinnedUserId)?.stream ?? null;
    } else if (activeScreenStream) {
      displayedStream = activeScreenStream.stream;
    } else if (remoteStreams.length > 0) {
      displayedStream = remoteStreams.at(-1)?.stream ?? null;
    }
  }

  // RENDERING LOGIC

  const renderMainContent = () => {
    if (isScreenSharing) {
      return (
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full bg-black object-contain"
        />
      );
    }

    if (displayedStream) {
      return (
        <RemoteVideo
          stream={displayedStream}
          muted={pinnedUserId === "local"}
          className={`h-full w-full bg-black object-contain ${
            pinnedUserId === "local" ? "scale-x-[-1] transform" : ""
          }`}
        />
      );
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-[#0d1522] to-[#111827]">
        <pre className="select-none p-8 font-mono text-sm text-sky-500/30 opacity-50 sm:text-lg md:text-2xl">
          {`// Esperando transmisión...`}
        </pre>
      </div>
    );
  };

  const renderStatusLabel = () => {
    if (isScreenSharing) {
      return (
        <>
          <MonitorUp className="h-4 w-4" aria-hidden="true" /> Tu presentación
        </>
      );
    }

    if (pinnedUserId) {
      return (
        <>
          <Pin className="h-4 w-4" aria-hidden="true" /> Video fijado
        </>
      );
    }

    if (activeScreenStream) {
      return (
        <>
          <MonitorUp className="h-4 w-4" aria-hidden="true" /> Viendo
          presentación externa
        </>
      );
    }

    return "El área está libre";
  };

  // RENDER

  return (
    <div
      className={`relative flex min-h-90 flex-1 flex-col overflow-hidden rounded-2xl border bg-[#1A1A1A] transition-all duration-300 ${
        isPresenterMode
          ? "border-sky-500/40 shadow-[0_0_40px_rgba(14,165,233,0.12)] lg:flex-[1_1_75%]"
          : "border-gray-800"
      }`}
    >
      {renderMainContent()}

      <div
        aria-live="polite"
        className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded bg-[#0A304E] px-3 py-1.5 text-xs font-bold text-sky-200"
      >
        {renderStatusLabel()}
      </div>
    </div>
  );
}
