import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VoiceFeedbackSession } from '../types';

const API_BASE = '/api/voice';

export function useVoiceSession(sessionId: number | null) {
  return useQuery<VoiceFeedbackSession>({
    queryKey: ['voiceSession', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID is required');
      const res = await fetch(`${API_BASE}/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch voice session');
      return res.json();
    },
    enabled: !!sessionId,
  });
}

export function useStartVoiceFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (poemId: number) => {
      const res = await fetch(`${API_BASE}/start/${poemId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to start voice feedback session');
      return res.json() as Promise<VoiceFeedbackSession>;
    },
    onSuccess: (_, poemId) => {
      queryClient.invalidateQueries({ queryKey: ['poems', poemId] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      text,
      audioBlob,
    }: {
      sessionId: number;
      text?: string;
      audioBlob?: Blob;
    }) => {
      const formData = new FormData();

      if (text) {
        formData.append('text', text);
      }

      if (audioBlob) {
        formData.append('audio_file', audioBlob, 'recording.webm');
      }

      const res = await fetch(`${API_BASE}/${sessionId}/message`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to send message');
      }

      return res.json() as Promise<VoiceFeedbackSession>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['voiceSession', data.id], data);
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await fetch(`${API_BASE}/${sessionId}/complete`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to complete session');
      return res.json() as Promise<VoiceFeedbackSession>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['voiceSession', data.id], data);
    },
  });
}

export function useConfirmFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      confirmedIds,
      rejectedIds,
      edits,
    }: {
      sessionId: number;
      confirmedIds: number[];
      rejectedIds: number[];
      edits?: { id: number; content?: string; highlighted_text?: string }[];
    }) => {
      const res = await fetch(`${API_BASE}/${sessionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed_ids: confirmedIds,
          rejected_ids: rejectedIds,
          edits: edits || [],
        }),
      });
      if (!res.ok) throw new Error('Failed to confirm feedback');
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate both voice session and feedback session
      queryClient.invalidateQueries({ queryKey: ['voiceSession'] });
      queryClient.invalidateQueries({ queryKey: ['feedback', data.feedback_session_id] });
    },
  });
}

export function useSaveRealtimeTranscript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poemId,
      transcript,
    }: {
      poemId: number;
      transcript: { role: string; text: string; timestamp: number }[];
    }) => {
      const res = await fetch('/api/realtime/save-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poem_id: poemId,
          transcript,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to save transcript');
      }
      return res.json() as Promise<VoiceFeedbackSession>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['poems', variables.poemId] });
    },
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await fetch(`${API_BASE}/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to cancel session');
      return res.json();
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['voiceSession', sessionId] });
    },
  });
}
