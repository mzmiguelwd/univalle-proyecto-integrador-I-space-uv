import { useEffect, useState } from "react";

import { auth } from "../../config/firebase";
import { getUserProfile, type UserProfile } from "../../config/auth";
import NavigationSidebar from "./NavigationSidebar.tsx";
import { StudySession } from "./Home/StudySession.tsx";

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

  return (
    <main className="min-h-screen bg-[#0f0f10] text-white flex w-full">
      <NavigationSidebar activePage="Inicio" profile={profile} />
      <StudySession profile={profile} />
    </main>
  );
}
