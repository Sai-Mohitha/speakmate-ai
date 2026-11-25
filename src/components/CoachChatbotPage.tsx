import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ExternalLink,
  Globe,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import type { ChatbotMessageRecord, UserProfile } from "../types";

interface CoachChatbotPageProps {
  user: UserProfile;
  messages: ChatbotMessageRecord[];
  onSaveMessage: (msg: ChatbotMessageRecord) => Promise<void> | void;
  onClearHistory: () => Promise<void> | void;
}

const PERSONAS = [
  {
    id: "Career & Interview Advisor",
    summary: "Company research, interview drills, and salary/role phrasing",
    starter: "What are the latest software engineering interview trends in 2026?",
  },
  {
    id: "Current Events Discussion Coach",
    summary: "Real-world news discussions grounded with Google Search",
    starter: "Give me a current technology news topic and 3 discussion questions.",
  },
  {
    id: "Grammar & Writing Strategist",
    summary: "Rewrite emails, clarify grammar rules, and polish tone",
    starter: "How can I politely disagree with a timeline in a team email?",
  },
  {
    id: "Executive Communication Mentor",
    summary: "Keynote framing, stakeholder updates, and persuasive briefs",
    starter: "Help me structure a 2-minute executive summary for a delayed project.",
  },
] as const;

const MODEL_OPTIONS = [
  {
    id: "gemini-4-hydrogen",
    label: "Gemini 4 Hydrogen (General + Google Search)",
    supportsSearch: true,
    paidTierNote: false,
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite (Fast Responses)",
    supportsSearch: false,
    paidTierNote: false,
  },
  {
    id: "gemini-4-neon",
    label: "Gemini 4 Neon (Complex Interactive · Paid Key)",
    supportsSearch: false,
    paidTierNote: true,
  },
  {
    id: "gemini-4-carbon",
    label: "Gemini 4 Carbon (Deep Reasoning · Paid Key)",
    supportsSearch: false,
    paidTierNote: true,
  },
] as const;

