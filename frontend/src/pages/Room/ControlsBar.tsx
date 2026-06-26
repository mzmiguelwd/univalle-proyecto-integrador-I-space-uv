import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MessageSquare,
  Users,
  PhoneOff,
  Copy,
  Check,
} from "lucide-react";

// INTERFACES

interface ControlsBarProps {
  roomId: string;
  isOwner: boolean;
  isCameraOn: boolean;
  toggleCamera: () => void;
  isMicrophoneOn: boolean;
  toggleMicrophone: () => void;
  isScreenSharing: boolean;
  toggleScreenShare: () => void;
  totalParticipants: number;
  onLeaveClick: () => void;
  isChatOpen: boolean;
  toggleChat: () => void;
}

// MAIN COMPONENT

export default function ControlsBar({
  roomId,
  isOwner,
  isCameraOn,
  toggleCamera,
  isMicrophoneOn,
  toggleMicrophone,
  isScreenSharing,
  toggleScreenShare,
  totalParticipants,
  onLeaveClick,
  isChatOpen,
  toggleChat,
}: Readonly<ControlsBarProps>) {
  const [hasCopiedId, setHasCopiedId] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  // Clear the timer if the component is unloaded to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Copies the room ID to the clipboard and shows a temporary success state.
  const handleCopyRoomId = async () => {
    if (!roomId) return;

    try {
      await globalThis.navigator.clipboard.writeText(roomId);
      setHasCopiedId(true);

      if (timeoutRef.current) {
        globalThis.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = globalThis.setTimeout(() => {
        setHasCopiedId(false);
      }, 2000);
    } catch (error: unknown) {
      console.error("Error al copiar el ID de la sala:", error);
    }
  };

  return (
    <footer
      className="flex h-20 shrink-0 items-center justify-between border-t border-gray-800 bg-[#121212] px-4 md:px-6"
      aria-label="Controles de la sala"
    >
      {/* LEFT: ROOM INFO*/}
      <div className="flex flex-1 items-center justify-start gap-4">
        <div className="hidden items-center gap-3 rounded-lg border border-gray-700 bg-[#1A1A1A] px-3 py-1.5 transition-colors hover:border-gray-600 sm:flex">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            ID de la sala
          </span>
          <span className="font-mono text-sm tracking-wide text-sky-300 select-all">
            {roomId}
          </span>
          <button
            type="button"
            onClick={handleCopyRoomId}
            className="text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
            title="Copiar ID de la sala"
            aria-label="Copiar ID de la sala al portapapeles"
          >
            {hasCopiedId ? (
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          {/* Invisible notice regarding accessibility when copying */}
          <span className="sr-only" aria-live="polite">
            {hasCopiedId ? "ID copiado al portapapeles" : ""}
          </span>
        </div>

        {isOwner && (
          <span
            className="hidden rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 md:block cursor-default select-none"
            title="Eres el anfitrión de esta sala"
          >
            Anfitrión
          </span>
        )}
      </div>

      {/* CENTER: MEDIA CONTROLS (AV & SCREEN) */}
      <div className="flex shrink-0 items-center justify-center gap-2 sm:gap-3">
        {/* MICROPHONE TOGGLE */}
        <button
          type="button"
          onClick={toggleMicrophone}
          aria-label={
            isMicrophoneOn ? "Silenciar micrófono" : "Encender micrófono"
          }
          aria-pressed={isMicrophoneOn}
          className={`rounded-2xl p-3.5 sm:p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isMicrophoneOn
              ? "bg-[#2A2A2A] text-white hover:bg-gray-700"
              : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
          }`}
        >
          {isMicrophoneOn ? (
            <Mic className="h-5 w-5" aria-hidden="true" />
          ) : (
            <MicOff className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {/* CAMERA TOGGLE */}
        <button
          type="button"
          onClick={toggleCamera}
          aria-label={isCameraOn ? "Apagar cámara" : "Encender cámara"}
          aria-pressed={isCameraOn}
          className={`rounded-2xl p-3.5 sm:p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isCameraOn
              ? "bg-[#2A2A2A] text-white hover:bg-gray-700"
              : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
          }`}
        >
          {isCameraOn ? (
            <Video className="h-5 w-5" aria-hidden="true" />
          ) : (
            <VideoOff className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {/* SCREEN SHARE TOGGLE */}
        <button
          type="button"
          onClick={toggleScreenShare}
          aria-label={
            isScreenSharing
              ? "Dejar de presentar pantalla"
              : "Presentar pantalla"
          }
          aria-pressed={isScreenSharing}
          className={`flex w-16 sm:w-20 flex-col items-center justify-center gap-1.5 rounded-xl p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isScreenSharing
              ? "bg-sky-900/20 text-sky-400 hover:bg-sky-900/40"
              : "bg-transparent text-gray-400 hover:bg-[#2A2A2A] hover:text-white"
          }`}
        >
          <MonitorUp className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium hidden sm:block">
            {isScreenSharing ? "Detener" : "Presentar"}
          </span>
        </button>
      </div>

      {/* RIGHT: SIDEBAR TOGGLES & LEAVE */}
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        {/* CHAT TOGGLE */}
        {/* CHAT TOGGLE (Visible solo en móviles) */}
        <button
          type="button"
          onClick={toggleChat}
          aria-label={isChatOpen ? "Cerrar chat" : "Abrir chat"}
          // 👇 Aquí agregamos "lg:hidden" al inicio de las clases
          className={`lg:hidden rounded-xl p-3 sm:p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isChatOpen
              ? "bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20"
              : "border border-sky-900/50 bg-[#0A2E46] text-sky-400 hover:bg-[#0C3A5A]"
          }`}
        >
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* PARTICIPANTS COUNTER */}
        <button
          type="button"
          aria-label={`Ver ${totalParticipants} participantes`}
          className="rounded-xl bg-[#2A2A2A] p-3 sm:p-3.5 text-gray-300 transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <div className="relative">
            <Users className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -right-2 -top-2 rounded-full border border-[#2A2A2A] bg-sky-500 px-1.5 text-[10px] font-bold text-white">
              {totalParticipants}
            </span>
          </div>
        </button>

        {/* LEAVE ROOM */}
        <button
          type="button"
          onClick={onLeaveClick}
          aria-label="Salir de la sala"
          className="ml-1 sm:ml-2 rounded-2xl bg-red-600 p-3 sm:p-3.5 text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <PhoneOff className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
