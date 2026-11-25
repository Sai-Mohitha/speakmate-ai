import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Mic,
  PhoneCall,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { SPEAKING_TOPICS, formatLevelLabel } from "../data/demoData";
import { LiveVoicePracticePanel } from "./LiveVoicePracticePanel";
import type {
  ChatTurn,
  GrammarCorrection,
  PracticeMode,
  PracticeSessionRecord,
  ProficiencyLevel,
  SpeakingTopic,
  UserProfile,
  VocabularyItem,
} from "../types";

interface AIPracticePageProps {
  user: UserProfile;
  initialMode?: PracticeMode;
  initialLevel?: ProficiencyLevel;
  initialTopic?: SpeakingTopic;
  savedVocabulary: VocabularyItem[];
  onToggleLearnedWord: (item: VocabularyItem) => void;
  onSessionSaved: (record: PracticeSessionRecord) => void;
}

interface ApiChatResponse {
  reply: string;
  hasGrammarIssue: boolean;
  grammarCorrection?: GrammarCorrection;
  naturalAlternative?: string;
  vocabularyTip?: VocabularyItem;
  encouragement?: string;
}

const INITIAL_GREETING =
  "Hello! I'm your SpeakMate AI partner. What would you like to talk about today?";

const EXAMPLE_CORRECTION: GrammarCorrection = {
  original: "I am go to college yesterday.",
  corrected: "I went to college yesterday.",
  explanation:
    "Use the simple past tense ('went') instead of 'am go' when referring to a completed action in the past ('yesterday').",
  category: "Verb Tense",
};

const TOPIC_VOCAB_POOL: Record<SpeakingTopic, VocabularyItem[]> = {
  "Daily Life": [
    {
      word: "consistent",
      partOfSpeech: "adjective",
      meaning: "Acting steadily in the same helpful way over time to build lasting habits.",
      example: "Staying consistent with 15 minutes of daily speaking improved my confidence.",
      topic: "Daily Life",
      mode: "Friendly Conversation",
    },
    {
      word: "unwind",
      partOfSpeech: "verb",
      meaning: "To relax and release stress after a busy day of classes or work.",
      example: "After evening lectures, I like to unwind by taking a walk outside.",
      topic: "Daily Life",
      mode: "Friendly Conversation",
    },
    {
      word: "routine",
      partOfSpeech: "noun",
      meaning: "A regular sequence of daily actions that keeps your schedule organized.",
      example: "Building a calm morning routine helped me arrive at college on time.",
      topic: "Daily Life",
      mode: "Friendly Conversation",
    },
  ],
  "Job Interviews": [
    {
      word: "articulate",
      partOfSpeech: "verb",
      meaning: "To express an idea, decision, or experience clearly and fluently.",
      example: "She was able to articulate her capstone impact clearly during the HR round.",
      topic: "Job Interviews",
      mode: "HR Interview Practice",
    },
    {
      word: "proactive",
      partOfSpeech: "adjective",
      meaning: "Taking early action to prevent problems or improve an outcome.",
      example: "I took a proactive approach by flagging the timeline risk before the deadline.",
      topic: "Job Interviews",
      mode: "HR Interview Practice",
    },
    {
      word: "milestone",
      partOfSpeech: "noun",
      meaning: "A clear, measurable checkpoint marking meaningful progress on a project.",
      example: "Breaking the project into weekly milestones helped our team deliver early.",
      topic: "Job Interviews",
      mode: "HR Interview Practice",
    },
  ],
  Education: [
    {
      word: "synthesize",
      partOfSpeech: "verb",
      meaning: "To combine several readings or ideas into one clear, unified takeaway.",
      example: "Strong seminar speakers synthesize complex research into three simple points.",
      topic: "Education",
      mode: "Public Speaking Practice",
    },
    {
      word: "signpost",
      partOfSpeech: "verb",
      meaning: "To clearly guide listeners through the structure of a talk or answer.",
      example: "Phrases like 'First, let's examine...' help signpost your presentation smoothly.",
      topic: "Education",
      mode: "Public Speaking Practice",
    },
    {
      word: "cohesive",
      partOfSpeech: "adjective",
      meaning: "Logically connected so every part of a speech or essay flows smoothly.",
      example: "Adding clear transitions made my thesis summary much more cohesive.",
      topic: "Education",
      mode: "Public Speaking Practice",
    },
  ],
  Technology: [
    {
      word: "scalability",
      partOfSpeech: "noun",
      meaning: "The ability of a software system to handle growing traffic smoothly.",
      example: "We added database indexing early to ensure scalability during exam week.",
      topic: "Technology",
      mode: "Technical Interview Practice",
    },
    {
      word: "trade-off",
      partOfSpeech: "noun",
      meaning: "A balanced compromise between two competing engineering priorities.",
      example: "Caching improved response speed, though the trade-off was extra invalidation logic.",
      topic: "Technology",
      mode: "Technical Interview Practice",
    },
    {
      word: "bottleneck",
      partOfSpeech: "noun",
      meaning: "A single step in a system or workflow that slows down overall performance.",
      example: "Profiling revealed that an unindexed query was our main API bottleneck.",
      topic: "Technology",
      mode: "Technical Interview Practice",
    },
  ],
  "General Conversation": [
    {
      word: "concise",
      partOfSpeech: "adjective",
      meaning: "Communicating complete information clearly in a few well-chosen words.",
      example: "Keeping standup updates concise helps teammates act quickly on blockers.",
      topic: "General Conversation",
      mode: "Professional Workplace Communication",
    },
    {
      word: "alignment",
      partOfSpeech: "noun",
      meaning: "Shared agreement on priorities, expectations, and next steps.",
      example: "Let's schedule a brief sync to confirm alignment before launching.",
      topic: "General Conversation",
      mode: "Professional Workplace Communication",
    },
    {
      word: "perspective",
      partOfSpeech: "noun",
      meaning: "A particular way of viewing or evaluating a situation or idea.",
      example: "Hearing a teammate's perspective helped us simplify the design.",
      topic: "General Conversation",
      mode: "Professional Workplace Communication",
    },
  ],
};

