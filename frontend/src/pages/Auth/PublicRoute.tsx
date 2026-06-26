import { Navigate } from "react-router-dom";
import type { User } from "firebase/auth";

/**
 * Wrapper for public routes (Login, Register, etc.).
 * Redirects authenticated users to the dashboard or profile setup.
 */
interface PublicRouteProps {
  user: User | null;
  hasUsername: boolean;
  children: React.ReactNode;
}

export default function PublicRoute({
  user,
  hasUsername,
  children,
}: Readonly<PublicRouteProps>) {
  if (user) {
    return (
      <Navigate to={hasUsername ? "/dashboard" : "/setup-profile"} replace />
    );
  }
  return <>{children}</>;
}
