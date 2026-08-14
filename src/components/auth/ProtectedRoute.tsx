import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Roles that may access this route. Omit = any authenticated user. */
  allowedRoles?: UserRole[];
}

/**
 * Redirect unauthenticated users to /login.
 * Show a "Access Denied" message for authenticated users with wrong role.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            Restoring session…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Access Denied
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Insufficient role</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your role <span className="font-semibold text-foreground">{role}</span> does not have
            access to this area. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
