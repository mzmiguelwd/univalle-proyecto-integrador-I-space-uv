import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { endStudyRoom } from "../config/rooms";
import ChatHistory from "../components/rooms/ChatHistory";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MessageSquare,
  Send,
  Users,
  PhoneOff,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { useWebRTC } from "../hooks/useWebRTC";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // 1. Estado para almacenar tu propio MediaStream local
  const [myStream, setMyStream] = useState<MediaStream | null>(null);

  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // 2. Le pasamos el stream de cámara y pantalla al hook.
  // Esto hará la conexión automática con Socket.io y WebRTC
  const { remoteStreams } = useWebRTC(roomId!, myStream, screenStream);

  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [message, setMessage] = useState("");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasCopiedId, setHasCopiedId] = useState(false);

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setHasCopiedId(true);
      setTimeout(() => setHasCopiedId(false), 2000);
    }
  };

  // 1. Referencias para inyectar el video en el HTML
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Referencias para guardar los "streams" y poder apagarlos después
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [isOwner, setIsOwner] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Verificar si el usuario es el anfitrión al entrar
  useEffect(() => {
    const checkOwnership = async () => {
      if (!roomId || !auth.currentUser) return;

      try {
        const roomDoc = await getDoc(doc(db, "rooms", roomId));
        if (
          roomDoc.exists() &&
          roomDoc.data().ownerId === auth.currentUser.uid
        ) {
          setIsOwner(true);
        }
      } catch (error) {
        console.error("Error verificando permisos de la sala:", error);
      }
    };

    checkOwnership();
  }, [roomId]);

  // Acciones de salida
  const handleLeaveOnly = () => {
    // Solo se va el usuario. (Aquí iría la lógica de desconectar su Socket)
    navigate("/dashboard");
  };

  const handleEndRoomForAll = async () => {
    if (!roomId) return;
    setIsProcessing(true);
    try {
      await endStudyRoom(roomId); // Cambia isActive a false en Firestore
      // El resto de usuarios deberían tener un onSnapshot que los expulse si isActive es false
      navigate("/dashboard");
    } catch (error) {
      console.error("Error al finalizar la sala:", error);
      setIsProcessing(false);
    }
  };

  // 2. Función para encender/apagar Cámara y Micrófono
  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isMicrophoneOn,
        });

        setMyStream(stream); // <--- Guardamos el stream en el estado

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsCameraOn(true);
      } catch (error) {
        console.error("Error al acceder a la cámara:", error);
      }
    } else {
      myStream?.getTracks().forEach((track) => track.stop());
      setMyStream(null);
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      setIsCameraOn(false);
    }
  };

  const toggleMicrophone = () => {
    if (localStreamRef.current) {
      // Activar o desactivar las pistas de audio existentes
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMicrophoneOn;
      });
    }
    setIsMicrophoneOn(!isMicrophoneOn);
  };

  // 3. Función para Compartir Pantalla
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        setIsScreenSharing(true);
        setScreenStream(stream);

        // Usamos un pequeño timeout o effect para asegurar que el ref ya exista
        // cuando inyectamos el stream ya que usamos renderizado condicional con el video
        setTimeout(() => {
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = stream;
          }
        }, 100);

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        };
      } catch (error) {
        console.error("Error al compartir pantalla:", error);
      }
    } else {
      screenStream?.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      setIsScreenSharing(false);
    }
  };

  // Limpieza al desmontar el componente (salir de la sala)
  useEffect(() => {
    const localStream = localStreamRef.current;
    const screenStream = screenStreamRef.current;

    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      screenStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="h-screen w-full bg-[#0F0F0F] flex flex-col font-sans text-gray-100 overflow-hidden relative">
      {/* --- TOP BAR (ROOM ID) --- */}
      <div className="h-14 shrink-0 bg-[#121212] border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm font-medium">
              ID de la Sala:
            </span>
            <div className="flex items-center bg-[#1A1A1A] border border-gray-700 rounded-lg px-3 py-1.5 gap-3">
              <span className="text-sky-300 font-mono text-sm tracking-wide">
                {roomId}
              </span>
              <button
                onClick={copyRoomId}
                className="text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                title="Copiar ID"
              >
                {hasCopiedId ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {isOwner && (
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
              Anfitrión
            </span>
          )}
        </div>
      </div>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Izquierda: Pantalla Compartida */}
        <div className="flex-1 bg-[#1A1A1A] rounded-2xl overflow-hidden relative border border-gray-800 flex flex-col">
          {isScreenSharing ? (
            // Si TÚ estás compartiendo pantalla, ves tu propia pantalla
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain bg-black"
            />
          ) : remoteStreams.length > 0 ? (
            // Si el INVITADO está recibiendo video, lo mostramos en el centro como presentación
            <RemoteVideo
              stream={remoteStreams[remoteStreams.length - 1].stream}
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            // Pantalla en reposo
            <>
              <div className="absolute inset-0 bg-linear-to-br from-[#0d1522] to-[#111827] flex items-center justify-center">
                <pre className="text-sky-500/30 font-mono text-sm sm:text-lg md:text-2xl p-8 opacity-50 select-none">
                  {`// Esperando transmisión...`}
                </pre>
              </div>
            </>
          )}

          <div className="absolute bottom-4 left-4 bg-[#0A304E] text-sky-200 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-2 z-10">
            <MonitorUp className="w-4 h-4" />
            {isScreenSharing
              ? "Tu presentación"
              : remoteStreams.length > 0
                ? "Viendo presentación externa"
                : "El área está libre"}
          </div>
        </div>

        {/* Derecha: Barra Lateral */}
        <div className="w-80 lg:w-95 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 h-48 shrink-0 overflow-y-auto">
            {/* 1. TU CÁMARA (Local) */}
            <div className="bg-[#1E1E1E] rounded-xl overflow-hidden relative border border-gray-800 flex items-center justify-center h-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform scale-x-[-1] ${!isCameraOn ? "hidden" : ""}`}
              />
              {!isCameraOn && (
                <div className="absolute top-2 right-2 text-red-500">
                  <VideoOff className="w-4 h-4" />
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 text-[10px] px-2 py-0.5 rounded text-gray-200 z-10">
                Tú
              </div>
            </div>

            {/* 2. CÁMARAS DE LOS DEMÁS (Renderizado Dinámico de WebRTC) */}
            {remoteStreams.map((remoteNode) => (
              <div
                key={remoteNode.id}
                className="bg-[#1E1E1E] rounded-xl overflow-hidden relative border border-gray-800 h-20"
              >
                <RemoteVideo stream={remoteNode.stream} />
                <div className="absolute bottom-2 left-2 bg-black/60 text-[10px] px-2 py-0.5 rounded text-gray-200 z-10">
                  Participante
                </div>
              </div>
            ))}
          </div>

          {/* Panel de Chat */}
          <div className="flex-1 bg-[#121212] rounded-2xl border border-gray-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h3 className="font-mono text-sm font-bold text-gray-300">
                Chat de la Sala
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ChatHistory
                roomId={roomId ?? ""}
                currentUserId={auth.currentUser?.uid ?? ""}
              />
            </div>
            <div className="p-3 shrink-0">
              <div className="bg-[#1E1E1E] border border-gray-700 rounded-xl flex items-center pr-2">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  className="bg-transparent flex-1 py-3 px-4 text-sm text-white focus:outline-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button className="p-2 text-sky-400 hover:text-sky-300">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- BARRA INFERIOR DE CONTROLES --- */}
      <div className="h-20 shrink-0 border-t border-gray-800 bg-[#121212] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleCamera} // <--- Llamada a la función
            className={`p-4 rounded-2xl transition-all ${isCameraOn ? "bg-[#2A2A2A] text-white hover:bg-gray-700" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"}`}
          >
            {isCameraOn ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={toggleMicrophone} // <--- Asume que creaste esta función análoga
            className={`p-4 rounded-2xl transition-all ${isMicrophoneOn ? "bg-[#2A2A2A] text-white hover:bg-gray-700" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"}`}
          >
            {isMicrophoneOn ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleScreenShare} // <--- Llamada a la función
            className={`flex flex-col items-center gap-1.5 p-2 w-20 transition-colors ${isScreenSharing ? "text-sky-400" : "text-gray-400 hover:text-white"}`}
          >
            <MonitorUp className="w-5 h-5" />
            <span className="text-[10px] font-medium">
              {isScreenSharing ? "Dejar de presentar" : "Presentar"}
            </span>
          </button>
          <button className="flex flex-col items-center gap-1.5 p-2 text-sky-400 w-20 bg-[#0A2E46] rounded-xl border border-sky-900/50">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium">Chats</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-4 rounded-2xl bg-[#2A2A2A] text-gray-300 hover:bg-gray-700 transition-colors">
            <Users className="w-5 h-5" />
          </button>
          {/* BOTÓN DE SALIR */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 transition-all"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- MODAL DE CONFIRMACIÓN DE SALIDA --- */}
      {showLeaveModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                ¿Salir de la sala?
              </h3>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              {isOwner
                ? "Como anfitrión, puedes salir dejando la sala abierta para los demás, o finalizarla por completo."
                : "Estás a punto de abandonar esta sesión de estudio."}
            </p>

            <div className="flex flex-col gap-3">
              {isOwner && (
                <button
                  onClick={handleEndRoomForAll}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Finalizando..." : "Finalizar para todos"}
                </button>
              )}

              <button
                onClick={handleLeaveOnly}
                disabled={isProcessing}
                className={`w-full py-3 px-4 font-bold rounded-xl transition-colors ${
                  isOwner
                    ? "bg-[#2A2A2A] text-white hover:bg-gray-700"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                Solo salir de la sala
              </button>

              <button
                onClick={() => setShowLeaveModal(false)}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium rounded-xl transition-colors mt-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini-componente auxiliar al final de Room.tsx
const RemoteVideo = ({
  stream,
  className = "w-full h-full object-cover",
}: {
  stream: MediaStream;
  className?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video ref={videoRef} autoPlay playsInline className={className}>
      <track kind="captions" label="Captions" />
    </video>
  );
};