function inferPartOfSpeech(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith("tion") || lower.endsWith("ment") || lower.endsWith("ity") || lower.endsWith("ness")) {
    return "noun";
  }
  if (lower.endsWith("ive") || lower.endsWith("able") || lower.endsWith("ent") || lower.endsWith("ous")) {
    return "adjective";
  }
  if (lower.endsWith("ize") || lower.endsWith("ate") || lower.endsWith("ify")) {
    return "verb";
  }
  return "expression";
}

function analyzeSentenceLocally(
  text: string,
  topic: SpeakingTopic,
  turnIndex: number
): ApiChatResponse {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  let correction: GrammarCorrection | undefined;

  if (/\bi\s+am\s+go\b/i.test(trimmed)) {
    const isPast = /\b(yesterday|last\s+\w+|ago)\b/i.test(trimmed);
    correction = {
      original: trimmed,
      corrected: trimmed.replace(/\bi\s+am\s+go\b/i, isPast ? "I went" : "I go"),
      explanation: isPast
        ? "Use the simple past tense ('went') instead of 'am go' when referring to a completed action in the past."
        : "Use the simple present ('I go') or present continuous ('I am going'), rather than combining 'am' with the base verb 'go'.",
      category: "Verb Tense",
    };
  } else if (/\bsince\s+\d+\s+(day|week|month|year)s?\b|\bsince\s+(two|three|four|five|six)\s+(day|week|month|year)s?\b/i.test(trimmed)) {
    correction = {
      original: trimmed,
      corrected: trimmed
        .replace(/\bi\s+am\s+working\b/i, "I have been working")
        .replace(/\bsince\b/i, "for"),
      explanation:
        "Use 'for' (not 'since') with a duration of time (e.g., 'for six months'), and pair it with present perfect continuous ('have been working').",
      category: "Verb Tense",
    };
  } else if (/\bdiscussed\s+about\b/i.test(trimmed)) {
    correction = {
      original: trimmed,
      corrected: trimmed
        .replace(/\bdiscussed\s+about\b/i, "discussed")
        .replace(/\bwith\s+manager\b/i, "with our manager"),
      explanation:
        "'Discuss' is a transitive verb and does not take 'about' ('discussed the timeline'), and singular countable nouns need a determiner like 'our'.",
      category: "Prepositions",
    };
  } else if (/\bexplain\s+(me|us|him|her|them)\b/i.test(trimmed)) {
    correction = {
      original: trimmed,
      corrected: trimmed
        .replace(/\bprofessor\s+explain\s+us\b/i, "professor explained to us")
        .replace(/\bexplain\s+(me|us|him|her|them)\b/i, "explain to $1"),
      explanation:
        "The verb 'explain' requires 'to' before the person receiving the explanation (e.g., 'explained to us' or 'explain to me').",
      category: "Prepositions",
    };
  } else if (/\bdatabase\s+have\b|\bmany\s+user\s+connects\b/i.test(trimmed)) {
    correction = {
      original: trimmed,
      corrected: trimmed
        .replace(/\bdatabase\s+have\b/i, "database has")
        .replace(/\bmany\s+user\s+connects\b/i, "many users connect"),
      explanation:
        "Match singular subjects with singular verbs ('database has') and plural subjects with plural nouns and verbs ('many users connect').",
      category: "Subject-Verb Agreement",
    };
  } else if (/\bdidn't\s+(went|ate|saw|did|came|made)\b/i.test(trimmed)) {
    const baseMap: Record<string, string> = {
      went: "go",
      ate: "eat",
      saw: "see",
      did: "do",
      came: "come",
      made: "make",
    };
    const match = trimmed.match(/\bdidn't\s+(went|ate|saw|did|came|made)\b/i);
    const badVerb = match?.[1]?.toLowerCase() ?? "went";
    const baseVerb = baseMap[badVerb] ?? "go";
    correction = {
      original: trimmed,
      corrected: trimmed.replace(new RegExp(`didn't\\s+${badVerb}`, "i"), `didn't ${baseVerb}`),
      explanation: `After 'didn't', always use the base form of the verb ('didn't ${baseVerb}') instead of the past tense.`,
      category: "Verb Tense",
    };
  } else if (/\b(he|she|it)\s+(go|have|do|work|make)\b/i.test(trimmed)) {
    correction = {
      original: trimmed,
      corrected: trimmed
        .replace(/\b(he|she|it)\s+go\b/i, "$1 goes")
        .replace(/\b(he|she|it)\s+have\b/i, "$1 has")
        .replace(/\b(he|she|it)\s+do\b/i, "$1 does")
        .replace(/\b(he|she|it)\s+work\b/i, "$1 works")
        .replace(/\b(he|she|it)\s+make\b/i, "$1 makes"),
      explanation:
        "In the simple present tense, third-person singular subjects ('he', 'she', 'it') require an '-s' or '-es' verb ending.",
      category: "Subject-Verb Agreement",
    };
  } else if (/\bmany\s+(researches|informations|feedbacks|advices)\b/i.test(trimmed)) {
    correction = {
      original: trimmed,
      corrected: trimmed.replace(
        /\bmany\s+(researches|informations|feedbacks|advices)\b/i,
        (_, noun: string) => `a lot of ${noun.replace(/es$|s$/i, "")}`
      ),
      explanation:
        "Words like 'research', 'information', 'feedback', and 'advice' are uncountable nouns in English, so use 'a lot of' with the singular form.",
      category: "Articles & Determiners",
    };
  }

  const vocabList = TOPIC_VOCAB_POOL[topic];
  const vocabularyTip = vocabList[turnIndex % vocabList.length];

  const topicReplies: Record<SpeakingTopic, string[]> = {
    "Daily Life": [
      "Thanks for sharing that! What was the most enjoyable or challenging part of your day, and what are you looking forward to tomorrow?",
      "That sounds like a solid daily rhythm. How do you usually balance your study schedule with time to recharge?",
      "Great detail! Try describing one small habit that has helped you stay organized this week.",
    ],
    "Job Interviews": [
      "Strong start—interviewers love hearing specific examples. What was the measurable outcome of your work, and what did you learn from that experience?",
      "You explained your role clearly. If an interviewer asks about a tough challenge you faced on that team, how would you structure your answer using Situation, Action, and Result?",
      "Nice focus on impact. Why does this particular role align with where you want to grow over the next two years?",
    ],
    Education: [
      "Clear academic focus! If you had 30 seconds to summarize the main takeaway for classmates who are new to the subject, how would you introduce it?",
      "Good point. What question do you think your professor or audience might ask after your presentation?",
      "That's a well-structured idea. Try adding a transition phrase like 'Building on that point...' to connect your next example.",
    ],
    Technology: [
      "Nice technical breakdown! What trade-offs did you weigh before choosing that approach, and how did you verify that it solved the issue?",
      "Good engineering clarity. How would you explain that same improvement to a non-technical stakeholder in two sentences?",
      "Great explanation. What monitoring or testing step would you add next if usage grew tenfold?",
    ],
    "General Conversation": [
      "That's a thoughtful perspective! Could you share a concrete example from your classes or work that illustrates what you mean?",
      "Good conversational flow. How would you politely follow up if a teammate disagreed with that plan?",
      "Clear and natural! What is one communication habit you want to strengthen in meetings or group discussions this month?",
    ],
  };

  let reply = topicReplies[topic][turnIndex % topicReplies[topic].length];
  if (lower.includes("college") || lower.includes("class") || lower.includes("university")) {
    reply =
      "It sounds like you had an active day on campus! Which class or project took most of your focus, and what did you work on with your classmates?";
  } else if (lower.includes("interview") || lower.includes("job") || lower.includes("strength")) {
    reply =
      "That's a promising interview angle! Can you back that up with a brief 2-sentence example showing a concrete result you delivered?";
  }

  return {
    reply,
    hasGrammarIssue: Boolean(correction),
    grammarCorrection: correction,
    vocabularyTip,
    encouragement: correction
      ? "Great effort—notice the small tense/structure adjustment in the Grammar Correction panel."
      : "Clean phrasing! Your sentence structure was clear and natural.",
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      if (idx === -1) {
        reject(new Error("Could not encode audio."));
        return;
      }
      resolve(result.slice(idx + 1));
    };
    reader.onerror = () => reject(new Error("Could not read audio."));
    reader.readAsDataURL(blob);
  });
}

