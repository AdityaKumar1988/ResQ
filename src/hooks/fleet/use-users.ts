import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api/client";
import { queryKeys } from "@/lib/queryKeys";
import type { UserRole } from "@/lib/ems/types";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  created_at: string;
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
