import "@testing-library/jest-dom/vitest";

// Stub import.meta.env for vitest
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_API_URL: "http://localhost:4000/api",
    VITE_SOCKET_URL: "http://localhost:4000",
    VITE_APP_NAME: "ResQ",
    VITE_ENV: "test",
    MODE: "test",
  },
  writable: true,
});
