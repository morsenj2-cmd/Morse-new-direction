import { useQuery } from "@tanstack/react-query";

export type Notification = {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch notifications");
      }

      return res.json() as Promise<Notification[]>;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}
