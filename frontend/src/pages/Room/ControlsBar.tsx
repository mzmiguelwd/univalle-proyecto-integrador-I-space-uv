import { useState } from "react";
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

// Types & Interfaces

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
}

// Main Component

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
}: ControlsBarProps) {
  const [hasCopiedId, setHasCopiedId] = useState(false);

  /**
   * Copies the room ID to the clipboard and shows a temporary success state.
   */
  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setHasCopiedId(true);
      setTimeout(() => setHasCopiedId(false), 2000);
    }
  };

  return (
    <div className="h-20 shrink-0 border-t border-gray-800 bg-[#121212] px-6 flex items-center justify-between">
      {/* ── LEFT: Room Info ── */}
      <div className="flex-1 flex items-center gap-4 justify-start">
        <div className="hidden sm:flex items-center bg-[#1A1A1A] border border-gray-700 rounded-lg px-3 py-1.5 gap-3 transition-colors hover:border-gray-600">
          <span className="text-sky-300 font-mono text-sm tracking-wide">
            {roomId}
          </span>
          <button
            onClick={copyRoomId}
            className="text-gray-400 hover:text-white transition-colors"
            title="Copiar ID de la sala"
            aria-label="Copiar ID"
          >
            {hasCopiedId ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {isOwner && (
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider hidden md:block">
            Anfitrión
          </span>
        )}
      </div>

      {/* ── CENTER: Media Controls (AV & Screen) ── */}
      <div className="flex shrink-0 items-center justify-center gap-3">
        {/* Microphone Toggle */}
        <button
          onClick={toggleMicrophone}
          aria-label={
            isMicrophoneOn ? "Apagar micrófono" : "Encender micrófono"
          }
          className={`p-4 rounded-2xl transition-all ${
            isMicrophoneOn
              ? "bg-[#2A2A2A] text-white hover:bg-gray-700"
              : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
          }`}
        >
          {isMicrophoneOn ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          aria-label={isCameraOn ? "Apagar cámara" : "Encender cámara"}
          className={`p-4 rounded-2xl transition-all ${
            isCameraOn
              ? "bg-[#2A2A2A] text-white hover:bg-gray-700"
              : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
          }`}
        >
          {isCameraOn ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          aria-label={
            isScreenSharing ? "Dejar de presentar" : "Presentar pantalla"
          }
          className={`flex flex-col items-center justify-center gap-1.5 p-2 w-20 transition-colors rounded-xl ${
            isScreenSharing
              ? "text-sky-400 bg-sky-900/20 hover:bg-sky-900/40"
              : "text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
          }`}
        >
          <MonitorUp className="w-5 h-5" />
          <span className="text-[10px] font-medium">
            {isScreenSharing ? "Detener" : "Presentar"}
          </span>
        </button>
      </div>

      {/* ── RIGHT: Sidebar Toggles & Leave ── */}
      <div className="flex-1 flex items-center gap-3 justify-end">
        {/* Chat Toggle (Ready for future mobile/sidebar implementation) */}
        <button
          aria-label="Abrir panel de chat"
          className="p-3.5 text-sky-400 bg-[#0A2E46] rounded-xl border border-sky-900/50 hover:bg-[#0C3A5A] transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Participants Counter */}
        <button
          aria-label="Ver participantes"
          className="p-3.5 rounded-xl bg-[#2A2A2A] text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-sky-500 text-white text-[10px] px-1.5 rounded-full border border-[#2A2A2A]">
              {totalParticipants}
            </span>
          </div>
        </button>

        {/* Leave Room */}
        <button
          onClick={onLeaveClick}
          aria-label="Salir de la llamada"
          className="p-3.5 ml-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 transition-all"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
