import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FeedbackSession, InlineComment, Revision } from '../types';

const API_BASE = '/api';

export function useFeedbackSession(sessionId: number) {
  return useQuery<FeedbackSession>({
    queryKey: ['feedback', sessionId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/feedback/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch feedback session');
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export function useStartFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (poemId: number) => {
      const res = await fetch(`${API_BASE}/poems/${poemId}/feedback/start`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to start feedback session');
      return res.json() as Promise<FeedbackSession>;
    },
    onSuccess: (_, poemId) => {
      queryClient.invalidateQueries({ queryKey: ['poems', poemId] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      comment,
    }: {
      sessionId: number;
      comment: {
        highlighted_text: string;
        start_offset: number;
        end_offset: number;
        comment: string;
        audio_path?: string;
      };
    }) => {
      const res = await fetch(`${API_BASE}/feedback/${sessionId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      return res.json() as Promise<InlineComment>;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['feedback', sessionId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, commentId }: { sessionId: number; commentId: number }) => {
      const res = await fetch(`${API_BASE}/feedback/${sessionId}/comment/${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['feedback', sessionId] });
    },
  });
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      data,
    }: {
      sessionId: number;
      data: { overall_feedback?: string; rating?: number };
    }) => {
      const res = await fetch(`${API_BASE}/feedback/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update feedback');
      return res.json() as Promise<FeedbackSession>;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['feedback', sessionId] });
    },
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await fetch(`${API_BASE}/feedback/${sessionId}/submit`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to submit feedback');
      return res.json() as Promise<FeedbackSession>;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['feedback', sessionId] });
    },
  });
}

export function useProcessFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await fetch(`${API_BASE}/feedback/${sessionId}/process`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to process feedback');
      return res.json() as Promise<Revision>;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['feedback', sessionId] });
    },
  });
}
