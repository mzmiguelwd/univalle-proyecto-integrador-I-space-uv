import { useEffect, useState } from "react";

import { auth } from "../../config/firebase.ts";
import { getUserProfile, type UserProfile } from "../../config/auth.ts";
import NavigationSidebar from "./NavigationSidebar.tsx";
import { StudySession } from "./Home/StudySession.tsx";

// MAIN COMPONENT

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const data = await getUserProfile(currentUser.uid);
        if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
      }
    };

    loadUser();
  }, []);

  // RENDER

  return (
    <main className="min-h-screen bg-[#0f0f10] text-white flex w-full">
      <NavigationSidebar activePage="Inicio" profile={profile} />
      <StudySession profile={profile} />
    </main>
  );
}
