import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";
import type { UserRole } from "@/lib/ems/types";
import { ApiError } from "@/types/api";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "invited" | "active" | "suspended";
  phone?: string;
  created_at: string;
}

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  role: "admin" | "dispatcher";
  phone?: string;
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: async () => {
      const res = await client.get<{ users: UserInfo[] }>("/users");
      return res.users;
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStaffInput) => {
      const res = await client.post<{ user: UserInfo }>("/users", data);
      return res.user;
    },
    onSuccess: (user) => {
      toast.success(`Staff account created for ${user.name}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to create staff account";
      toast.error(msg);
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const res = await client.patch<{ user: UserInfo }>(`/users/${id}/role`, { role });
      return res.user;
    },
    onSuccess: (user) => {
      toast.success(`Role updated for ${user.name}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to update role";
      toast.error(msg);
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "active" | "invited" | "suspended";
    }) => {
      const res = await client.patch<{ user: UserInfo }>(`/admin/users/${id}/status`, { status });
      return res.user;
    },
    onSuccess: (user) => {
      toast.success(`Status updated for ${user.name}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to update staff status";
      toast.error(msg);
    },
  });
}
