import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * Wrapper for private or restricted routes (Dashboard, Settings, etc.).
 * Redirects unauthorized users to a specified fallback route.
 */
interface ProtectedRouteProps {
  isAllowed: boolean;
  redirectTo: string;
  children: ReactNode;
}

export default function ProtectedRoute({
  isAllowed,
  redirectTo,
  children,
}: Readonly<ProtectedRouteProps>) {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
