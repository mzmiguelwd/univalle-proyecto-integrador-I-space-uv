import { useEffect, useRef, useMemo } from "react";
import { MonitorUp, Pin } from "lucide-react";

import type { RemoteStream } from "../../hooks/useWebRTC.ts";

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

const RemoteVideo = ({
  stream,
  className = "h-full w-full object-cover rounded-2xl",
  muted = false,
}: Readonly<RemoteVideoProps>) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
};

export default function MainStage({
  isPresenterMode,
  isScreenSharing,
  screenVideoRef,
  remoteStreams,
  activeScreenStream,
  pinnedUserId,
}: Readonly<MainStageProps>) {
  // Filtrar estrictamente la cámara cuando un usuario esté fijado
  const pinnedStream = useMemo(() => {
    if (!pinnedUserId) return null;
    return remoteStreams.find(
      (s) => s.id === pinnedUserId && s.type === "camera",
    );
  }, [remoteStreams, pinnedUserId]);

  const renderContent = () => {
    // Caso 1: Estás compartiendo tu propia pantalla local
    if (isScreenSharing) {
      return (
        <video
          ref={screenVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain bg-black rounded-2xl"
        />
      );
    }

    // Caso 2: Alguien más en la sala comparte pantalla (Prioridad alta)
    if (activeScreenStream) {
      return (
        <RemoteVideo
          stream={activeScreenStream.stream}
          className="h-full w-full object-contain bg-black rounded-2xl"
        />
      );
    }

    // Caso 3: Has fijado la cámara de un usuario en grande
    if (pinnedStream) {
      return (
        <RemoteVideo
          stream={pinnedStream.stream}
          className="h-full w-full object-cover rounded-2xl"
        />
      );
    }

    // Caso por defecto: El escenario principal está libre
    return (
      <div className="flex flex-1 items-center justify-center bg-linear-to-br from-[#0d1522] to-[#111827] rounded-2xl h-full w-full">
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

    if (activeScreenStream) {
      return (
        <>
          <MonitorUp className="h-4 w-4" aria-hidden="true" /> Viendo
          presentación externa
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

    return "El área está libre";
  };

  return (
    <div className="relative flex min-h-90 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-800 bg-[#1A1A1A] transition-all duration-300 h-full w-full">
      <div className="flex-1 w-full h-full relative">{renderContent()}</div>
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-xs px-3 py-1.5 rounded-full flex items-center gap-2 text-white font-medium shadow-lg z-10">
        {renderStatusLabel()}
      </div>
    </div>
  );
}
