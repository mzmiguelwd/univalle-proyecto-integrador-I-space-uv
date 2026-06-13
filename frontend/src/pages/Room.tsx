import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection,
  addDoc,
  serverTimestamp, } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { endStudyRoom } from "../config/rooms";
import { getUserProfile, type UserProfile } from "../config/auth";
type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string;
};
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

// ── Avatares emoji (igual que en RegisterPage) ────────────────
const AVATARS: Record<string, string> = {
  owl: "🦉", rocket: "🚀", brain: "🧠", star: "⭐",
  fire: "🔥", diamond: "💎", plant: "🌱", bolt: "⚡",
  moon: "🌙", book: "📚", atom: "⚛️", compass: "🧭",
};

// ── Helper: renderiza avatar de un participante ───────────────
function ParticipantAvatar({
  name,
  avatar,
  size = 12,
}: {
  name: string;
  avatar?: string | null;
  size?: number;
}) {
  const cls = `h-${size} w-${size} rounded-full object-cover`;

  // URL de Google
  if (avatar && avatar.startsWith("http")) {
    return <img src={avatar} alt={name} className={cls} />;
  }
  // ID de emoji
  if (avatar && AVATARS[avatar]) {
    return (
      <div className={`h-${size} w-${size} rounded-full bg-slate-700 flex items-center justify-center text-2xl`}>
        {AVATARS[avatar]}
      </div>
    );
  }
  // Fallback: inicial
  return (
    <div className={`h-${size} w-${size} rounded-full bg-sky-700 flex items-center justify-center font-bold text-white text-lg`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate   = useNavigate();

  const [myStream,     setMyStream]     = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [profile,      setProfile]      = useState<UserProfile | null>(null);

  const [isMicrophoneOn,  setIsMicrophoneOn]  = useState(false);
  const [isCameraOn,      setIsCameraOn]      = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [message,         setMessage]         = useState("");
  const [hasCopiedId,     setHasCopiedId]     = useState(false);
  const [isOwner,         setIsOwner]         = useState(false);
  const [showLeaveModal,  setShowLeaveModal]  = useState(false);
  const [isProcessing,    setIsProcessing]    = useState(false);

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ── Cargar perfil ─────────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const data = await getUserProfile(currentUser.uid);
      if (data) setProfile(data);
    };
    loadUser();
  }, []);

  const currentUser = useMemo(() => ({
    uid:    profile?.uid    || "",
    name:   profile?.name   || "Usuario",
    avatar: profile?.avatar || null,
  }), [profile]);

  //Scroll automatico al recibir un nuevo mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  

  // ── Función para chat
  const handleSendMessage = async () => {
    const cleanText = message.trim().replace(/[<>]/g, "");

    if (!roomId || !cleanText || !auth.currentUser) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text: cleanText,
      senderId: auth.currentUser.uid,
      senderName: profile?.name || profile?.username || "Usuario",
      timestamp: new Date().toISOString(),
    };

    socketRef.current?.emit("chat:send-message", {
      roomId,
      message: newMessage,
    });

    await addDoc(collection(db, "rooms", roomId, "messages"), {
      text: newMessage.text,
      senderId: newMessage.senderId,
      senderName: newMessage.senderName,
      timestamp: serverTimestamp(),
    });

    setMessage("");
  };

  // ── Callback cuando el anfitrión cierra la sala ───────────
  const handleRoomEnded = () => {
    navigate("/dashboard");
  };

  const { remoteStreams, participants, socketRef, cleanup } = useWebRTC(
    roomId!,
    myStream,
    screenStream,
    currentUser,
    handleRoomEnded, // ← invitado es redirigido automáticamente
  );

  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current) {
        setSocketReady(true);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [socketRef]);

  // ── Listener de chat ─────────────
  useEffect(() => {
    if (!socketReady || !socketRef.current) return;

    const handleNewMessage = (newMessage: ChatMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    };

    socketRef.current.on("chat:new-message", handleNewMessage);

    return () => {
      socketRef.current?.off("chat:new-message", handleNewMessage);
    };
  }, [socketReady]);

  // ── Verificar si es anfitrión ─────────────────────────────
  useEffect(() => {
    const checkOwnership = async () => {
      if (!roomId || !auth.currentUser) return;
      try {
        const roomDoc = await getDoc(doc(db, "rooms", roomId));
        if (roomDoc.exists() && roomDoc.data().ownerId === auth.currentUser.uid) {
          setIsOwner(true);
        }
      } catch (err) {
        console.error("Error verificando permisos de la sala:", err);
      }
    };
    checkOwnership();
  }, [roomId]);

  // ── Acciones de salida ────────────────────────────────────
  const stopAllStreams = () => {
    myStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setMyStream(null);
    setScreenStream(null);
  };

  const handleLeaveOnly = () => {
    stopAllStreams();
    cleanup();
    navigate("/dashboard");
  };

  const handleEndRoomForAll = async () => {
    if (!roomId) return;
    setIsProcessing(true);
    try {
      // Notificar al backend para que emita "room-ended" a todos
      socketRef.current?.emit("end-room", { roomId });
      await endStudyRoom(roomId);
      stopAllStreams();
      cleanup();
      navigate("/dashboard");
    } catch (err) {
      console.error("Error al finalizar la sala:", err);
      setIsProcessing(false);
    }
  };

  // ── Cámara ────────────────────────────────────────────────
  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isMicrophoneOn,
        });
        localStreamRef.current = stream;
        setMyStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setIsCameraOn(true);
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
      }
    } else {
      myStream?.getTracks().forEach((t) => t.stop());
      setMyStream(null);
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      setIsCameraOn(false);
    }
  };

  // ── Micrófono ─────────────────────────────────────────────
  const toggleMicrophone = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !isMicrophoneOn;
      });
    }
    setIsMicrophoneOn(!isMicrophoneOn);
  };

  // ── Pantalla compartida ───────────────────────────────────
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
        setScreenStream(stream);
        setTimeout(() => {
          if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
        }, 100);
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        };
      } catch (err) {
        console.error("Error al compartir pantalla:", err);
      }
    } else {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      setIsScreenSharing(false);
    }
  };

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      stopAllStreams();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setHasCopiedId(true);
      setTimeout(() => setHasCopiedId(false), 2000);
    }
  };

  // Total de personas en la sala: yo + participantes remotos
  const totalParticipants = participants.length + 1;

  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-[#0F0F0F]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0F0F0F] flex flex-col font-sans text-gray-100 overflow-hidden relative">

      {/* ── TOP BAR ── */}
      <div className="h-14 shrink-0 bg-[#121212] border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm font-medium">ID de la Sala:</span>
            <div className="flex items-center bg-[#1A1A1A] border border-gray-700 rounded-lg px-3 py-1.5 gap-3">
              <span className="text-sky-300 font-mono text-sm tracking-wide">{roomId}</span>
              <button onClick={copyRoomId}
                className="text-gray-400 hover:text-white transition-colors"
                title="Copiar ID">
                {hasCopiedId
                  ? <Check className="w-4 h-4 text-green-500" />
                  : <Copy className="w-4 h-4" />}
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

      {/* ── ÁREA PRINCIPAL ── */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">

        {/* Pantalla compartida / área central */}
        <div className="flex-1 bg-[#1A1A1A] rounded-2xl overflow-hidden relative border border-gray-800 flex flex-col">
          {isScreenSharing ? (
            <video ref={screenVideoRef} autoPlay playsInline muted
              className="w-full h-full object-contain bg-black" />
          ) : remoteStreams.length > 0 ? (
            <RemoteVideo
              stream={remoteStreams[remoteStreams.length - 1].stream}
              className="w-full h-full object-contain bg-black" />
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

        {/* Barra lateral derecha */}
        <div className="w-80 lg:w-[380px] flex flex-col gap-4">

          {/* Conteo de participantes */}
          <div className="flex items-center justify-between px-3 text-xs text-gray-400">
            <span>Participantes: {totalParticipants}</span>
            <span>{participants.length} invitado{participants.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Grid de cámaras */}
          <div className="grid grid-cols-2 gap-3 shrink-0 overflow-y-auto max-h-52">

            {/* ── TU PROPIA TARJETA (siempre visible) ── */}
            <div className="bg-[#1E1E1E] rounded-xl overflow-hidden relative border border-gray-800 h-20">
              {/* Video cuando cámara encendida */}
              <video
                ref={localVideoRef}
                autoPlay playsInline muted
                className={`w-full h-full object-cover transform scale-x-[-1] ${!isCameraOn ? "hidden" : ""}`}
              />
              {/* Avatar cuando cámara apagada */}
              {!isCameraOn && (
                <div className="w-full h-full flex items-center justify-between gap-2 p-2 bg-[#111827]">
                  <div className="flex items-center gap-2">
                    <ParticipantAvatar
                      name={profile.name || "Tú"}
                      avatar={profile.avatar}
                      size={10}
                    />
                    <div>
                      <p className="text-xs font-semibold text-white leading-tight truncate max-w-[70px]">
                        {profile.name?.split(" ")[0] || "Tú"}
                      </p>
                      <p className="text-[10px] text-gray-400">Cámara apagada</p>
                    </div>
                  </div>
                  <VideoOff className="w-4 h-4 text-gray-500 shrink-0" />
                </div>
              )}
              {/* Badge "Tú" siempre visible */}
              <div className="absolute bottom-1 left-2 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-gray-200 z-10">
                Tú
              </div>
            </div>

            {/* ── TARJETAS DE PARTICIPANTES REMOTOS ── */}
            {participants.map((participant) => {
              const remoteVideo = remoteStreams.find((s) => s.id === participant.id);

              return (
                <div key={participant.id}
                  className="bg-[#1E1E1E] rounded-xl overflow-hidden relative border border-gray-800 h-20">
                  {remoteVideo ? (
                    // Cámara encendida → mostrar video
                    <>
                      <RemoteVideo stream={remoteVideo.stream} />
                      <div className="absolute bottom-1 left-2 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-gray-200 z-10">
                        {participant.name}
                      </div>
                    </>
                  ) : (
                    // Cámara apagada → mostrar avatar + nombre
                    <div className="w-full h-full flex items-center justify-between gap-2 p-2 bg-[#111827]">
                      <div className="flex items-center gap-2">
                        <ParticipantAvatar
                          name={participant.name}
                          avatar={participant.avatar}
                          size={10}
                        />
                        <div>
                          <p className="text-xs font-semibold text-white leading-tight truncate max-w-[70px]">
                            {participant.name.split(" ")[0]}
                          </p>
                          <p className="text-[10px] text-gray-400">Cámara apagada</p>
                        </div>
                      </div>
                      <VideoOff className="w-4 h-4 text-gray-500 shrink-0" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel de Chat */}
          <div className="flex-1 bg-[#121212] rounded-2xl border border-gray-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
              <h3 className="font-mono text-sm font-bold text-gray-300">Chat de la Sala</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 scrollbar-thin">
              {messages.map((msg) => {
                const isMine = msg.senderId === auth.currentUser?.uid;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[75%] rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">
                      {!isMine && (
                        <p className="mb-1 text-xs text-slate-400">
                          {msg.senderName}
                        </p>
                      )}
                      <p>{msg.text}</p>
                    </div>
                    <div ref={messagesEndRef} />
                  </div>
                );
              })}
            </div>
            <div className="p-3 shrink-0">
              <div className="bg-[#1E1E1E] border border-gray-700 rounded-xl flex items-center pr-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 text-sky-400 hover:text-sky-300"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRA INFERIOR ── */}
      <div className="h-20 shrink-0 border-t border-gray-800 bg-[#121212] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={toggleCamera}
            className={`p-4 rounded-2xl transition-all ${isCameraOn ? "bg-[#2A2A2A] text-white hover:bg-gray-700" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"}`}>
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <button onClick={toggleMicrophone}
            className={`p-4 rounded-2xl transition-all ${isMicrophoneOn ? "bg-[#2A2A2A] text-white hover:bg-gray-700" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"}`}>
            {isMicrophoneOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={toggleScreenShare}
            className={`flex flex-col items-center gap-1.5 p-2 w-20 transition-colors ${isScreenSharing ? "text-sky-400" : "text-gray-400 hover:text-white"}`}>
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
            <div className="relative">
              <Users className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-sky-500 text-white text-[10px] px-1.5 rounded-full">
                {totalParticipants}
              </span>
            </div>
          </button>
          <button onClick={() => setShowLeaveModal(true)}
            className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 transition-all">
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── MODAL DE SALIDA ── */}
      {showLeaveModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">¿Salir de la sala?</h3>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              {isOwner
                ? "Como anfitrión, puedes salir dejando la sala abierta, o finalizarla para todos."
                : "Estás a punto de abandonar esta sesión de estudio."}
            </p>

            <div className="flex flex-col gap-3">
              {isOwner && (
                <button onClick={handleEndRoomForAll} disabled={isProcessing}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                  {isProcessing ? "Finalizando..." : "Finalizar para todos"}
                </button>
              )}
              <button onClick={handleLeaveOnly} disabled={isProcessing}
                className={`w-full py-3 px-4 font-bold rounded-xl transition-colors ${
                  isOwner
                    ? "bg-[#2A2A2A] text-white hover:bg-gray-700"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}>
                Solo salir de la sala
              </button>
              <button onClick={() => setShowLeaveModal(false)} disabled={isProcessing}
                className="w-full py-3 px-4 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium rounded-xl transition-colors mt-2">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente auxiliar RemoteVideo ───────────────────────────
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
