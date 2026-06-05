import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "./config/firebase";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import SetupProfile from "./pages/SetupProfile";
import LandingPage from "./pages/LandingPage";
import AuthLoadingScreen from "./components/auth/AuthLoadingScreen";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Profile from "./pages/Profile";
import OldDashboard from "./pages/ProvisionalDashboard";

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
              <Dashboard/>
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
        {/* Ruta Protegida Definitiva */}
        <Route
          path="/dashboard-old"
          element={
            <ProtectedRoute
              isAllowed={Boolean(user) && hasUsername}
              redirectTo={!user ? "/login" : "/setup-profile"}
            >
              <OldDashboard user={user as User} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
