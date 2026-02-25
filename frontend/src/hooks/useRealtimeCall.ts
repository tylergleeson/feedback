import { useState, useRef, useCallback, useEffect } from 'react';

interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface UseRealtimeCallReturn {
  startCall: (poemId: number) => Promise<void>;
  endCall: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  transcript: TranscriptEntry[];
  callDuration: number;
}

export function useRealtimeCall(): UseRealtimeCallReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Track partial transcripts for accumulation
  const currentUserTranscriptRef = useRef<string>('');
  const currentAssistantTranscriptRef = useRef<string>('');

  // Duration timer
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
      setCallDuration(0);
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
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const startCall = useCallback(async (poemId: number) => {
    setError(null);
    setIsConnecting(true);
    setTranscript([]);
    currentUserTranscriptRef.current = '';
    currentAssistantTranscriptRef.current = '';

    try {
      // 1. Get poem context + system prompt
      const ctxResp = await fetch(`/api/realtime/context/${poemId}`);
      if (!ctxResp.ok) throw new Error('Failed to load poem context');
      const ctx = await ctxResp.json();

      // 2. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Set up remote audio playback
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
      };

      // 4. Get mic access and add track
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      // 5. Set up data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('[Realtime] Data channel open');
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleRealtimeEvent(event);
        } catch {
          // ignore non-JSON messages
        }
      };

      // 6. Create and send SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResp = await fetch('/api/realtime/session', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Content-Type': 'application/sdp',
          'X-System-Prompt': ctx.system_prompt,
        },
      });

      if (!sdpResp.ok) {
        const errText = await sdpResp.text();
        throw new Error(`Session creation failed: ${errText}`);
      }

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Connection lost');
          cleanup();
        }
      };

    } catch (err: any) {
      setError(err.message || 'Failed to start call');
      cleanup();
    }
  }, [cleanup]);

  const handleRealtimeEvent = useCallback((event: any) => {
    const type = event.type;

    // Input audio transcription (what the user said)
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = event.transcript?.trim();
      if (text) {
        setTranscript(prev => [...prev, { role: 'user', text, timestamp: Date.now() }]);
      }
    }

    // Assistant audio transcript delta (streaming)
    if (type === 'response.audio_transcript.delta') {
      currentAssistantTranscriptRef.current += event.delta || '';
    }

    // Assistant audio transcript done
    if (type === 'response.audio_transcript.done') {
      const text = (event.transcript || currentAssistantTranscriptRef.current).trim();
      if (text) {
        setTranscript(prev => [...prev, { role: 'assistant', text, timestamp: Date.now() }]);
      }
      currentAssistantTranscriptRef.current = '';
    }

    // Response completed
    if (type === 'response.done') {
      // If we have accumulated assistant text that wasn't flushed
      if (currentAssistantTranscriptRef.current.trim()) {
        const text = currentAssistantTranscriptRef.current.trim();
        setTranscript(prev => [...prev, { role: 'assistant', text, timestamp: Date.now() }]);
        currentAssistantTranscriptRef.current = '';
      }
    }

    // Error handling
    if (type === 'error') {
      console.error('[Realtime] Error:', event.error);
      setError(event.error?.message || 'Realtime API error');
    }
  }, []);

  const endCall = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    startCall,
    endCall,
    isConnected,
    isConnecting,
    error,
    transcript,
    callDuration,
  };
}