export function CoachChatbotPage({
  user,
  messages,
  onSaveMessage,
  onClearHistory,
}: CoachChatbotPageProps) {
  const [persona, setPersona] = useState<string>(PERSONAS[0].id);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-4-hydrogen");
  const [useSearch, setUseSearch] = useState<boolean>(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const activeModelMeta =
    MODEL_OPTIONS.find((m) => m.id === selectedModel) ?? MODEL_OPTIONS[0];
  const searchEffectivelyEnabled = useSearch && activeModelMeta.supportsSearch;

  async function sendPrompt(promptText: string) {
    const trimmed = promptText.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    setInput("");

    const userMsg: ChatbotMessageRecord = {
      id: `msg_u_${Date.now()}`,
      userId: user.id,
      role: "user",
      text: trimmed,
      persona,
      modelUsed: selectedModel,
      createdAt: new Date().toISOString(),
    };

    try {
      await onSaveMessage(userMsg);

      const res = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-18).map((m) => ({ role: m.role, text: m.text })),
          persona,
          model: selectedModel,
          useSearch: searchEffectivelyEnabled,
          level: user.proficiencyLevel,
          userName: user.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Unable to get a response from Gemini.");
        return;
      }

      const aiMsg: ChatbotMessageRecord = {
        id: `msg_m_${Date.now() + 1}`,
        userId: user.id,
        role: "model",
        text: data.reply,
        persona,
        modelUsed: data.modelUsed || selectedModel,
        sources: Array.isArray(data.sources) ? data.sources : undefined,
        createdAt: new Date().toISOString(),
      };
      await onSaveMessage(aiMsg);
    } catch {
      setError("Network error while contacting the SpeakMate AI Chatbot.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendPrompt(input);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Configuration Sidebar */}
      <aside className="space-y-5 lg:col-span-4">
        <div className="rounded-xl border border-[#E6E8F0] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#141726]">Coach Persona</h2>
          <p className="mt-1 text-xs text-[#6B7280]">
            Sets the system instruction guiding multi-turn responses.
          </p>
          <div className="mt-3 space-y-1.5">
            {PERSONAS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPersona(item.id)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                  persona === item.id
                    ? "border-[#635BDB] bg-[#F0EEFF]/70 text-[#5249C9]"
                    : "border-[#E6E8F0] bg-white text-[#374151] hover:bg-[#F8F9FC]"
                }`}
              >
                <p className="text-sm font-semibold">{item.id}</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">{item.summary}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-[#E6E8F0] bg-white p-5">
          <div>
            <label htmlFor="chatbot-model" className="block text-sm font-semibold text-[#141726]">
              Gemini Model
            </label>
            <select
              id="chatbot-model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-medium text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {activeModelMeta.paidTierNote && (
              <p className="mt-2 text-xs text-amber-800">
                Note: This model requires a billing-enabled API key in Settings &gt; Secrets. Switch
                to Gemini 4 Hydrogen or Flash Lite for free-tier access.
              </p>
            )}
          </div>

          <div className="border-t border-[#E6E8F0] pt-4">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={searchEffectivelyEnabled}
                disabled={!activeModelMeta.supportsSearch}
                onChange={(e) => setUseSearch(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] text-[#635BDB] focus:ring-[#635BDB] disabled:opacity-40"
              />
              <div>
                <p className="text-xs font-semibold text-[#141726]">Google Search Grounding</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">
                  Retrieve live web information with verified source links (available with Gemini 4
                  Hydrogen).
                </p>
              </div>
            </label>
          </div>

          {messages.length > 0 && (
            <div className="border-t border-[#E6E8F0] pt-4">
              <button
                type="button"
                onClick={() => void onClearHistory()}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs font-medium text-[#374151] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Conversation Thread
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Right Scrollable Multi-Turn Thread */}
      <section className="flex min-h-[620px] flex-col rounded-xl border border-[#E6E8F0] bg-white lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E8F0] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#141726]">{persona}</h2>
            <p className="text-xs text-[#6B7280]">
              {selectedModel} ·{" "}
              {searchEffectivelyEnabled ? "Google Search Grounding Active" : "Standard Coaching"} ·{" "}
              {user.authProvider === "google" ? "Synced to Firestore" : "Saved Locally"}
            </p>
          </div>
          <span className="font-mono text-xs text-[#6B7280] tabular-nums">
            {messages.length} {messages.length === 1 ? "message" : "messages"}
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 && !sending && (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] text-[#635BDB]">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#141726]">
                Ask About English, Interviews, or Current Topics
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-[#4B5563]">
                Multi-turn memory retains your thread context, and Google Search grounding verifies
                live facts with clickable web citations.
              </p>
              <div className="mx-auto mt-5 grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPersona(p.id);
                      void sendPrompt(p.starter);
                    }}
                    className="rounded-lg border border-[#E6E8F0] bg-[#F8F9FC] p-3 text-left text-xs text-[#374151] transition-colors hover:border-[#635BDB]/40 hover:bg-[#F0EEFF]/60 cursor-pointer"
                  >
                    &ldquo;{p.starter}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#141726] text-white"
                    : "border border-[#E6E8F0] bg-[#F8F9FC] text-[#141726]"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {msg.role === "model" && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 rounded-lg border border-[#E6E8F0] bg-white p-3">
                    <p className="text-[11px] font-semibold text-[#4B5563]">
                      Grounded Google Search Sources
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {msg.sources.map((src, idx) => (
                        <li key={src.uri} className="flex items-start gap-2 text-xs">
                          <span className="font-mono text-[11px] text-[#6B7280] tabular-nums">
                            {String(idx + 1).padStart(2, "0")}.
                          </span>
                          <a
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-[#635BDB] hover:underline break-all"
                          >
                            <span>{src.title}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p
                  className={`mt-2 text-[11px] ${
                    msg.role === "user" ? "text-slate-300" : "text-[#6B7280]"
                  }`}
                >
                  {msg.persona} · {msg.modelUsed}
                </p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin text-[#635BDB]" />
              <span>
                {searchEffectivelyEnabled
                  ? "Searching live web data and composing response..."
                  : "Composing response..."}
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-[#E6E8F0] bg-[#F8F9FC] p-4">
          <div className="flex items-end gap-2.5">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendPrompt(input);
                }
              }}
              disabled={sending}
              placeholder="Ask for interview research, current events talking points, or grammar help..."
              className="flex-1 resize-none rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-sm text-[#141726] placeholder:text-[#9CA3AF] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#635BDB] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#5249C9] disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
