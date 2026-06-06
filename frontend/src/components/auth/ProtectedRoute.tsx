import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ProtectedRouteProps {
  isAllowed: boolean;
  redirectTo: string;
  children: ReactNode;
}

export default function ProtectedRoute({
  isAllowed,
  redirectTo,
  children,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
