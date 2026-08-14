import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { tokenStore } from "@/lib/token-store";
import type { AuthUser, LoginInput, RegisterInput, UserRole } from "@/types/auth";
import { UnauthorizedError } from "@/types/api";

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  /** true while restoring session on mount */
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  /** Check if the current user has one of the allowed roles */
  can: (roles: UserRole[]) => boolean;
  login: (data: LoginInput) => Promise<AuthUser>;
  register: (data: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const bootstrapped = useRef(false);

  // ── Session restore on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    async function restore() {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }
      try {
        const tokens = await authApi.refresh(refreshToken);
        tokenStore.set(tokens.accessToken, tokens.refreshToken);
        const { user: me } = await authApi.me();
        setUser(me);
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          tokenStore.clear();
        }
      } finally {
        setIsLoading(false);
      }
    }

    restore();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = useCallback(async (data: LoginInput) => {
    const res = await authApi.login(data);
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────────
  const register = useCallback(async (data: RegisterInput) => {
    const res = await authApi.register(data);
    tokenStore.set(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    // Clear all cached server data
    queryClient.clear();
    // Disconnect socket (handled by SocketProvider watching isAuthenticated)
  }, [queryClient]);

  // ── Role helpers ─────────────────────────────────────────────────────────────
  const can = useCallback(
    (roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        role: user?.role ?? null,
        can,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
