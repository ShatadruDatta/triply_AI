import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';

export type Me = {
  user: { id: string; email: string | null; name: string | null; avatarUrl: string | null };
  quota: {
    used: number;
    limit: number;
    remaining: number;
    tripsTotal: number;
    tripsLeft: number;
    resetsAt: string;
  };
};

// The signed-in user and their monthly trip quota.
export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/me') });
}
