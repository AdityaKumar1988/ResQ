import { client } from "./client";
import type { AuthResponse, LoginInput, MeResponse, RegisterInput, TokenPair } from "@/types/auth";

export const authApi = {
  login: (data: LoginInput) => client.post<AuthResponse>("/auth/login", data),

  register: (data: RegisterInput) => client.post<AuthResponse>("/auth/register", data),

  refresh: (refreshToken: string) =>
    client.post<TokenPair>("/auth/refresh", { refreshToken }, { skipAuth: true } as never),

  me: () => client.get<MeResponse>("/auth/me"),
};
