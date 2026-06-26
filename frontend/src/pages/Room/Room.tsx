import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

import { auth, db } from "../../config/firebase.ts";
import { getUserProfile, type UserProfile } from "../../config/auth.ts";
import { useWebRTC, type RemoteStream } from "../../hooks/useWebRTC.ts";

import MainStage from "./MainStage.tsx";
import ControlsBar from "./ControlsBar.tsx";
import ChatPanel from "./ChatPanel.tsx";
import LeaveModal from "./LeaveModal.tsx";
import ParticipantsGrid from "./ParticipantsGrid.tsx";
import PermissionAlert from "./PermissionAlert.tsx";

// ── MAIN COMPONENT ────────────────────────────────────────────────────

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // ── GLOBAL STATES ──
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── MODAL STATES ──
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(window.innerWidth >= 1024);

  // ── LOCAL MEDIA STATES (The Source of Truth) ──
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // ── UI CONTROLS STATES ──
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);

  // ── HARDWARE REFS (Exclusively for unmount cleanup) ──
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Keep refs synchronized with state so cleanup always has the latest tracks
  useEffect(() => {
    localStreamRef.current = myStream;
  }, [myStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // ── 1. INITIALIZATION: LOAD PROFILE & ROOM DATA ──
  useEffect(() => {
    async function loadRoomAndProfile() {
      try {
        if (auth.currentUser) {
          const userData = await getUserProfile(auth.currentUser.uid);
          setProfile(userData);
        }
        if (roomId) {
          const roomDoc = await getDoc(doc(db, "rooms", roomId));
          if (roomDoc.exists()) {
            setIsOwner(roomDoc.data().ownerId === auth.currentUser?.uid);
          }
        }
      } catch (err) {
        console.error("[Room] Error loading room configuration:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRoomAndProfile();
  }, [roomId]);

  const currentUserPayload = useMemo(
    () => ({
      uid: profile?.uid ?? "",
      name: profile?.name ?? "Usuario",
      avatar: profile?.avatar ?? null,
    }),
    [profile],
  );

  // ── 2. WEBRTC HOOK INTEGRATION ──
  // Note: We removed the manual 'updatePeerTracksCallback' extraction.
  // The hook reacts automatically to 'myStream' changes via useEffect.
  const { remoteStreams, participants, socketRef, cleanup, emitMediaState } =
    useWebRTC(roomId ?? "", myStream, screenStream, currentUserPayload, () =>
      navigate("/dashboard"),
    );

  // ── 3. DERIVED MEDIA STATES ──
  const activeScreenStream = useMemo(() => {
    return remoteStreams.find((s: RemoteStream) => s.type === "screen") ?? null;
  }, [remoteStreams]);

  const cameraStreamsOnly = useMemo(() => {
    return remoteStreams.filter((s: RemoteStream) => s.type === "camera");
  }, [remoteStreams]);

  const isPresenterMode = isScreenSharing || Boolean(activeScreenStream);

  // ── 4. HARDWARE CONTROL HANDLERS (Clean State Mutation) ──

  const toggleMicrophone = async () => {
    const stream = myStream || new MediaStream();

    if (isMicrophoneOn) {
      // 1. Physically turn off and remove audio tracks
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        stream.removeTrack(track);
      });

      setIsMicrophoneOn(false);
      emitMediaState(false, isCameraOn);
      console.info("[Hardware] Microphone successfully muted.");

      // 2. Clone stream to trigger React re-render and useWebRTC reactivity
      const updatedStream = new MediaStream(stream.getTracks());
      setMyStream(updatedStream);
      if (localVideoRef.current)
        localVideoRef.current.srcObject = updatedStream;
    } else {
      try {
        setPermissionError(null);
        // 1. Request ONLY audio from the OS
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const newAudioTrack = audioStream.getAudioTracks()[0];

        // 2. Append new track to the existing active stream
        stream.addTrack(newAudioTrack);

        setIsMicrophoneOn(true);
        emitMediaState(true, isCameraOn);
        console.info("[Hardware] Microphone successfully unmuted.");

        // 3. Clone and trigger updates
        const updatedStream = new MediaStream(stream.getTracks());
        setMyStream(updatedStream);
        if (localVideoRef.current)
          localVideoRef.current.srcObject = updatedStream;
      } catch (err) {
        console.error("[Hardware] Error accessing microphone:", err);
        setPermissionError(
          "Permiso de micrófono denegado. Por favor, habilítalo en tu navegador.",
        );
      }
    }
  };

  const toggleCamera = async () => {
    const stream = myStream || new MediaStream();

    if (isCameraOn) {
      // 1. Physically turn off and remove video tracks (turns off the camera light)
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        stream.removeTrack(track);
      });

      setIsCameraOn(false);
      socketRef.current?.emit("camera-stopped", { roomId });
      emitMediaState(isMicrophoneOn, false);
      console.info("[Hardware] Camera successfully turned off.");

      // 2. Clone stream to trigger updates
      const updatedStream = new MediaStream(stream.getTracks());
      setMyStream(updatedStream);
      if (localVideoRef.current)
        localVideoRef.current.srcObject = updatedStream;
    } else {
      try {
        setPermissionError(null);
        // 1. Request ONLY video from the OS
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];

        // 2. Append new track to the existing active stream
        stream.addTrack(newVideoTrack);

        setIsCameraOn(true);
        emitMediaState(isMicrophoneOn, true);
        console.info("[Hardware] Camera successfully turned on.");

        // 3. Clone and trigger updates
        const updatedStream = new MediaStream(stream.getTracks());
        setMyStream(updatedStream);
        if (localVideoRef.current)
          localVideoRef.current.srcObject = updatedStream;
      } catch (err) {
        console.error("[Hardware] Error accessing camera:", err);
        setPermissionError(
          "Permiso de cámara denegado. Por favor, habilítalo en tu navegador.",
        );
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((track) => track.stop());
      socketRef.current?.emit("screen-share-stopped", { roomId });

      setScreenStream(null);
      setIsScreenSharing(false);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      console.info("[Hardware] Screen sharing stopped manually.");
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        setScreenStream(stream);
        setIsScreenSharing(true);
        socketRef.current?.emit("screen-share-started", { roomId });
        console.info("[Hardware] Screen sharing started.");

        setTimeout(() => {
          if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
        }, 100);

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          socketRef.current?.emit("screen-share-stopped", { roomId });
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
          console.info("[Hardware] Screen sharing stopped via browser UI.");
        };
      } catch (err) {
        console.error("[Hardware] Error sharing screen:", err);
      }
    }
  };

  // ── 🔍 DEPURACIÓN: OBSERVADOR DE ESTADO GLOBAL ──
  useEffect(() => {
    // Usamos console.groupCollapsed para no saturar la consola visualmente,
    // pero permitiendo expandir la tabla para analizarla.
    console.groupCollapsed("📊 [Debug] Estado de la Sala actualizado");

    // Mapeamos el estado local y remoto en un formato tabular amigable
    const tableData = [
      {
        Rol: "LOCAL (Tú)",
        Nombre: profile?.name || "Usuario Local",
        Socket_ID: socketRef.current?.id || "Pendiente...",
        Micrófono: isMicrophoneOn ? "✅ ON" : "❌ OFF",
        Cámara: isCameraOn ? "✅ ON" : "❌ OFF",
        Pantalla: isScreenSharing ? "✅ ON" : "❌ OFF",
      },
      ...participants.map((p) => ({
        Rol: "REMOTO",
        Nombre: p.name,
        Socket_ID: p.id,
        Micrófono: p.micOn ? "✅ ON" : "❌ OFF",
        Cámara: p.camOn ? "✅ ON" : "❌ OFF",
        Pantalla: p.isScreenSharing ? "✅ ON" : "❌ OFF",
      })),
    ];

    console.table(tableData);

    // También imprimimos el conteo real de streams de video que WebRTC está recibiendo
    console.debug(
      "[Debug] Streams remotos activos en memoria:",
      remoteStreams.length,
    );
    console.debug(
      "Streams recibidos:",
      remoteStreams.map((s) => `${s.type} de ${s.id}`),
    );

    console.groupEnd();
  }, [
    participants,
    isMicrophoneOn,
    isCameraOn,
    isScreenSharing,
    remoteStreams,
    profile,
    socketRef,
  ]);

  // ── 5. CLEANUP & LEAVE HANDLERS ──

  const stopAllLocalHardware = useCallback(() => {
    console.info("[Hardware] Releasing local hardware memory...");
    localStreamRef.current?.getTracks().forEach((t) => {
      t.stop();
      t.enabled = false;
    });
    screenStreamRef.current?.getTracks().forEach((t) => {
      t.stop();
      t.enabled = false;
    });

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;

    setMyStream(null);
    setScreenStream(null);
  }, []);

  useEffect(() => {
    return () => {
      console.info(
        "[Room] Unmounting component, triggering hardware failsafe.",
      );
      stopAllLocalHardware();
    };
  }, [stopAllLocalHardware]);

  const handleLeaveOnly = () => {
    stopAllLocalHardware();
    cleanup();
    navigate("/dashboard");
  };

  const handleEndRoomForAll = () => {
    if (!roomId) return;
    setIsProcessing(true);

    try {
      socketRef.current?.emit("end-room", { roomId });
      stopAllLocalHardware();
      cleanup();
      navigate("/dashboard");
    } catch (error) {
      console.error("[Room] Error ending room:", error);
      setIsProcessing(false);
    }
  };

  // ── 6. RENDER ──

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212]">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-8 w-8 animate-spin text-sky-500"
            aria-hidden="true"
          />
          <p className="text-sm text-zinc-400">
            Conectando al entorno de estudio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#121212] text-white overflow-hidden">
      {permissionError && (
        <PermissionAlert
          error={permissionError}
          onClose={() => setPermissionError(null)}
        />
      )}

      <section className="flex flex-col lg:flex-row flex-1 p-3 sm:p-4 gap-4 overflow-hidden h-[calc(100vh-80px)] transition-all duration-300">
        {/* MAINSTAGE (ÁREA DE PROYECTOS / PANTALLA COMPARTIDA) */}
        {/* En desktop siempre está visible en la izquierda. En mobile se muestra arriba solo si hay una transmisión activa o un usuario fijado */}
        <div
          className={`transition-all duration-300 ${
            activeScreenStream || isScreenSharing || pinnedUserId
              ? "flex h-[32vh] sm:h-[38vh] lg:h-auto lg:flex-1"
              : "hidden lg:flex lg:flex-1"
          }`}
        >
          <MainStage
            isScreenSharing={isScreenSharing}
            isPresenterMode={isPresenterMode}
            screenVideoRef={screenVideoRef}
            remoteStreams={remoteStreams}
            activeScreenStream={activeScreenStream}
            myStream={myStream}
            pinnedUserId={pinnedUserId}
          />
        </div>

        {/* PANEL LATERAL / INFERIOR (PARTICIPANTES Y CHAT) */}
        <aside
          className={`flex flex-col gap-3 sm:gap-4 transition-all duration-300 flex-1 lg:flex-none ${
            isPresenterMode ? "w-full lg:w-70 xl:w-[320px]" : "w-full lg:w-95"
          }`}
        >
          {/* REJILLA DE PARTICIPANTES */}
          {/* En desktop (lg:flex-none) solo toma el espacio estrictamente necesario para los videos. En mobile (flex-1) ocupa todo si el chat está cerrado */}
          <div
            className={`flex-col overflow-hidden min-h-0 ${
              isChatOpen
                ? "hidden lg:flex lg:flex-none lg:shrink"
                : "flex flex-1 lg:flex-none lg:shrink"
            }`}
          >
            <ParticipantsGrid
              profile={profile}
              isPresenterMode={isPresenterMode}
              isCameraOn={isCameraOn}
              isMicrophoneOn={isMicrophoneOn}
              localVideoRef={localVideoRef}
              participants={participants}
              remoteStreams={cameraStreamsOnly}
              pinnedUserId={pinnedUserId}
              onPinUser={(id) =>
                setPinnedUserId((prev) => (prev === id ? null : id))
              }
            />
          </div>

          {/* PANEL DE CHAT */}
          {/* Al tener flex-1, absorberá de forma automática TODO el espacio disponible hasta llegar a la barra de controles */}
          <div
            className={`flex-col flex-1 overflow-hidden min-h-0 transition-all duration-300 ${
              isChatOpen ? "flex" : "hidden lg:flex"
            }`}
          >
            <ChatPanel roomId={roomId ?? ""} profile={profile} />
          </div>
        </aside>
      </section>
      <ControlsBar
        roomId={roomId ?? ""}
        isOwner={isOwner}
        isCameraOn={isCameraOn}
        toggleCamera={toggleCamera}
        isMicrophoneOn={isMicrophoneOn}
        toggleMicrophone={toggleMicrophone}
        isScreenSharing={isScreenSharing}
        toggleScreenShare={toggleScreenShare}
        totalParticipants={participants.length + 1}
        onLeaveClick={() => setShowLeaveModal(true)}
        // PASAMOS LAS NUEVAS PROPIEDADES:
        isChatOpen={isChatOpen}
        toggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      <LeaveModal
        isOpen={showLeaveModal}
        isOwner={isOwner}
        isProcessing={isProcessing}
        onClose={() => setShowLeaveModal(false)}
        onLeave={handleLeaveOnly}
        onEndForAll={handleEndRoomForAll}
      />
    </div>
  );
}
