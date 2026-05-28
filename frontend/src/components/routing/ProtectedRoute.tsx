import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
  isAllowed: boolean;
  redirectTo: string;
  children: ReactElement;
};

export function ProtectedRoute({
  isAllowed,
  redirectTo,
  children,
}: ProtectedRouteProps) {
  return isAllowed ? children : <Navigate to={redirectTo} replace />;
}
