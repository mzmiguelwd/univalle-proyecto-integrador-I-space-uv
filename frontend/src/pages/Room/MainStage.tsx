import { useEffect, useRef } from "react";
import { MonitorUp, Pin } from "lucide-react";
import type { RemoteStream } from "../../hooks/useWebRTC";

const RemoteVideo = ({
  stream,
  className = "w-full h-full object-cover",
}: {
  stream: MediaStream;
  className?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <video ref={videoRef} autoPlay playsInline className={className}>
      <track kind="captions" label="Captions" />
    </video>
  );
};

interface MainStageProps {
  isPresenterMode: boolean;
  isScreenSharing: boolean;
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteStreams: RemoteStream[];
  activeScreenStream: RemoteStream | null;
  myStream: MediaStream | null;
  pinnedUserId: string | null;
}

export default function MainStage({
  isScreenSharing,
  screenVideoRef,
  remoteStreams,
  isPresenterMode,
  activeScreenStream,
  myStream,
  pinnedUserId,
}: MainStageProps) {
  let displayedStream: MediaStream | null = null;

  if (pinnedUserId === "local" && myStream) {
    displayedStream = myStream;
  } else if (pinnedUserId) {
    displayedStream =
      remoteStreams.find((s) => s.id === pinnedUserId && s.type === "camera")
        ?.stream ?? null;
  } else if (activeScreenStream) {
    displayedStream = activeScreenStream.stream;
  }

  return (
    <div
      className={`flex-1 min-h-[360px] bg-[#1A1A1A] rounded-2xl overflow-hidden relative border flex flex-col transition-all duration-300 ${
        isPresenterMode
          ? "lg:flex-[1_1_75%] border-sky-500/40 shadow-[0_0_40px_rgba(14,165,233,0.12)]"
          : "border-gray-800"
      }`}
    >
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
          className={`w-full h-full object-contain bg-black ${
            pinnedUserId === "local" ? "transform scale-x-[-1]" : ""
          }`}
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
        ) : activeScreenStream ? (
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