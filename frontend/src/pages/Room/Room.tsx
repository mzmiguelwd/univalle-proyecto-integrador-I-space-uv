import { useState, useEffect, useRef, useMemo } from "react";
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

// MAIN COMPONENT

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // GLOBAL STATES
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  // MODAL STATES
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // LOCAL MEDIA STATES
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // UI CONTROLS STATES
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);

  // HARDWARE REFS
  // Using refs to keep track of individual tracks without triggering unnecessary re-renders
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  //  1. INITIALIZATION: LOAD PROFILE & ROOM DATA
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

  //  2. WEBRTC HOOK INTEGRATION
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
    currentUserPayload,
    () => navigate("/dashboard"), // Callback when host ends the room
  );

  // 3. DERIVED MEDIA STATES
  const activeScreenStream = useMemo(() => {
    return remoteStreams.find((s: RemoteStream) => s.type === "screen") ?? null;
  }, [remoteStreams]);

  const cameraStreamsOnly = useMemo(() => {
    return remoteStreams.filter((s: RemoteStream) => s.type === "camera");
  }, [remoteStreams]);

  const isPresenterMode = isScreenSharing || Boolean(activeScreenStream);

  //  4. HARDWARE CONTROL HANDLERS (Mutex & Sync)

  const toggleMicrophone = async () => {
    const currentAudioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    const currentVideoTracks = localStreamRef.current?.getVideoTracks() ?? [];

    if (isMicrophoneOn) {
      // Turn off mic
      currentAudioTracks.forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      const nextStream =
        currentVideoTracks.length > 0
          ? new MediaStream([...currentVideoTracks])
          : null;

      localStreamRef.current = nextStream;
      setMyStream(nextStream);
      setIsMicrophoneOn(false);

      console.info("[Hardware] Microphone muted.");
      emitMediaState(false, isCameraOn);
      updatePeerTracksCallback?.();
    } else {
      // Turn on mic
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
        setIsMicrophoneOn(true);

        console.info("[Hardware] Microphone enabled.");
        emitMediaState(true, isCameraOn);
        updatePeerTracksCallback?.();
      } catch (err) {
        console.error("[Hardware] Error accessing microphone:", err);
        setPermissionError(
          "Permiso de micrófono denegado. Por favor, habilítalo en tu navegador.",
        );
      }
    }
  };

  const toggleCamera = async () => {
    const currentAudioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    const currentVideoTracks = localStreamRef.current?.getVideoTracks() ?? [];

    if (isCameraOn) {
      // Turn off camera
      currentVideoTracks.forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      socketRef.current?.emit("camera-stopped", { roomId }); // Notify others immediately

      const nextStream =
        currentAudioTracks.length > 0
          ? new MediaStream([...currentAudioTracks])
          : null;

      localStreamRef.current = nextStream;
      setMyStream(nextStream);
      setIsCameraOn(false);

      if (localVideoRef.current) localVideoRef.current.srcObject = nextStream;

      console.info("[Hardware] Camera disabled.");
      emitMediaState(isMicrophoneOn, false);
      updatePeerTracksCallback?.();
    } else {
      // Turn on camera
      try {
        setPermissionError(null);
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newVideoTracks = videoStream.getVideoTracks();
        const newStream = new MediaStream([
          ...currentAudioTracks,
          ...newVideoTracks,
        ]);

        localStreamRef.current = newStream;
        setMyStream(newStream);

        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
        setIsCameraOn(true);

        console.info("[Hardware] Camera enabled.");
        emitMediaState(isMicrophoneOn, true);
        updatePeerTracksCallback?.();
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
      // Stop sharing
      screenStream?.getTracks().forEach((track) => track.stop());
      socketRef.current?.emit("screen-share-stopped", { roomId });

      setScreenStream(null);
      setIsScreenSharing(false);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;

      console.info("[Hardware] Screen sharing stopped manually.");
    } else {
      // Start sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        setScreenStream(stream);
        setIsScreenSharing(true);
        socketRef.current?.emit("screen-share-started", { roomId });

        setTimeout(() => {
          if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
        }, 100);

        // Listen for the native browser "Stop sharing" button
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

  // 5. CLEANUP & LEAVE HANDLERS

  const stopAllLocalHardware = () => {
    myStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setMyStream(null);
    setScreenStream(null);
  };

  useEffect(() => {
    // Failsafe cleanup when component unmounts unexpectedly
    return () => stopAllLocalHardware();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLeaveOnly = () => {
    stopAllLocalHardware();
    cleanup(); // Disconnects Socket and PeerJS
    navigate("/dashboard");
  };

  const handleEndRoomForAll = () => {
    if (!roomId) return;
    setIsProcessing(true);

    try {
      // Broadcast end-room event. The room stays alive in Firebase for future use.
      socketRef.current?.emit("end-room", { roomId });

      stopAllLocalHardware();
      cleanup();
      navigate("/dashboard");
    } catch (error) {
      console.error("[Room] Error ending room for all:", error);
      setIsProcessing(false);
    }
  };

  //  6. RENDER

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

      <section className="flex flex-1 p-4 gap-4 overflow-hidden h-[calc(100vh-80px)] transition-all duration-300">
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
            remoteStreams={cameraStreamsOnly}
            remoteTracksUpdate={0} // Passed from hook if needed for deep re-renders
            pinnedUserId={pinnedUserId}
            onPinUser={(id) =>
              setPinnedUserId((prev) => (prev === id ? null : id))
            }
          />
          <ChatPanel roomId={roomId ?? ""} profile={profile} />
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
        onLeave={handleLeaveOnly}
        onEndForAll={handleEndRoomForAll}
      />
    </div>
  );
}