export function AIPracticePage({
  user,
  initialMode,
  initialLevel,
  initialTopic,
  savedVocabulary,
  onToggleLearnedWord,
  onSessionSaved,
}: AIPracticePageProps) {
  const defaultTopic: SpeakingTopic =
    initialTopic ??
    SPEAKING_TOPICS.find((t) => t.mode === (initialMode ?? user.preferredMode))?.id ??
    "Daily Life";

  const [interactionMode, setInteractionMode] = useState<"text" | "live-voice">("text");
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<SpeakingTopic>(defaultTopic);
  const [level, setLevel] = useState<ProficiencyLevel>(initialLevel ?? user.proficiencyLevel);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : { geminiConfigured: false }))
      .then((data: { geminiConfigured?: boolean }) => {
        if (active) setGeminiConfigured(Boolean(data.geminiConfigured));
      })
      .catch(() => {
        if (active) setGeminiConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeTopicConfig =
    SPEAKING_TOPICS.find((t) => t.id === selectedTopic) ?? SPEAKING_TOPICS[0];

  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: "ai-greeting-initial",
      role: "model",
      text: INITIAL_GREETING,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);

  const [activeCorrection, setActiveCorrection] = useState<GrammarCorrection | null>(
    EXAMPLE_CORRECTION
  );
  const [hasUserChatted, setHasUserChatted] = useState(false);
  const [lastTurnClean, setLastTurnClean] = useState(false);
  const [activeVocab, setActiveVocab] = useState<VocabularyItem>(
    activeTopicConfig.defaultVocabulary
  );

  const [sessionStartedAt, setSessionStartedAt] = useState<string>(() => new Date().toISOString());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionSavedNotice, setSessionSavedNotice] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialTopic) {
      setSelectedTopic(initialTopic);
      const found = SPEAKING_TOPICS.find((t) => t.id === initialTopic);
      if (found) setActiveVocab(found.defaultVocabulary);
    }
  }, [initialTopic]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionStartedAt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingReply]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const userTurns = messages.filter((m) => m.role === "user");
  const sessionCorrections: GrammarCorrection[] = messages
    .filter((m) => m.role === "model" && m.hasGrammarIssue && m.grammarCorrection?.corrected)
    .map((m) => m.grammarCorrection!);

  const isCurrentVocabSaved = savedVocabulary.some(
    (v) => v.word.trim().toLowerCase() === activeVocab.word.trim().toLowerCase()
  );

  function formatTimer(totalSec: number): string {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function handleSelectTopic(topic: SpeakingTopic) {
    setSelectedTopic(topic);
    const found = SPEAKING_TOPICS.find((t) => t.id === topic);
    if (found) {
      setActiveVocab(found.defaultVocabulary);
    }
    setSessionSavedNotice(false);
  }

  function handleResetConversation() {
    setMessages([
      {
        id: `ai-greeting-${Date.now()}`,
        role: "model",
        text: INITIAL_GREETING,
        timestamp: new Date().toISOString(),
      },
    ]);
    setHasUserChatted(false);
    setActiveCorrection(EXAMPLE_CORRECTION);
    setLastTurnClean(false);
    setActiveVocab(activeTopicConfig.defaultVocabulary);
    setSessionStartedAt(new Date().toISOString());
    setElapsedSeconds(0);
    setSessionSavedNotice(false);
    setMicError(null);
  }

  function speakText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = level === "Beginner" ? 0.92 : 1.0;
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(rawText: string) {
    const clean = rawText.trim();
    if (!clean || loadingReply) return;

    const userMsg: ChatTurn = {
      id: `user-${Date.now()}`,
      role: "user",
      text: clean,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputText("");
    setHasUserChatted(true);
    setSessionSavedNotice(false);
    setLoadingReply(true);

    let responseData: ApiChatResponse | null = null;
    try {
      const res = await fetch("/api/practice/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: activeTopicConfig.mode,
          level,
          message: `[Topic: ${selectedTopic}] ${clean}`,
          history: nextHistory
            .filter((m) => m.id !== "ai-greeting-initial")
            .slice(-10)
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      if (res.ok) {
        responseData = (await res.json()) as ApiChatResponse;
      }
    } catch {
      // Fallback handled cleanly below
    }

    if (!responseData || !responseData.reply) {
      responseData = analyzeSentenceLocally(clean, selectedTopic, userTurns.length);
    } else {
      // Ensure local obvious errors are never missed and partOfSpeech is populated
      const localCheck = analyzeSentenceLocally(clean, selectedTopic, userTurns.length);
      if (!responseData.hasGrammarIssue && localCheck.hasGrammarIssue) {
        responseData.hasGrammarIssue = true;
        responseData.grammarCorrection = localCheck.grammarCorrection;
      }
      if (responseData.vocabularyTip && !responseData.vocabularyTip.partOfSpeech) {
        responseData.vocabularyTip = {
          ...responseData.vocabularyTip,
          partOfSpeech: inferPartOfSpeech(responseData.vocabularyTip.word),
          topic: selectedTopic,
          mode: activeTopicConfig.mode,
        };
      }
    }

    const aiMsg: ChatTurn = {
      id: `ai-${Date.now()}`,
      role: "model",
      text: responseData.reply,
      timestamp: new Date().toISOString(),
      hasGrammarIssue: responseData.hasGrammarIssue,
      grammarCorrection: responseData.grammarCorrection,
      naturalAlternative: responseData.naturalAlternative,
      vocabularyTip: responseData.vocabularyTip,
      encouragement: responseData.encouragement,
    };

    setMessages((prev) => [...prev, aiMsg]);

    if (responseData.hasGrammarIssue && responseData.grammarCorrection) {
      setActiveCorrection(responseData.grammarCorrection);
      setLastTurnClean(false);
    } else {
      setActiveCorrection(null);
      setLastTurnClean(true);
    }

    if (responseData.vocabularyTip?.word) {
      setActiveVocab({
        ...responseData.vocabularyTip,
        partOfSpeech:
          responseData.vocabularyTip.partOfSpeech ??
          inferPartOfSpeech(responseData.vocabularyTip.word),
        topic: selectedTopic,
        mode: activeTopicConfig.mode,
      });
    }

    setLoadingReply(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(inputText);
  }

  function handleCompleteAndSaveSession() {
    if (userTurns.length === 0) return;

    const collectedVocab: VocabularyItem[] = [];
    const seen = new Set<string>();
    for (const msg of messages) {
      if (msg.role === "model" && msg.vocabularyTip?.word) {
        const key = msg.vocabularyTip.word.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          collectedVocab.push({
            ...msg.vocabularyTip,
            topic: selectedTopic,
            mode: activeTopicConfig.mode,
          });
        }
      }
    }
    if (collectedVocab.length === 0) {
      collectedVocab.push(activeVocab);
    }

    const durationMinutes = Math.max(2, Math.round(elapsedSeconds / 60) + userTurns.length);

    const record: PracticeSessionRecord = {
      id: `session-${Date.now()}`,
      userId: user.id,
      mode: activeTopicConfig.mode,
      topic: selectedTopic,
      level,
      startedAt: sessionStartedAt,
      endedAt: new Date().toISOString(),
      durationMinutes,
      messageCount: messages.length,
      corrections: sessionCorrections,
      vocabularyLearned: collectedVocab,
      summary: {
        overview: `Completed ${userTurns.length} speaking ${
          userTurns.length === 1 ? "turn" : "turns"
        } on ${selectedTopic} with ${sessionCorrections.length} grammar ${
          sessionCorrections.length === 1 ? "refinement" : "refinements"
        } reviewed.`,
        strengths: [
          `Active engagement in ${selectedTopic} conversation`,
          "Practiced structured responses and contextual vocabulary",
        ],
        focusAreas:
          sessionCorrections.length > 0
            ? Array.from(new Set(sessionCorrections.map((c) => c.category)))
            : ["Continue expanding sentence variety and natural transitions"],
        recommendedNextStep: `Try another 10-minute session in ${selectedTopic} using your newly learned vocabulary.`,
      },
    };

    onSessionSaved(record);
    setSessionSavedNotice(true);
  }

  async function toggleMicRecording() {
    if (isTranscribing) return;

    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMicError("Voice recording is unavailable in this browser. Type your message below.");
      return;
    }

    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mime = preferred.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        const blob = new Blob(audioChunksRef.current, {
          type: (recorder.mimeType || mime || "audio/webm").split(";")[0],
        });
        audioChunksRef.current = [];
        if (blob.size < 256) return;

        setIsTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const res = await fetch("/api/audio/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64,
              mimeType: blob.type || "audio/webm",
            }),
          });
          const data = (await res.json()) as { transcript?: string; error?: string };
          if (res.ok && data.transcript) {
            setInputText((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript!));
          } else {
            setMicError(data.error ?? "Could not transcribe audio. Try typing your reply.");
          }
        } catch {
          setMicError("Audio transcription unavailable right now. You can type your reply below.");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setMicError("Microphone permission was denied. You can continue by typing.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Mode Switcher: Text & Audio Practice vs Live Voice Call */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-[#E6E8F0] bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <button
            type="button"
            onClick={() => setInteractionMode("text")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              interactionMode === "text"
                ? "bg-[#635BDB] text-white"
                : "text-[#4B5166] hover:text-[#141726]"
            }`}
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            <span>Text &amp; Audio Practice</span>
          </button>
          <button
            type="button"
            onClick={() => setInteractionMode("live-voice")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              interactionMode === "live-voice"
                ? "bg-[#635BDB] text-white"
                : "text-[#4B5166] hover:text-[#141726]"
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Live Voice Call</span>
          </button>
        </div>

        <p className="text-xs text-[#6C728A]">
          {interactionMode === "text"
            ? "Chat or dictate with instant grammar corrections & vocabulary bank"
            : "Hands-free real-time spoken English coaching with live transcript"}
        </p>
      </div>

      {/* Topic Selector Bar & Session Controls */}
      <section className="rounded-2xl border border-[#E6E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.03)] sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold text-[#6C728A]">Choose a Speaking Topic</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {SPEAKING_TOPICS.map((topic) => {
                const active = selectedTopic === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleSelectTopic(topic.id)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? "bg-[#635BDB] text-white shadow-[0_2px_6px_rgba(99,91,219,0.25)]"
                        : "bg-[#F0EEFF]/75 text-[#3B4058] hover:bg-[#F0EEFF] hover:text-[#141726]"
                    }`}
                  >
                    {topic.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <select
              aria-label="Proficiency level"
              value={level}
              onChange={(e) => setLevel(e.target.value as ProficiencyLevel)}
              className="rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] px-3 py-2 text-xs font-semibold text-[#141726] focus:border-[#635BDB] focus:outline-none cursor-pointer"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Interview Ready</option>
            </select>

            {interactionMode === "text" && (
              <>
                <span className="rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] px-3 py-2 font-mono text-xs font-semibold text-[#4B5166] tabular-nums">
                  {formatTimer(elapsedSeconds)}
                </span>

                <button
                  type="button"
                  onClick={handleCompleteAndSaveSession}
                  disabled={userTurns.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#19B5A5] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#149A8C] disabled:opacity-45 whitespace-nowrap cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Session
                </button>

                <button
                  type="button"
                  onClick={handleResetConversation}
                  aria-label="Reset conversation"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E8F0] bg-white px-3 py-2 text-xs font-medium text-[#4B5166] hover:bg-[#F8F9FC] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {sessionSavedNotice && interactionMode === "text" && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#E8F8F6] px-3.5 py-2.5 text-xs font-semibold text-[#0F766E]">
            <CheckCircle2 className="h-4 w-4 text-[#19B5A5]" />
            <span>
              Session saved! Your Dashboard stats, weekly minutes, and Learning Progress have been
              updated.
            </span>
          </div>
        )}
      </section>

      {interactionMode === "live-voice" ? (
        <LiveVoicePracticePanel
          user={user}
          mode={activeTopicConfig.mode}
          level={level}
          geminiConfigured={geminiConfigured}
          onSessionSaved={onSessionSaved}
        />
      ) : (
      /* Main Split Workspace: Interactive Chat (Left) + Grammar & Vocabulary Panels (Right) */
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Chat Thread & Composer */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-[#E6E8F0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.03)] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#E6E8F0] px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-[#141726]">
                {selectedTopic} · {formatLevelLabel(level)}
              </h2>
              <p className="text-xs text-[#6C728A]">{activeTopicConfig.description}</p>
            </div>
            <span className="font-mono text-xs text-[#6C728A] tabular-nums whitespace-nowrap">
              {userTurns.length} {userTurns.length === 1 ? "reply" : "replies"}
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8F9FC]/60 p-5" style={{ minHeight: "380px", maxHeight: "520px" }}>
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? "rounded-tr-md bg-[#635BDB] text-white"
                        : "rounded-tl-md border border-[#E6E8F0] bg-white text-[#141726] shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span
                        className={`text-[11px] font-semibold ${
                          isUser ? "text-white/80" : "text-[#635BDB]"
                        }`}
                      >
                        {isUser ? user.name.split(" ")[0] : "SpeakMate AI"}
                      </span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => speakText(msg.text)}
                          aria-label="Listen to AI response"
                          className="text-[#6C728A] transition-colors hover:text-[#635BDB] cursor-pointer"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p>{msg.text}</p>
                    {!isUser && msg.encouragement && (
                      <p className="mt-2 border-t border-[#E6E8F0] pt-2 text-xs text-[#0F766E]">
                        {msg.encouragement}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {loadingReply && (
              <div className="flex items-start">
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-[#E6E8F0] bg-white px-4 py-3 text-xs font-medium text-[#6C728A]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#635BDB]" />
                  <span>SpeakMate AI is reviewing your response...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Starter Prompts for Quick Practice */}
          <div className="border-t border-[#E6E8F0] bg-white px-5 pt-3">
            <p className="text-[11px] font-semibold text-[#6C728A]">Try saying:</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 pb-2">
              {activeTopicConfig.starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={loadingReply}
                  className="rounded-lg border border-[#E6E8F0] bg-[#F8F9FC] px-2.5 py-1 text-left text-xs text-[#4B5166] transition-colors hover:border-[#635BDB]/40 hover:bg-[#F0EEFF]/60 hover:text-[#141726] disabled:opacity-50 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-[#E6E8F0] bg-white p-4"
          >
            {micError && (
              <p className="mb-2 text-xs text-red-600">{micError}</p>
            )}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void toggleMicRecording()}
                disabled={isTranscribing || loadingReply}
                title={isRecording ? "Stop recording" : "Speak using microphone"}
                aria-label={isRecording ? "Stop recording" : "Speak using microphone"}
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                  isRecording
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-[#E6E8F0] bg-[#F8F9FC] text-[#4B5166] hover:border-[#635BDB]/40 hover:text-[#635BDB]"
                }`}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#635BDB]" />
                ) : isRecording ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Type your response about ${selectedTopic.toLowerCase()}...`}
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] px-4 text-sm text-[#141726] placeholder:text-[#9CA3AF] focus:border-[#635BDB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || loadingReply}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#635BDB] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#5249C9] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>Send</span>
              </button>
            </div>
          </form>
        </section>

        {/* Right: Grammar Correction Panel + Vocabulary Suggestion Card */}
        <aside className="space-y-6 lg:col-span-5">
          {/* Grammar Correction Panel */}
          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)] sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F8F6] text-[#0F766E]">
                  <CheckCircle2 className="h-4 w-4 text-[#19B5A5]" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#141726]">Grammar Correction</h2>
                  <p className="text-xs text-[#6C728A]">
                    {hasUserChatted ? "Live feedback on your latest reply" : "Sample coaching card"}
                  </p>
                </div>
              </div>
              {activeCorrection && (
                <span className="text-xs font-semibold text-[#635BDB]">
                  {activeCorrection.category}
                </span>
              )}
            </div>

            {lastTurnClean && !activeCorrection ? (
              <div className="mt-5 rounded-xl border border-[#19B5A5]/30 bg-[#E8F8F6]/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0F766E]">
                  <CheckCircle2 className="h-4 w-4 text-[#19B5A5]" />
                  <span>Great grammar — no errors detected!</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#4B5166]">
                  Your sentence read naturally and accurately. Keep practicing longer answers or
                  incorporate the vocabulary suggestion below.
                </p>
              </div>
            ) : activeCorrection ? (
              <div className="mt-5 space-y-3.5">
                <div className="rounded-xl bg-[#FEF2F2]/75 px-4 py-3">
                  <p className="text-[11px] font-semibold text-red-700">Original Input</p>
                  <p className="mt-1 text-sm text-[#4B5166] line-through">
                    &ldquo;{activeCorrection.original}&rdquo;
                  </p>
                </div>

                <div className="rounded-xl bg-[#E8F8F6]/80 px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#0F766E]">Corrected Version</p>
                  <p className="mt-1 text-sm font-semibold text-[#141726]">
                    &ldquo;{activeCorrection.corrected}&rdquo;
                  </p>
                </div>

                <div className="rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#635BDB]">Explanation</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4B5166]">
                    {activeCorrection.explanation}
                  </p>
                </div>
              </div>
            ) : null}

            {sessionCorrections.length > 1 && (
              <div className="mt-4 border-t border-[#E6E8F0] pt-3 text-xs text-[#6C728A]">
                <span className="font-mono font-semibold text-[#141726] tabular-nums">
                  {sessionCorrections.length}
                </span>{" "}
                corrections reviewed in this session — click <span className="font-semibold text-[#141726]">Save Session</span> to log them to your analytics.
              </div>
            )}
          </div>

          {/* Vocabulary Suggestion Card */}
          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)] sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#635BDB]">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#141726]">Vocabulary Suggestion</h2>
                  <p className="text-xs text-[#6C728A]">Tailored to {selectedTopic}</p>
                </div>
              </div>
              <Sparkles className="h-4 w-4 text-[#635BDB]" />
            </div>

            <div className="mt-5 rounded-xl bg-[#F0EEFF]/60 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-bold text-[#141726]">{activeVocab.word}</h3>
                <span className="text-xs font-medium italic text-[#635BDB]">
                  {activeVocab.partOfSpeech ?? "vocabulary"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#374151]">{activeVocab.meaning}</p>
              <div className="mt-3 border-t border-[#635BDB]/15 pt-2.5">
                <p className="text-[11px] font-semibold text-[#6C728A]">Example sentence</p>
                <p className="mt-1 text-xs italic leading-relaxed text-[#141726]">
                  &ldquo;{activeVocab.example}&rdquo;
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onToggleLearnedWord(activeVocab)}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  isCurrentVocabSaved
                    ? "bg-[#E8F8F6] text-[#0F766E] border border-[#19B5A5]/40"
                    : "bg-[#635BDB] text-white hover:bg-[#5249C9]"
                }`}
              >
                {isCurrentVocabSaved ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 text-[#19B5A5]" />
                    <span>Marked as Learned</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-4 w-4" />
                    <span>Mark as Learned</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const pool = TOPIC_VOCAB_POOL[selectedTopic];
                  const idx = pool.findIndex(
                    (w) => w.word.toLowerCase() === activeVocab.word.toLowerCase()
                  );
                  setActiveVocab(pool[(idx + 1) % pool.length]);
                }}
                className="rounded-xl border border-[#E6E8F0] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#4B5166] transition-colors hover:bg-[#F8F9FC] hover:text-[#141726] whitespace-nowrap cursor-pointer"
              >
                Next Word
              </button>
            </div>
          </div>
        </aside>
      </div>
      )}
    </div>
  );
}
