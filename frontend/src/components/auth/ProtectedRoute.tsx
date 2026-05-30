import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  isAllowed: boolean;
  redirectTo: string;
  children: JSX.Element;
}

export default function ProtectedRoute({
  isAllowed,
  redirectTo,
  children,
}: ProtectedRouteProps) {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
