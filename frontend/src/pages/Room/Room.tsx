import { useState, useEffect, useRef, useMemo } from "react";
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

// TYPES

interface RemoteMediaStream {
  id: string;
  stream: MediaStream;
  type: "camera" | "screen";
}

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
  const localStreamRef = useRef<MediaStream | null>(null);

  // INITIALIZATION
  useEffect(() => {
    const initializeRoom = async () => {
      if (!roomId || !auth.currentUser) return;

      try {
        // Load user profile
        const userData = await getUserProfile(auth.currentUser.uid);
        if (userData) setProfile(userData);

        // Verify if the current user is the owner of the room
        const roomRef = doc(db, "rooms", roomId);
        const roomDoc = await getDoc(roomRef);

        if (
          roomDoc.exists() &&
          roomDoc.data().ownerId === auth.currentUser.uid
        ) {
          setIsOwner(true);
        }
      } catch (error: unknown) {
        console.error(
          "Error inicializando la configuración de la sala:",
          error,
        );
      }
    };

    initializeRoom();
  }, [roomId]);

  const currentUser = useMemo(
    () => ({
      uid: profile?.uid ?? "",
      name: profile?.name ?? "Usuario",
      avatar: profile?.avatar ?? "null",
    }),
    [profile],
  );

  const handleRoomEnded = () => navigate("/dashboard");

  // CORE: WEBRTC

  const {
    remoteStreams,
    remoteTracksUpdate,
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

  const typedRemoteStreams = remoteStreams as RemoteMediaStream[];

  const screenStreams = typedRemoteStreams.filter(
    (stream) => stream.type === "screen",
  );

  const activeScreenStream =
    screenStreams.length > 0 ? screenStreams.at(-1) : null;

  const isPresenterMode = isScreenSharing || Boolean(activeScreenStream);

  // MEDIA CONTROL HANDLERS

  const toggleCamera = async () => {
    if (isCameraOn) {
      myStream?.getVideoTracks().forEach((track) => track.stop());
      socketRef.current?.emit("camera-stopped", { roomId });

      const currentAudioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const nextStream =
        currentAudioTracks.length > 0
          ? new MediaStream([...currentAudioTracks])
          : null;

      localStreamRef.current = nextStream;
      setMyStream(nextStream);
      setIsCameraOn(false);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = nextStream;
      }

      console.info("Cámara apagada exitosamente.");
      emitMediaState(isMicrophoneOn, false);
      updatePeerTracksCallback?.();
    } else {
      try {
        setPermissionError(null);
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        const currentAudioTracks =
          localStreamRef.current?.getAudioTracks() ?? [];
        const newVideoTracks = videoStream.getVideoTracks();

        const newStream = new MediaStream([
          ...currentAudioTracks,
          ...newVideoTracks,
        ]);

        localStreamRef.current = newStream;
        setMyStream(newStream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }

        setIsCameraOn(true);
        console.info("Cámara encendida exitosamente.", {
          videoTracks: newVideoTracks.length,
        });

        emitMediaState(isMicrophoneOn, true);
        updatePeerTracksCallback?.();
      } catch (error: unknown) {
        console.error("Error obteniendo acceso al hardware de video:", error);
        setPermissionError(
          "Permiso de cámara denegado. Por favor, habilítalo en la configuración de tu navegador.",
        );
      }
    }
  };

  const toggleMicrophone = async () => {
    const currentAudioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    const currentVideoTracks = localStreamRef.current?.getVideoTracks() ?? [];

    if (isMicrophoneOn) {
      currentAudioTracks.forEach((track) => {
        track.enabled = false;
      });

      const nextStream = new MediaStream([
        ...currentAudioTracks,
        ...currentVideoTracks,
      ]);
      localStreamRef.current = nextStream;
      setMyStream(nextStream);

      setIsMicrophoneOn(false);
      console.info("Micrófono silenciado exitosamente.");

      emitMediaState(false, isCameraOn);
      updatePeerTracksCallback?.();
    } else {
      if (currentAudioTracks.length === 0) {
        try {
          setPermissionError(null);
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          const newAudioTracks = audioStream.getAudioTracks();

          const newStream = new MediaStream([
            ...currentVideoTracks,
            ...newAudioTracks,
          ]);

          localStreamRef.current = newStream;
          setMyStream(newStream);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }

          setIsMicrophoneOn(true);
          console.info("Micrófono encendido exitosamente (Nuevo Stream).");

          emitMediaState(true, isCameraOn);
          updatePeerTracksCallback?.();
        } catch (error: unknown) {
          console.error("Error obteniendo acceso al hardware de audio:", error);
          setPermissionError(
            "Permiso de micrófono denegado. Por favor, habilítalo en la configuración de tu navegador.",
          );
        }
      } else {
        currentAudioTracks.forEach((track) => {
          track.enabled = true;
        });

        const nextStream = new MediaStream([
          ...currentAudioTracks,
          ...currentVideoTracks,
        ]);
        localStreamRef.current = nextStream;
        setMyStream(nextStream);

        setIsMicrophoneOn(true);
        console.info("Micrófono encendido exitosamente (Track existente).");

        emitMediaState(true, isCameraOn);
        updatePeerTracksCallback?.();
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((track) => track.stop());
      socketRef.current?.emit("screen-share-stopped", { roomId });

      setScreenStream(null);
      setIsScreenSharing(false);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      console.info("Compartición de pantalla detenida manualmente.");
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        setIsScreenSharing(true);
        setScreenStream(stream);
        socketRef.current?.emit("screen-share-started", { roomId });

        setTimeout(() => {
          if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
        }, 100);

        const screenTrack = stream.getVideoTracks()[0];

        screenTrack.addEventListener("ended", () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          socketRef.current?.emit("screen-share-stopped", { roomId });
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
          console.info(
            "El usuario ha detenido la compartición de pantalla desde el navegador.",
          );
        });
      } catch (error: unknown) {
        console.error("Error iniciando compartición de pantalla:", error);
      }
    }
  };

  // CLEANUP & LEAVE HANDLERS

  const stopAllStreams = () => {
    myStream?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());
    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    setMyStream(null);
    setScreenStream(null);
    console.info("Todos los streams locales han sido detenidos.");
  };

  useEffect(() => {
    return () => stopAllStreams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLeaveOnly = () => {
    stopAllStreams();
    cleanup();
    navigate("/dashboard");
  };

  const handleEndRoomForAll = async () => {
    if (!roomId) return;
    setIsProcessing(true);

    try {
      socketRef.current?.emit("end-room", { roomId });

      stopAllStreams();
      cleanup();
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Error vaciando la llamada:", error);
      setIsProcessing(false);
    }
  };

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
          activeScreenStream={activeScreenStream}
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
            remoteTracksUpdate={remoteTracksUpdate}
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
