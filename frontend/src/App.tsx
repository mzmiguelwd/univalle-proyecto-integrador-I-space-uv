import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "./config/firebase.ts";

import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import Dashboard from "./pages/Dashboard/Dashboard.tsx";
import SetupProfile from "./pages/SetupProfile.tsx";
import LandingPage from "./pages/Landing/Landing.tsx";
import AuthLoadingScreen from "./components/auth/AuthLoadingScreen.tsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.tsx";
import Profile from "./pages/Dashboard/Profile/Profile.tsx";
import Room from "./pages/Room/Room.tsx";
import CreateRoom from "./pages/Dashboard/Home/CreateRoom.tsx";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));

          if (userDoc.exists() && userDoc.data().username) {
            setHasUsername(true);
          } else {
            setHasUsername(false);
          }
        } catch (error) {
          console.error("Error al verificar el nombre de usuario:", error);
          setHasUsername(false);
        }

        setUser(currentUser);
      } else {
        setUser(null);
        setHasUsername(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Raíz (Landing Page) */}
        <Route
          path="/"
          element={
            !user ? (
              <LandingPage />
            ) : (
              <Navigate
                to={hasUsername ? "/dashboard" : "/setup-profile"}
                replace
              />
            )
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              isAllowed={Boolean(user) && hasUsername}
              redirectTo={!user ? "/login" : "/setup-profile"}
            >
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Rutas Públicas */}
        <Route
          path="/login"
          element={
            !user ? (
              <Login />
            ) : (
              <Navigate
                to={hasUsername ? "/dashboard" : "/setup-profile"}
                replace
              />
            )
          }
        />
        <Route
          path="/register"
          element={
            !user ? (
              <Register />
            ) : (
              <Navigate
                to={hasUsername ? "/dashboard" : "/setup-profile"}
                replace
              />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            !user ? (
              <ForgotPassword />
            ) : (
              <Navigate
                to={hasUsername ? "/dashboard" : "/setup-profile"}
                replace
              />
            )
          }
        />

        {/* Ruta de Onboarding (Solo para usuarios logueados SIN username) */}
        <Route
          path="/setup-profile"
          element={
            <ProtectedRoute
              isAllowed={Boolean(user) && !hasUsername}
              redirectTo={!user ? "/login" : "/dashboard"}
            >
              <SetupProfile onComplete={() => setHasUsername(true)} />
            </ProtectedRoute>
          }
        />

        {/* Ruta Protegida Definitiva */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              isAllowed={Boolean(user) && hasUsername}
              redirectTo={!user ? "/login" : "/setup-profile"}
            >
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-room"
          element={
            <ProtectedRoute
              isAllowed={Boolean(user) && hasUsername}
              redirectTo={!user ? "/login" : "/setup-profile"}
            >
              <CreateRoom />
            </ProtectedRoute>
          }
        />

        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute
              isAllowed={Boolean(user) && hasUsername}
              redirectTo={!user ? "/login" : "/setup-profile"}
            >
              <Room />
            </ProtectedRoute>
          }
        />

        {/* Redirección por defecto */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                user
                  ? hasUsername
                    ? "/dashboard"
                    : "/setup-profile"
                  : "/login"
              }
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
