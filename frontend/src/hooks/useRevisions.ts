import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Revision } from '../types';

const API_BASE = '/api';

export function useRevision(revisionId: number) {
  return useQuery<Revision>({
    queryKey: ['revisions', revisionId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/revisions/${revisionId}`);
      if (!res.ok) throw new Error('Failed to fetch revision');
      return res.json();
    },
    enabled: !!revisionId,
  });
}

export function useReviewRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      revisionId,
      review,
    }: {
      revisionId: number;
      review: {
        accept_poem: boolean;
        accept_guide_changes: boolean;
        edited_poem?: string;
        edited_guide_changes?: string;
      };
    }) => {
      const res = await fetch(`${API_BASE}/revisions/${revisionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
      });
      if (!res.ok) throw new Error('Failed to review revision');
      return res.json() as Promise<Revision>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
      queryClient.invalidateQueries({ queryKey: ['poems'] });
      queryClient.invalidateQueries({ queryKey: ['guide'] });
    },
  });
}
