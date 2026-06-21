import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { getUserProfile, type UserProfile } from "../../config/auth";
import { useWebRTC } from "../../hooks/useWebRTC";

import MainStage from "./../Room/MainStage.tsx";
import ControlsBar from "./../Room/ControlsBar.tsx";
import ChatPanel from "./../Room/ChatPanel.tsx";
import LeaveModal from "./../Room/LeaveModal.tsx";
import PermissionAlert from "./../Room/PermissionAlert.tsx";
import ParticipantsGrid from "./../Room/ParticipantsGrid.tsx";

export default function Room() {
  const { roomId } = useParams();
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

  //
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const data = await getUserProfile(currentUser.uid);
      if (data) setProfile(data);
    };
    loadUser();
  }, []);

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

  const currentUser = useMemo(
    () => ({
      uid: profile?.uid || "",
      name: profile?.name || "Usuario",
      avatar: profile?.avatar || "null",
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
    cleanupPeerConnections,
    emitMediaState,
    updatePeerTracksCallback,
  } = useWebRTC(roomId!, myStream, screenStream, currentUser, handleRoomEnded);

  const screenStreams = remoteStreams.filter((stream) => stream.type === "screen");
  const cameraStreams = remoteStreams.filter((stream) => stream.type === "camera");

  const activeScreenStream =
    screenStreams.length > 0 ? screenStreams[screenStreams.length - 1] : null;

  const isPresenterMode = isScreenSharing || Boolean(activeScreenStream);

  // MEDIA CONTROL HANDLERS
  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        setPermissionError(null);

        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        const hasAudio = localStreamRef.current?.getAudioTracks().length ?? 0;
        let newStream: MediaStream;

        if (hasAudio > 0 && localStreamRef.current) {
          const audioTracks = localStreamRef.current.getAudioTracks();
          const videoTracks = videoStream.getVideoTracks();
          newStream = new MediaStream([...audioTracks, ...videoTracks]);
          console.info("toggleCamera: nuevo stream con audio + video", {
            audioCount: audioTracks.length,
            videoCount: videoTracks.length,
          });
        } else {
          newStream = videoStream;
          console.info("toggleCamera: nuevo stream solo video");
        }

        localStreamRef.current = newStream;
        setMyStream(newStream);

        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;

        setIsCameraOn(true);
        console.info("toggleCamera: activada");
        emitMediaState(isMicrophoneOn, true);
        updatePeerTracksCallback?.();
      } catch (error) {
        console.error("Error al acceder a la cámara:", error);
        setPermissionError(
          "Permiso de cámara denegado. Por favor, habilítalo en la configuración de tu navegador.",
        );
      }
    } else {
<<<<<<< HEAD
      myStream?.getVideoTracks().forEach((track) => track.stop());

      socketRef.current?.emit("camera-stopped", { roomId });

      setIsCameraOn(false);
=======
      localStreamRef.current?.getVideoTracks().forEach((track) => {
        track.stop();
      });
>>>>>>> main

      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const nextStream = audioTracks.length > 0 ? new MediaStream([...audioTracks]) : null;

      localStreamRef.current = nextStream;
      setIsCameraOn(false);
      setMyStream(nextStream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = nextStream;
      }

      console.info("toggleCamera: desactivada", {
        audioCount: audioTracks.length,
      });
      emitMediaState(isMicrophoneOn, false);
      updatePeerTracksCallback?.();
    }
  };

  const toggleMicrophone = async () => {
    if (!isMicrophoneOn) {
      const currentAudioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const currentVideoTracks = localStreamRef.current?.getVideoTracks() ?? [];

      if (currentAudioTracks.length === 0) {
        try {
          setPermissionError(null);
          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });

          const newAudioTracks = audioStream.getAudioTracks();
          const newStream = new MediaStream([...currentVideoTracks, ...newAudioTracks]);

          localStreamRef.current = newStream;
          setMyStream(newStream);
          if (localVideoRef.current) localVideoRef.current.srcObject = newStream;

          setIsMicrophoneOn(true);
          console.info("toggleMicrophone: activado (new stream)", {
            audioCount: newAudioTracks.length,
            videoCount: currentVideoTracks.length,
          });
          emitMediaState(true, isCameraOn);
          updatePeerTracksCallback?.();
        } catch (error) {
          console.error("Error al acceder al micrófono:", error);
          setPermissionError(
            "Permiso de micrófono denegado. Por favor, habilítalo en tu navegador.",
          );
        }
      } else {
        // Ya hay track de audio, solo habilitar
        currentAudioTracks.forEach((track) => {
          track.enabled = true;
        });

        const nextStream = new MediaStream([...currentAudioTracks, ...currentVideoTracks]);
        localStreamRef.current = nextStream;
        setMyStream(nextStream);

        setIsMicrophoneOn(true);
        console.info("toggleMicrophone: activado (existing track)", {
          audioCount: currentAudioTracks.length,
        });
        emitMediaState(true, isCameraOn);
        updatePeerTracksCallback?.();
      }
    } else {
      const currentAudioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const currentVideoTracks = localStreamRef.current?.getVideoTracks() ?? [];

      currentAudioTracks.forEach((track) => {
        track.enabled = false;
      });

      const nextStream = new MediaStream([...currentAudioTracks, ...currentVideoTracks]);
      localStreamRef.current = nextStream;
      setMyStream(nextStream);

      setIsMicrophoneOn(false);
      console.info("toggleMicrophone: desactivado");
      emitMediaState(false, isCameraOn);
      updatePeerTracksCallback?.();
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
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

          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
          }
        });
      } catch (error) {
        console.error("Error al compartir pantalla:", error);
      }
    } else {
      screenStream?.getTracks().forEach((track) => track.stop());
      socketRef.current?.emit("screen-share-stopped", { roomId });
      setScreenStream(null);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      setIsScreenSharing(false);
    }
  };

  //
  const stopAllStreams = () => {
    myStream?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    setMyStream(null);
    setScreenStream(null);
  };

  useEffect(() => {
    return () => stopAllStreams();
  }, []);

  const handleLeaveOnly = () => {
    stopAllStreams();
    cleanupPeerConnections();
    navigate("/dashboard");
  };

  const handleEndRoomForAll = async () => {
    if (!roomId) return;
    setIsProcessing(true);

    try {
      socketRef.current?.emit("end-room", { roomId });

      stopAllStreams();
      cleanupPeerConnections();

      navigate("/dashboard");
    } catch (error) {
      console.error("Error al finalizar la llamada:", error);
      setIsProcessing(false);
    }
  };

  // RENDER
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
      <PermissionAlert
        error={permissionError}
        onClose={() => setPermissionError(null)}
      />

      <div
        className={`flex-1 flex overflow-hidden p-4 gap-4 transition-all duration-300 ${
          isPresenterMode ? "flex-col lg:flex-row" : "flex-col lg:flex-row"
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

        <div
          className={`flex flex-col gap-4 transition-all duration-300 ${
            isPresenterMode
              ? "w-full lg:w-[280px] xl:w-[320px]"
              : "w-full lg:w-[380px]"
          }`}
        >
          <ParticipantsGrid
            profile={profile}
            isPresenterMode={isPresenterMode}
            isCameraOn={isCameraOn}
            isMicrophoneOn={isMicrophoneOn}
            localVideoRef={localVideoRef}
            participants={participants}
<<<<<<< HEAD
            remoteStreams={cameraStreams}
=======
            remoteStreams={remoteStreams}
            remoteTracksUpdate={remoteTracksUpdate}
>>>>>>> main
            pinnedUserId={pinnedUserId}
            onPinUser={(id) =>
              setPinnedUserId((prev) => (prev === id ? null : id))
            }
          />
          <ChatPanel roomId={roomId!} profile={profile} />
        </div>
      </div>

      <ControlsBar
        roomId={roomId!}
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
    </div>
  );
}
