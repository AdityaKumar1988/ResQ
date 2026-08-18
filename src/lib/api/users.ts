import { client } from "./client";
import type { UserRole } from "@/lib/ems/types";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
}

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  role: "admin" | "dispatcher";
  phone: string;
}

export const usersApi = {
  list: () => client.get<{ users: UserInfo[] }>("/users"),
  createStaff: (data: CreateStaffInput) => client.post<{ user: UserInfo }>("/users", data),
  updateRole: (id: string, role: UserRole) =>
    client.patch<{ user: UserInfo }>(`/users/${id}/role`, { role }),
};
