import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

import { auth, db } from "../../config/firebase.ts";
import { getUserProfile, type UserProfile } from "../../config/auth.ts";
import { useWebRTC } from "../../hooks/useWebRTC.ts";

import MainStage from "./MainStage.tsx";
import ControlsBar from "./ControlsBar.tsx";
import ChatPanel from "./ChatPanel.tsx";
import LeaveModal from "./LeaveModal.tsx";
import PermissionAlert from "./PermissionAlert.tsx";
import ParticipantsGrid from "./ParticipantsGrid.tsx";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // GLOBAL STATES
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [isOwner, setIsOwner] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);

  // GLOBAL REFS
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  /**
   * FIX #6: localStreamRef es la única fuente de verdad para el stream local.
   * setMyStream se usa SOLO para notificar a useWebRTC del cambio (triggering
   * el efecto de renegociación). Las manipulaciones de tracks siempre van
   * contra localStreamRef.current.
   */
  const localStreamRef = useRef<MediaStream | null>(null);

  // INITIALIZATION

  useEffect(() => {
    const initializeRoom = async () => {
      if (!roomId || !auth.currentUser) return;

      try {
        const userData = await getUserProfile(auth.currentUser.uid);
        if (userData) setProfile(userData);

        const roomRef = doc(db, "rooms", roomId);
        const roomDoc = await getDoc(roomRef);

        if (
          roomDoc.exists() &&
          roomDoc.data().ownerId === auth.currentUser.uid
        ) {
          setIsOwner(true);
        }
      } catch (error: unknown) {
        console.error("[Room] Error inicializando sala:", error);
      }
    };

    initializeRoom();
  }, [roomId]);

  const currentUser = useMemo(
    () => ({
      uid: profile?.uid ?? "",
      name: profile?.name ?? "Usuario",
      avatar: profile?.avatar ?? null,
    }),
    [profile],
  );

  const handleRoomEnded = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // CORE: WEBRTC

  const {
    remoteStreams,
    participants,
    socketRef,
    cleanup,
    emitMediaState,
    updatePeerTracksCallback,
  } = useWebRTC(
    roomId ?? "",
    myStream,
    screenStream,
    currentUser,
    handleRoomEnded,
  );

  /**
   * FIX #3: La lógica de "presenter mode" ahora usa el estado de socket
   * (isScreenSharing de los participantes) en lugar de intentar detectar
   * por contentHint del stream, que no funciona en WebRTC.
   */
  const isPresenterMode =
    isScreenSharing || participants.some((p) => p.isScreenSharing);

  // MEDIA CONTROL HANDLERS

  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      // Detener los tracks de video del stream actual
      localStreamRef.current?.getVideoTracks().forEach((track) => track.stop());

      // Emitir al servidor que la cámara se apagó
      socketRef.current?.emit("camera-stopped", { roomId });
      emitMediaState(isMicrophoneOn, false);

      // Construir nuevo stream solo con audio (si existe)
      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const nextStream =
        audioTracks.length > 0 ? new MediaStream(audioTracks) : null;

      localStreamRef.current = nextStream;
      setMyStream(nextStream); // Notifica a useWebRTC para renegociar

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = nextStream;
      }

      setIsCameraOn(false);

      // Renegociar inmediatamente
      updatePeerTracksCallback?.();
    } else {
      try {
        setPermissionError(null);
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
        const newVideoTracks = videoStream.getVideoTracks();
        const newStream = new MediaStream([...audioTracks, ...newVideoTracks]);

        localStreamRef.current = newStream;
        setMyStream(newStream); // Notifica a useWebRTC para renegociar

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }

        setIsCameraOn(true);
        emitMediaState(isMicrophoneOn, true);
        updatePeerTracksCallback?.();
      } catch (error: unknown) {
        console.error("[Room] Error accediendo a cámara:", error);
        setPermissionError(
          "Permiso de cámara denegado. Por favor, habilítalo en la configuración de tu navegador.",
        );
      }
    }
  }, [
    isCameraOn,
    isMicrophoneOn,
    roomId,
    socketRef,
    emitMediaState,
    updatePeerTracksCallback,
  ]);

  /**
   * FIX #7: toggleMicrophone ahora crea un stream nuevo en lugar de
   * solo deshabilitar el track. Deshabilitar (track.enabled = false) mantiene
   * el track en el RTCPeerConnection y envía silencio, pero no refleja
   * correctamente el estado "micrófono apagado" para los demás.
   *
   * La estrategia correcta:
   * - Apagar: detener el track y reconstruir el stream sin audio
   * - Encender: pedir nuevo stream de audio y añadir al stream existente
   *
   * EXCEPCIÓN: Para mute/unmute simple (sin quitar permisos), usar enabled
   * es más eficiente. Aquí elegimos la versión robusta que funciona en todos
   * los casos (incluyendo cuando el track llega a "ended" state).
   */
  const toggleMicrophone = useCallback(async () => {
    if (isMicrophoneOn) {
      // Silenciar: detener tracks de audio y reconstruir sin ellos
      localStreamRef.current?.getAudioTracks().forEach((track) => track.stop());

      const videoTracks = localStreamRef.current?.getVideoTracks() ?? [];
      const nextStream =
        videoTracks.length > 0 ? new MediaStream(videoTracks) : null;

      localStreamRef.current = nextStream;
      setMyStream(nextStream);

      setIsMicrophoneOn(false);
      emitMediaState(false, isCameraOn);
      updatePeerTracksCallback?.();
    } else {
      try {
        setPermissionError(null);
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        const videoTracks = localStreamRef.current?.getVideoTracks() ?? [];
        const newAudioTracks = audioStream.getAudioTracks();
        const newStream = new MediaStream([...videoTracks, ...newAudioTracks]);

        localStreamRef.current = newStream;
        setMyStream(newStream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }

        setIsMicrophoneOn(true);
        emitMediaState(true, isCameraOn);
        updatePeerTracksCallback?.();
      } catch (error: unknown) {
        console.error("[Room] Error accediendo a micrófono:", error);
        setPermissionError(
          "Permiso de micrófono denegado. Por favor, habilítalo en la configuración de tu navegador.",
        );
      }
    }
  }, [isMicrophoneOn, isCameraOn, emitMediaState, updatePeerTracksCallback]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((track) => track.stop());
      socketRef.current?.emit("screen-share-stopped", { roomId });

      setScreenStream(null);
      setIsScreenSharing(false);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: false, // El audio del sistema tiene issues de eco; usar false
        });

        setScreenStream(stream);
        setIsScreenSharing(true);
        socketRef.current?.emit("screen-share-started", { roomId });

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }

        // Cuando el usuario detiene desde el browser (botón "Dejar de compartir")
        const screenTrack = stream.getVideoTracks()[0];
        screenTrack.addEventListener("ended", () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          socketRef.current?.emit("screen-share-stopped", { roomId });
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        });
      } catch (error: unknown) {
        console.error(
          "[Room] Error iniciando compartición de pantalla:",
          error,
        );
      }
    }
  }, [isScreenSharing, screenStream, roomId, socketRef]);

  // CLEANUP & LEAVE HANDLERS

  const stopAllStreams = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());

    localStreamRef.current = null;
    setMyStream(null);
    setScreenStream(null);
  }, [screenStream]);

  // Limpiar streams al desmontar el componente
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleLeaveOnly = useCallback(() => {
    stopAllStreams();
    cleanup();
    navigate("/dashboard");
  }, [stopAllStreams, cleanup, navigate]);

  const handleEndRoomForAll = useCallback(async () => {
    if (!roomId) return;
    setIsProcessing(true);

    try {
      socketRef.current?.emit("end-room", { roomId });
      stopAllStreams();
      cleanup();
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("[Room] Error finalizando la sala:", error);
      setIsProcessing(false);
    }
  }, [roomId, socketRef, stopAllStreams, cleanup, navigate]);

  // RENDER

  if (!roomId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F0F0F] text-white">
        <p className="text-zinc-400">Identificador de sala no válido.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F0F0F] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-8 w-8 animate-spin text-sky-400"
            aria-hidden="true"
          />
          <p className="text-sm text-zinc-400">
            Cargando entorno de estudio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0F0F0F] font-sans text-gray-100">
      <PermissionAlert
        error={permissionError}
        onClose={() => setPermissionError(null)}
      />

      <section className="flex flex-1 flex-col overflow-hidden p-4 gap-4 transition-all duration-300 lg:flex-row">
        <MainStage
          isScreenSharing={isScreenSharing}
          isPresenterMode={isPresenterMode}
          screenVideoRef={screenVideoRef}
          remoteStreams={remoteStreams}
          activeScreenStream={
            // FIX #3: El stream del presentador remoto se identifica por
            // el estado isScreenSharing del participante, no por contentHint
            remoteStreams.find((s) =>
              participants.find(
                (p) => p.peerId === s.peerId && p.isScreenSharing,
              ),
            ) ?? null
          }
          myStream={myStream}
          pinnedUserId={pinnedUserId}
        />

        <aside
          className={`flex flex-col gap-4 transition-all duration-300 ${
            isPresenterMode ? "w-full lg:w-70 xl:w-[320px]" : "w-full lg:w-95"
          }`}
        >
          <ParticipantsGrid
            profile={profile}
            isPresenterMode={isPresenterMode}
            isCameraOn={isCameraOn}
            isMicrophoneOn={isMicrophoneOn}
            localVideoRef={localVideoRef}
            participants={participants}
            remoteStreams={remoteStreams}
            pinnedUserId={pinnedUserId}
            onPinUser={(id) =>
              setPinnedUserId((prev) => (prev === id ? null : id))
            }
          />
          <ChatPanel roomId={roomId} profile={profile} />
        </aside>
      </section>

      <ControlsBar
        roomId={roomId}
        isOwner={isOwner}
        isCameraOn={isCameraOn}
        toggleCamera={toggleCamera}
        isMicrophoneOn={isMicrophoneOn}
        toggleMicrophone={toggleMicrophone}
        isScreenSharing={isScreenSharing}
        toggleScreenShare={toggleScreenShare}
        totalParticipants={participants.length + 1}
        onLeaveClick={() => setShowLeaveModal(true)}
      />

      <LeaveModal
        isOpen={showLeaveModal}
        isOwner={isOwner}
        isProcessing={isProcessing}
        onClose={() => setShowLeaveModal(false)}
        onLeave={handleLeaveOnly}
        onEndForAll={handleEndRoomForAll}
      />
    </main>
  );
}
