import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types/auth";

interface RoleGuardProps {
  children: ReactNode;
  roles: UserRole[];
  /** What to render if the user doesn't have the required role. Default: null */
  fallback?: ReactNode;
}

/**
 * Inline role guard for hiding/showing UI elements.
 * Does NOT redirect — use ProtectedRoute for route-level protection.
 *
 * @example
 * <RoleGuard roles={["dispatcher", "admin"]}>
 *   <AssignDriverButton />
 * </RoleGuard>
 */
export function RoleGuard({ children, roles, fallback = null }: RoleGuardProps) {
  const { can } = useAuth();
  return can(roles) ? <>{children}</> : <>{fallback}</>;
}
