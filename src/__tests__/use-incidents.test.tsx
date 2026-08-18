import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useIncidents } from "@/hooks/dispatch/use-incidents";

// Mock the API client
vi.mock("@/lib/api/incidents", () => ({
  incidentsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    assign: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

// Import the mock after vi.mock
import { incidentsApi } from "@/lib/api/incidents";
const mockList = vi.mocked(incidentsApi.list);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useIncidents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array while loading", () => {
    mockList.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useIncidents(), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns incidents on success", async () => {
    const fakeIncidents = [
      {
        id: "inc-1",
        code: "INC-001",
        priority: "P1" as const,
        type: "cardiac" as const,
        status: "reported" as const,
        lat: 12.9249,
        lng: 79.135,
        location: { lat: 12.9249, lng: 79.135 },
        address: "123 Test St",
        notes: undefined,
        citizenName: "Jane",
        citizenPhone: "555-1234",
        citizenUserId: undefined,
        slaSeconds: 480,
        reportedAt: new Date().toISOString(),
        timeline: [],
      },
    ];
    mockList.mockResolvedValueOnce({ incidents: fakeIncidents });

    const { result } = renderHook(() => useIncidents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].code).toBe("INC-001");
  });

  it("sets isError on failure", async () => {
    mockList.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useIncidents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
