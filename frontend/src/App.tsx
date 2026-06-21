import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useAuthSession } from "./hooks/useAuthSession.ts";
import ProtectedRoute from "./pages/Auth/ProtectedRoute.tsx";
import PublicRoute from "./pages/Auth/PublicRoute.tsx";

import Landing from "./pages/Landing/Landing.tsx";
import Login from "./pages/Auth/Login.tsx";
import SetupProfile from "./pages/Auth/SetupProfile.tsx";
import Register from "./pages/Auth/Register.tsx";
import ForgotPassword from "./pages/Auth/ForgotPassword.tsx";
import Dashboard from "./pages/Dashboard/Dashboard.tsx";
import AuthLoadingScreen from "./pages/Auth/AuthLoadingScreen.tsx";
import Profile from "./pages/Dashboard/Profile/Profile.tsx";
import Room from "./pages/Room/Room.tsx";
import CreateRoom from "./pages/Dashboard/Home/CreateRoom.tsx";

export default function App() {
  const { user, hasUsername, isLoading, setHasUsername } = useAuthSession();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Common authentication conditions for cleaner routing
  const isFullyAuthenticated = Boolean(user) && hasUsername;
  const protectedRedirect = user ? "/setup-profile" : "/login";

  // Determine default route based on authentication state
  const getDefaultRoute = () => {
    if (!user) return "/login";
    if (!hasUsername) return "/setup-profile";
    return "/dashboard";
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicRoute user={user} hasUsername={hasUsername}>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute user={user} hasUsername={hasUsername}>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute user={user} hasUsername={hasUsername}>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute user={user} hasUsername={hasUsername}>
              <ForgotPassword />
            </PublicRoute>
          }
        />

        {/* Onboarding Route */}
        <Route
          path="/setup-profile"
          element={
            <ProtectedRoute
              isAllowed={Boolean(user) && !hasUsername}
              redirectTo={user ? "/dashboard" : "/login"}
            >
              <SetupProfile onComplete={() => setHasUsername(true)} />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              isAllowed={isFullyAuthenticated}
              redirectTo={protectedRedirect}
            >
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              isAllowed={isFullyAuthenticated}
              redirectTo={protectedRedirect}
            >
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-room"
          element={
            <ProtectedRoute
              isAllowed={isFullyAuthenticated}
              redirectTo={protectedRedirect}
            >
              <CreateRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute
              isAllowed={isFullyAuthenticated}
              redirectTo={protectedRedirect}
            >
              <Room />
            </ProtectedRoute>
          }
        />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
