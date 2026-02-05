import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Guide, GuideVersion } from '../types';

const API_BASE = '/api';

export function useGuide() {
  return useQuery<Guide>({
    queryKey: ['guide'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/guide`);
      if (!res.ok) throw new Error('Failed to fetch guide');
      return res.json();
    },
  });
}

export function useGuideHistory() {
  return useQuery<GuideVersion[]>({
    queryKey: ['guide', 'history'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/guide/history`);
      if (!res.ok) throw new Error('Failed to fetch guide history');
      return res.json();
    },
  });
}

export function useUpdateGuide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, change_summary }: { content: string; change_summary?: string }) => {
      const res = await fetch(`${API_BASE}/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, change_summary }),
      });
      if (!res.ok) throw new Error('Failed to update guide');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guide'] });
    },
  });
}
