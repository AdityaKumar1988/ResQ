import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types/auth";
import { ArrowRight, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Roles that may access this route. Omit = any authenticated user. */
  allowedRoles?: UserRole[];
}

const ROLE_HOME: Record<UserRole, string> = {
  citizen: "/citizen",
  driver: "/driver",
  dispatcher: "/dispatch",
  admin: "/admin",
};

/**
 * Validates authentication initialization and enforces strict role-based access control.
 * Prevents flashing protected content before session validation is complete.
 * Prevents navigating to unauthorized portals via browser history or manual URLs.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Phase 1: Authentication Initialization — show clean loading screen, never flash portal
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

  // Phase 2: Unauthenticated — render nothing while redirecting to /login
  if (!isAuthenticated || !user) {
    return null;
  }

  // Phase 3: Role Authorization — verify role permissions
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const homeUrl = ROLE_HOME[role] ?? "/login";

    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-xl border border-destructive/30 bg-surface p-6 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/15 text-destructive mb-3">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-destructive font-semibold">
            Access Denied · Role Isolation
          </div>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            Unauthorized Area
          </h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Your account role (
            <span className="font-semibold text-foreground capitalize">{role}</span>) does not have
            permission to access this portal.
          </p>
          <div className="mt-5 flex justify-center">
            <button
              onClick={() => navigate({ to: homeUrl, replace: true })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Return to Your Portal <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 4: Authorized — render portal content
  return <>{children}</>;
}
