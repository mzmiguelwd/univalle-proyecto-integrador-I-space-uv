import { useEffect, useState } from "react";

import NavigationSidebar from "../components/layout/NavigationSidebar";
import { StudySessionDashboardSection } from "../components/dashboard/StudySessionDashboardSection";

import { auth } from "../config/firebase";
import {
  getUserProfile,
  type UserProfile,
} from "../config/auth";

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
    <main className="min-h-screen bg-[#0f0f10] text-white">
      <div className="flex min-h-screen w-full">
        <NavigationSidebar
          activePage="Inicio"
          profile={profile}
        />

        <StudySessionDashboardSection
          profile={profile}
        />
      </div>
    </main>
  );
}