import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner, ErrorState } from "./ui";
import type { UserRole } from "../types";

/**
 * Guards authenticated routes (and optionally a set of roles). Unauthenticated visitors are
 * redirected to /login with the intended destination preserved in router state.
 */
export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { authenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
    return <ErrorState message="You do not have access to this section." />;
  }

  return <>{children}</>;
}