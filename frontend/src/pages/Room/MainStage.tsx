import { useEffect, useRef } from "react";
import { MonitorUp, Pin } from "lucide-react";

// Internal helper to render remote videos
const RemoteVideo = ({
  stream,
  className = "w-full h-full object-cover",
  muted = false,
}: {
  stream: MediaStream;
  className?: string;
  muted?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    >
      <track kind="captions" label="Captions" />
    </video>
  );
};

interface MainStageProps {
  isScreenSharing: boolean;
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteStreams: { id: string; stream: MediaStream }[];
  myStream: MediaStream | null;
  pinnedUserId: string | null;
}

export default function MainStage({
  isScreenSharing,
  screenVideoRef,
  remoteStreams,
  myStream,
  pinnedUserId,
}: MainStageProps) {
  let displayedStream = null;

  // When not presenting a screen, choose a video to display in the main stage
  if (!isScreenSharing) {
    if (pinnedUserId === "local" && myStream) {
      displayedStream = myStream;
    } else if (pinnedUserId) {
      displayedStream = remoteStreams.find((s) => s.id === pinnedUserId)?.stream;
    } else if (remoteStreams.length > 0) {
      displayedStream = remoteStreams[remoteStreams.length - 1].stream;
    }
  }

  return (
    <div className="flex-1 bg-[#1A1A1A] rounded-2xl overflow-hidden relative border border-gray-800 flex flex-col">
      {isScreenSharing ? (
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain bg-black"
        />
      ) : displayedStream ? (
        <RemoteVideo
          stream={displayedStream}
          muted={pinnedUserId === "local"}
          className={`w-full h-full object-contain bg-black ${pinnedUserId === "local" ? "transform scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-[#0d1522] to-[#111827] flex items-center justify-center">
          <pre className="text-sky-500/30 font-mono text-sm sm:text-lg md:text-2xl p-8 opacity-50 select-none">
            {`// Esperando transmisión...`}
          </pre>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-[#0A304E] text-sky-200 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-2 z-10">
        {isScreenSharing ? (
          <>
            <MonitorUp className="w-4 h-4" /> Tu presentación
          </>
        ) : pinnedUserId ? (
          <>
            <Pin className="w-4 h-4" /> Video fijado
          </>
        ) : remoteStreams.length > 0 ? (
          <>
            <MonitorUp className="w-4 h-4" /> Viendo presentación externa
          </>
        ) : (
          "El área está libre"
        )}
      </div>
    </div>
  );
}
