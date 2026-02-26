import { useState, useRef, useCallback, useEffect } from 'react';

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface UseRealtimeCallReturn {
  startCall: (poemId: number) => Promise<void>;
  endCall: () => void;
  clearTranscript: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  callEnded: boolean;
  error: string | null;
  transcript: TranscriptEntry[];
  callDuration: number;
  userSpeaking: boolean;
}

export function useRealtimeCall(): UseRealtimeCallReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [userSpeaking, setUserSpeaking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Use a ref for the event handler so the data channel closure always
  // calls the latest version without needing to re-bind.
  const handleEventRef = useRef<(event: unknown) => void>(() => {});

  // Accumulated assistant transcript between delta/done events
  const assistantBufferRef = useRef<string>('');

  // Duration timer — keep final value when call ends
  useEffect(() => {
    if (isConnected) {
      startTimeRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Don't reset callDuration — preserve the final value
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  const cleanup = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setCallEnded(true);
  }, []);

  // Cleanup on unmount to prevent leaked connections/mic streams
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Keep the event handler ref up to date
  handleEventRef.current = (event: unknown) => {
    const evt = event as Record<string, unknown>;
    const type = evt.type as string | undefined;
    if (!type) return;

    // VAD events — live speaking indicator
    if (type === 'input_audio_buffer.speech_started') {
      setUserSpeaking(true);
    }
    if (type === 'input_audio_buffer.speech_stopped') {
      setUserSpeaking(false);
    }

    // User finished speaking — transcription result
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = (evt.transcript as string | undefined)?.trim();
      if (text) {
        setTranscript((prev) => [...prev, { role: 'user', text, timestamp: Date.now() }]);
      }
    }

    // Assistant audio transcript streaming delta
    if (type === 'response.audio_transcript.delta') {
      assistantBufferRef.current += (evt.delta as string) || '';
    }

    // Assistant audio transcript complete
    if (type === 'response.audio_transcript.done') {
      const text = ((evt.transcript as string) || assistantBufferRef.current).trim();
      if (text) {
        setTranscript((prev) => [...prev, { role: 'assistant', text, timestamp: Date.now() }]);
      }
      assistantBufferRef.current = '';
    }

    // Response fully done — flush any remaining buffer
    if (type === 'response.done') {
      const remaining = assistantBufferRef.current.trim();
      if (remaining) {
        setTranscript((prev) => [...prev, { role: 'assistant', text: remaining, timestamp: Date.now() }]);
        assistantBufferRef.current = '';
      }
    }

    // Errors
    if (type === 'error') {
      const errObj = evt.error as Record<string, unknown> | undefined;
      const msg = (errObj?.message as string) || 'Realtime API error';
      console.error('[Realtime] Error:', errObj);
      setError(msg);
    }
  };

  const startCall = useCallback(async (poemId: number) => {
    setError(null);
    setIsConnecting(true);
    setCallEnded(false);
    setCallDuration(0);
    setTranscript([]);
    assistantBufferRef.current = '';

    try {
      // 1. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 2. Set up remote audio playback
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
      };

      // 3. Get mic access and add track
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      // 4. Set up data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('[Realtime] Data channel open');
      };

      dc.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          handleEventRef.current(parsed);
        } catch (parseErr) {
          console.warn('[Realtime] Non-JSON data channel message:', e.data);
        }
      };

      // 5. Create and send SDP offer — system prompt is built server-side
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResp = await fetch(`/api/realtime/session/${poemId}`, {
        method: 'POST',
        body: offer.sdp,
        headers: { 'Content-Type': 'application/sdp' },
      });

      if (!sdpResp.ok) {
        const errText = await sdpResp.text();
        throw new Error(`Session creation failed: ${errText}`);
      }

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          if (state === 'failed') {
            setError('Connection lost');
          }
          cleanup();
        }
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start call';
      setError(message);
      cleanup();
    }
  }, [cleanup]);

  const endCall = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setCallEnded(false);
    setCallDuration(0);
  }, []);

  return {
    startCall,
    endCall,
    clearTranscript,
    isConnected,
    isConnecting,
    callEnded,
    error,
    transcript,
    callDuration,
    userSpeaking,
  };
}
