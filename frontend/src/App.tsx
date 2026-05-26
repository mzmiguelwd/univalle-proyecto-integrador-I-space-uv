import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "./config/firebase.ts";

import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import SetupProfile from "./pages/SetupProfile.tsx";

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
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-medium">
          Autenticando entorno...
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Raíz (Landing Page) */}
        <Route
          path="/"
          element={
            !user ? (
              <Home />
            ) : (
              <Navigate
                to={hasUsername ? "/dashboard" : "/setup-profile"}
                replace
              />
            )
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

        {/* Ruta de Onboarding (Solo para usuarios logueados SIN username) */}
        <Route
          path="/setup-profile"
          element={
            user && !hasUsername ? (
              <SetupProfile onComplete={() => setHasUsername(true)} />
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} replace />
            )
          }
        />

        {/* Ruta Protegida Definitiva */}
        <Route
          path="/dashboard"
          element={
            user && hasUsername ? (
              <Dashboard user={user} />
            ) : (
              <Navigate to={!user ? "/login" : "/setup-profile"} replace />
            )
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
