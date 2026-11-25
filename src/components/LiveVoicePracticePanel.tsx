import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
} from "lucide-react";
import type {
  PracticeMode,
  PracticeSessionRecord,
  ProficiencyLevel,
  UserProfile,
} from "../types";

interface LiveVoicePracticePanelProps {
  user: UserProfile;
  mode: PracticeMode;
  level: ProficiencyLevel;
  geminiConfigured: boolean | null;
  onSessionSaved: (record: PracticeSessionRecord) => void;
}

interface LiveTranscriptEntry {
  id: string;
  role: "user" | "model";
  text: string;
}

const VOICE_OPTIONS = [
  { id: "Zephyr", note: "Warm, balanced coach" },
  { id: "Kore", note: "Clear, articulate mentor" },
  { id: "Puck", note: "Upbeat, conversational" },
  { id: "Charon", note: "Calm, measured tone" },
  { id: "Fenrir", note: "Confident, executive" },
] as const;

function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

export function LiveVoicePracticePanel({
  user,
  mode,
  level,
  geminiConfigured,
  onSessionSaved,
}: LiveVoicePracticePanelProps) {
  const [voiceName, setVoiceName] = useState<string>("Zephyr");
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState<LiveTranscriptEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isMutedRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionStartIsoRef = useRef<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    if (status !== "live") return;
    const timer = window.setInterval(() => {
      if (sessionStartIsoRef.current) {
        setElapsedSeconds(
          Math.floor((Date.now() - new Date(sessionStartIsoRef.current).getTime()) / 1000)
        );
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  function stopPlaybackQueue() {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }

  function cleanupAudioAndSocket() {
    stopPlaybackQueue();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close();
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      void outputCtxRef.current.close();
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setMicLevel(0);
  }

  useEffect(() => {
    return () => {
      cleanupAudioAndSocket();
    };
  }, []);

  function appendTranscriptChunk(role: "user" | "model", text: string) {
    const clean = text.trim();
    if (!clean) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: `${last.text} ${clean}`.replace(/\s+/g, " ").trim(),
        };
        return updated;
      }
      return [...prev, { id: `${role}_${Date.now()}_${Math.random()}`, role, text: clean }];
    });
  }

  function schedulePcmAudio(base64Pcm: string) {
    const outCtx = outputCtxRef.current;
    if (!outCtx) return;
    if (outCtx.state === "suspended") {
      void outCtx.resume();
    }

    const floatSamples = pcm16Base64ToFloat32(base64Pcm);
    if (floatSamples.length === 0) return;

    const buffer = outCtx.createBuffer(1, floatSamples.length, 24000);
    buffer.getChannelData(0).set(floatSamples);

    const source = outCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(outCtx.destination);

    const now = outCtx.currentTime;
    const startAt = Math.max(now + 0.02, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
    };
  }

  async function handleStartLiveVoice() {
    setErrorMessage(null);
    setSavedNotice(false);
    setTranscript([]);
    setElapsedSeconds(0);
    setStatus("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "start",
            mode,
            level,
            voiceName,
            userName: user.name,
          })
        );
      };

      ws.onmessage = (event) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data)) as Record<string, unknown>;
        } catch {
          return;
        }

        if (msg.type === "ready") {
          sessionStartIsoRef.current = new Date().toISOString();
          setStatus("live");

          // Start mic capture loop at 16kHz
          const sourceNode = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (audioEvent) => {
            if (isMutedRef.current) {
              setMicLevel(0);
              return;
            }
            const channelData = audioEvent.inputBuffer.getChannelData(0);
            let sumSq = 0;
            for (let i = 0; i < channelData.length; i++) {
              sumSq += channelData[i] * channelData[i];
            }
            const rms = Math.sqrt(sumSq / channelData.length);
            setMicLevel(Math.min(100, Math.round(rms * 360)));

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const base64 = float32ToPcm16Base64(channelData);
              wsRef.current.send(JSON.stringify({ type: "audio", data: base64 }));
            }
          };

          sourceNode.connect(processor);
          processor.connect(inputCtx.destination);

          // Prompt coach to greet learner immediately
          ws.send(
            JSON.stringify({
              type: "text",
              text: `Hi! Please greet ${user.name} warmly and open our ${level}-level ${mode} voice practice session.`,
            })
          );
          return;
        }

        if (msg.type === "audio" && typeof msg.data === "string") {
          schedulePcmAudio(msg.data);
          return;
        }
        if (msg.type === "interrupted") {
          stopPlaybackQueue();
          return;
        }
        if (msg.type === "inputTranscript" && typeof msg.text === "string") {
          appendTranscriptChunk("user", msg.text);
          return;
        }
        if (msg.type === "outputTranscript" && typeof msg.text === "string") {
          appendTranscriptChunk("model", msg.text);
          return;
        }
        if (msg.type === "error" && typeof msg.message === "string") {
          setErrorMessage(msg.message);
          setStatus("error");
          cleanupAudioAndSocket();
          return;
        }
        if (msg.type === "closed") {
          setStatus("idle");
        }
      };

      ws.onerror = () => {
        setErrorMessage("WebSocket connection error while starting Live Voice.");
        setStatus("error");
        cleanupAudioAndSocket();
      };

      ws.onclose = () => {
        if (status === "live") {
          setStatus("idle");
        }
      };
    } catch (err) {
      cleanupAudioAndSocket();
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? `Microphone access failed: ${err.message}`
          : "Unable to access your microphone for live voice practice."
      );
    }
  }

  function handleEndCall() {
    cleanupAudioAndSocket();
    setStatus("idle");
  }

  async function handleSaveVoiceSession() {
    if (transcript.length === 0 || saving) return;
    setSaving(true);
    try {
      let summary;
      const res = await fetch("/api/practice/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          level,
          transcript: transcript.map((t) => ({ role: t.role, text: t.text })),
        }),
      });
      if (res.ok) {
        summary = await res.json();
      }
      const endedAt = new Date().toISOString();
      const startedAt = sessionStartIsoRef.current ?? endedAt;
      onSessionSaved({
        id: `live_${Date.now()}`,
        userId: user.id,
        mode,
        level,
        startedAt,
        endedAt,
        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
        messageCount: transcript.length,
        corrections: [],
        vocabularyLearned: [],
        summary,
      });
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  }

  const formattedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(
    elapsedSeconds % 60
  ).padStart(2, "0")}`;

  return (
    <div className="flex min-h-[620px] flex-col rounded-xl border border-[#E6E8F0] bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E8F0] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#141726]">
            Real-Time Voice Coach · {mode}
          </h2>
          <p className="text-xs text-[#6B7280]">
            Gemini Live API (gemini-3.8-live) · {level} Level · 16kHz / 24kHz Audio
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label="Coach voice"
            disabled={status === "live" || status === "connecting"}
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            className="rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#141726] focus:border-[#635BDB] focus:outline-none disabled:opacity-50"
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                Voice: {v.id} ({v.note})
              </option>
            ))}
          </select>
          <span className="font-mono text-xs font-semibold text-[#4B5563] tabular-nums">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Live Audio Stage + Transcript */}
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
        <div className="rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#E6E8F0] bg-white text-[#635BDB]">
            {status === "connecting" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </div>

          <p className="mt-3 text-sm font-semibold text-[#141726]">
            {status === "idle" && "Ready for Real-Time Spoken Practice"}
            {status === "connecting" && "Connecting to Gemini Live Voice Session..."}
            {status === "live" &&
              (isMuted
                ? "Live Session Active · Microphone Muted"
                : "Live Session Active · Speak Naturally")}
            {status === "error" && "Voice Session Disconnected"}
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            {status === "live"
              ? "You can interrupt the coach anytime by speaking — SpeakMate AI listens in real time."
              : "Click Start Live Voice Call to converse out loud with instant spoken coaching."}
          </p>

          {/* Mic Level Bar */}
          {status === "live" && (
            <div className="mx-auto mt-4 max-w-xs">
              <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                <span>Microphone Input Level</span>
                <span className="font-mono font-medium text-[#141726] tabular-nums">
                  {micLevel}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                <div
                  className="h-full rounded-full bg-[#635BDB] transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>
          )}

          {/* Call Controls */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {status !== "live" && status !== "connecting" ? (
              <button
                type="button"
                disabled={geminiConfigured === false}
                onClick={handleStartLiveVoice}
                className="inline-flex items-center gap-2 rounded-lg bg-[#635BDB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5249C9] disabled:opacity-50 cursor-pointer"
              >
                <PhoneCall className="h-4 w-4" />
                Start Live Voice Call
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    isMuted
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-[#D1D5DB] bg-white text-[#141726] hover:bg-[#F1F3F6]"
                  }`}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isMuted ? "Unmute Mic" : "Mute Mic"}
                </button>
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 cursor-pointer"
                >
                  <PhoneOff className="h-4 w-4" />
                  End Call
                </button>
              </>
            )}

            {transcript.length > 0 && status === "idle" && !savedNotice && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveVoiceSession}
                className="inline-flex items-center gap-2 rounded-lg border border-[#635BDB]/30 bg-[#F0EEFF] px-4 py-2.5 text-sm font-semibold text-[#5249C9] hover:bg-[#E0E7FF] disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Save Voice Session to Progress
              </button>
            )}
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>Your live voice session and coaching summary have been saved to My Progress.</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Transcript Feed */}
        {transcript.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#6B7280]">Live Voice Transcript</p>
            {transcript.map((entry) => (
              <div
                key={entry.id}
                className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    entry.role === "user"
                      ? "bg-[#141726] text-white"
                      : "border border-[#E6E8F0] bg-[#F8F9FC] text-[#141726]"
                  }`}
                >
                  <p className="text-[11px] font-medium opacity-75">
                    {entry.role === "user" ? user.name.split(" ")[0] : `SpeakMate AI (${voiceName})`}
                  </p>
                  <p className="mt-0.5">{entry.text}</p>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
