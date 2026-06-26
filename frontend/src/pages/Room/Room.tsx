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
import ParticipantsGrid from "./ParticipantsGrid.tsx";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // ESTADOS DE DATOS Y CARGA
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const isProcessing = false;

  // ESTADOS DE TRANSMISIÓN LOCAL
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // ESTADOS DE UI DE CONTROLES
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);

  // REFERENCIAS PARA HARDWARE LOCAL
  const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // 1. CARGA DE PERFIL Y SALA
  useEffect(() => {
    async function loadRoomAndProfile() {
      try {
        if (auth.currentUser) {
          const p = await getUserProfile(auth.currentUser.uid);
          setProfile(p);
        }
        if (roomId) {
          const roomDoc = await getDoc(doc(db, "rooms", roomId));
          if (roomDoc.exists()) {
            const data = roomDoc.data();
            setIsOwner(data.ownerId === auth.currentUser?.uid);
          }
        }
      } catch (err) {
        console.error("Error al cargar la sala:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRoomAndProfile();
  }, [roomId]);

  // 2. CONSTRUCCIÓN REACTIVA DEL MEDIASTREAM LOCAL (Para disparar useWebRTC)
  useEffect(() => {
    const tracks: MediaStreamTrack[] = [];
    if (isMicrophoneOn && localAudioTrackRef.current) {
      tracks.push(localAudioTrackRef.current);
    }
    if (isCameraOn && localVideoTrackRef.current) {
      tracks.push(localVideoTrackRef.current);
    }

    if (tracks.length > 0) {
      setMyStream(new MediaStream(tracks));
    } else {
      setMyStream(null);
    }
  }, [isMicrophoneOn, isCameraOn]);

  // Asignar el stream de cámara local a la etiqueta de video respectiva
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  // Asignar el stream de pantalla local a la etiqueta del MainStage
  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Limpieza de hardware al desmontar el componente
  useEffect(() => {
    return () => {
      if (localAudioTrackRef.current) localAudioTrackRef.current.stop();
      if (localVideoTrackRef.current) localVideoTrackRef.current.stop();
      if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    };
  }, [screenStream]);

  // 3. INTEGRACIÓN CON EL HOOK WEBRTC NATIVO
  const { remoteStreams, participants } = useWebRTC(
    roomId ?? "",
    myStream,
    screenStream,
    {
      uid: auth.currentUser?.uid ?? "",
      name: profile?.name ?? "Anónimo",
      avatar: profile?.avatar ?? null,
    },
    () => navigate("/dashboard"),
  );

  // 4. MANEJO COMPLEMENTARIO DE FILTROS Y MODOS
  const activeScreenStream = useMemo(() => {
    return remoteStreams.find((s) => s.type === "screen") ?? null;
  }, [remoteStreams]);

  const cameraStreamsOnly = useMemo(() => {
    return remoteStreams.filter((s) => s.type === "camera");
  }, [remoteStreams]);

  const isPresenterMode = isScreenSharing || !!activeScreenStream;

  // 5. MANEJADORES DE DISPOSITIVOS MUTEX (A nivel de pista)
  const toggleMicrophone = async () => {
    if (isMicrophoneOn) {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
      setIsMicrophoneOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          localAudioTrackRef.current = audioTrack;
          setIsMicrophoneOn(true);
        }
      } catch (err) {
        console.error("Error al acceder al micrófono:", err);
      }
    }
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current = null;
      }
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          localVideoTrackRef.current = videoTrack;
          setIsCameraOn(true);
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenStream(stream);
        setIsScreenSharing(true);

        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
        };
      } catch (err) {
        console.error("Error al compartir pantalla:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A1A1A]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#121212] text-white overflow-hidden">
      <section className="flex flex-1 p-4 gap-4 overflow-hidden h-[calc(100vh-80px)]">
        <MainStage
          isScreenSharing={isScreenSharing}
          screenVideoRef={screenVideoRef}
          remoteStreams={remoteStreams}
          activeScreenStream={activeScreenStream}
          myStream={myStream}
          pinnedUserId={pinnedUserId}
        />

        <aside
          className={`flex flex-col gap-4 transition-all duration-300 ${isPresenterMode ? "w-full lg:w-70 xl:w-[320px]" : "w-full lg:w-95"}`}
        >
          <ParticipantsGrid
            profile={profile ?? {}}
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
          <ChatPanel
            roomId={roomId ?? ""}
            profile={profile ?? { name: "Anónimo" }}
          />
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
      />

      <LeaveModal
        isOpen={showLeaveModal}
        isOwner={isOwner}
        isProcessing={isProcessing}
        onClose={() => setShowLeaveModal(false)}
        onLeave={function (): void {
          throw new Error("Function not implemented.");
        }}
        onEndForAll={function (): void {
          throw new Error("Function not implemented.");
        }}
      />
    </div>
  );
}
