import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import { auth } from "../../config/firebase.ts";
import { getUserProfile, type UserProfile } from "../../config/auth.ts";
import NavigationSidebar from "./NavigationSidebar.tsx";
import StudySession from "./Home/StudySession.tsx";

// MAIN COMPONENT

export default function Dashboard() {
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showRoomCreatedMessage, setShowRoomCreatedMessage] = useState(false);
  const [roomCreatedTitle, setRoomCreatedTitle] = useState("Tu sala");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const data = await getUserProfile(currentUser.uid);
        if (data) {
          setProfile(data);
        }
      } catch (error: unknown) {
        console.error("Error cargando perfil:", error);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const roomCreated = location.state?.roomCreated;
    const title = location.state?.roomTitle;

    if (roomCreated) {
      setShowRoomCreatedMessage(true);
      if (title) {
        setRoomCreatedTitle(title);
      }

      const timer = window.setTimeout(() => {
        setShowRoomCreatedMessage(false);
      }, 4000);

      return () => window.clearTimeout(timer);
    }

    setShowRoomCreatedMessage(false);
  }, [location.state]);

  // RENDER

  return (
    <main className="flex min-h-screen w-full bg-[#0f0f10] text-white pb-16 lg:pb-0">
      {showRoomCreatedMessage && (
        <div className="fixed right-4 top-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-emerald-700/60 bg-emerald-900/90 px-4 py-3 shadow-lg backdrop-blur">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
          <div>
            <p className="text-sm font-semibold text-emerald-100">
              Sala creada correctamente
            </p>
            <p className="text-xs text-emerald-200">
              {roomCreatedTitle} ya está lista en tu dashboard.
            </p>
          </div>
        </div>
      )}
      <NavigationSidebar activePage="Inicio" profile={profile} />
      <StudySession profile={profile} />
    </main>
  );
}
