import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock the auth API
vi.mock("@/lib/api/auth", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
  },
}));

// Mock the token store
vi.mock("@/lib/token-store", () => ({
  tokenStore: {
    get: vi.fn(() => null),
    getRefresh: vi.fn(() => null),
    set: vi.fn(),
    clear: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}));

// Mock socket
vi.mock("@/lib/socket", () => ({
  disconnectSocket: vi.fn(),
}));

import { authApi } from "@/lib/api/auth";
import { tokenStore } from "@/lib/token-store";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const mockLogin = vi.mocked(authApi.login);
const mockRefresh = vi.mocked(authApi.refresh);
const mockMe = vi.mocked(authApi.me);
const mockGetRefresh = vi.mocked(tokenStore.getRefresh);
const mockSet = vi.mocked(tokenStore.set);
const mockClear = vi.mocked(tokenStore.clear);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRefresh.mockReturnValue(null);
  });

  it("starts unauthenticated when no refresh token exists", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("restores session from refresh token", async () => {
    const fakeUser = {
      id: "u-1",
      email: "test@ems.io",
      name: "Test User",
      role: "dispatcher" as const,
      created_at: new Date().toISOString(),
    };

    mockGetRefresh.mockReturnValue("refresh-token-123");
    mockRefresh.mockResolvedValueOnce({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });
    mockMe.mockResolvedValueOnce({ user: fakeUser });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("test@ems.io");
    expect(mockSet).toHaveBeenCalledWith("new-access-token", "new-refresh-token");
  });

  it("login stores tokens and sets user", async () => {
    const fakeResponse = {
      user: {
        id: "u-2",
        email: "driver@ems.io",
        name: "Driver One",
        role: "driver" as const,
        created_at: new Date().toISOString(),
      },
      accessToken: "at-123",
      refreshToken: "rt-456",
    };

    mockLogin.mockResolvedValueOnce(fakeResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: "driver@ems.io", password: "pass" });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe("Driver One");
    expect(result.current.role).toBe("driver");
    expect(mockSet).toHaveBeenCalledWith("at-123", "rt-456");
  });

  it("logout clears everything", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mockClear).toHaveBeenCalled();
  });

  it("preserves authenticated session across navigation without unintended session destruction", async () => {
    const fakeUser = {
      id: "u-dispatcher-1",
      email: "dispatch@ems.local",
      name: "Dana Dispatcher",
      role: "dispatcher" as const,
      created_at: new Date().toISOString(),
    };

    mockGetRefresh.mockReturnValue("valid-refresh-token");
    mockRefresh.mockResolvedValueOnce({
      accessToken: "access-token-1",
      refreshToken: "valid-refresh-token",
    });
    mockMe.mockResolvedValueOnce({ user: fakeUser });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.role).toBe("dispatcher");

    // Simulating user navigating across pages (e.g. visiting landing page /):
    // The session and tokens must NOT be cleared or logged out!
    expect(mockClear).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe("u-dispatcher-1");
  });

  it("can() checks role membership", async () => {
    const fakeResponse = {
      user: {
        id: "u-3",
        email: "admin@ems.io",
        name: "Admin",
        role: "admin" as const,
        created_at: new Date().toISOString(),
      },
      accessToken: "at",
      refreshToken: "rt",
    };

    mockLogin.mockResolvedValueOnce(fakeResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: "admin@ems.io", password: "pass" });
    });

    expect(result.current.can(["admin", "dispatcher"])).toBe(true);
    expect(result.current.can(["driver"])).toBe(false);
  });
});
