import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Poem, PoemWithFeedback } from '../types';

const API_BASE = '/api';

export function usePoems() {
  return useQuery<Poem[]>({
    queryKey: ['poems'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/poems`);
      if (!res.ok) throw new Error('Failed to fetch poems');
      return res.json();
    },
  });
}

export function usePoem(id: number) {
  return useQuery<PoemWithFeedback>({
    queryKey: ['poems', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/poems/${id}`);
      if (!res.ok) throw new Error('Failed to fetch poem');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useGeneratePoem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prompt: string) => {
      const res = await fetch(`${API_BASE}/poems/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error('Failed to generate poem');
      return res.json() as Promise<Poem>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poems'] });
    },
  });
}
