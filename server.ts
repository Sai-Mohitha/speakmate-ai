import "dotenv/config";
import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, type WebSocket } from "ws";
import { GoogleGenAI, Modality, Type, type LiveServerMessage } from "@google/genai";
import { requireAuth, type AuthRequest } from "./src/middleware/auth.ts";
import {
  clearSqlChatMessages,
  createSqlChatMessage,
  createSqlMentorshipBooking,
  createSqlPracticeSession,
  deleteSqlMentorshipBooking,
  getUserWorkspaceFromSql,
  updateSqlUserProfile,
} from "./src/db/users.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DEFAULT_COACH_MODEL = "gemini-4-hydrogen";

const ALLOWED_MODES = [
  "Friendly Conversation",
  "HR Interview Practice",
  "Technical Interview Practice",
  "Public Speaking Practice",
  "Professional Workplace Communication",
] as const;

const ALLOWED_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const ALLOWED_LIVE_VOICES = ["Zephyr", "Kore", "Puck", "Charon", "Fenrir"] as const;
const ALLOWED_CHAT_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.1-flash-lite",
  "gemini-4-neon",
  "gemini-4-carbon",
] as const;
const ALLOWED_AUDIO_MIMES = [
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
] as const;
const ALLOWED_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;

type PracticeMode = (typeof ALLOWED_MODES)[number];
type ProficiencyLevel = (typeof ALLOWED_LEVELS)[number];
type ChatModelId = (typeof ALLOWED_CHAT_MODELS)[number];

interface IncomingTurn {
  role: "user" | "model";
  text: string;
}

const MODE_INSTRUCTIONS: Record<PracticeMode, string> = {
  "Friendly Conversation":
    "Conduct a warm, everyday English conversation on practical daily life, travel, study routines, or hobbies. Keep the dialogue natural and engaging with open-ended follow-up questions.",
  "HR Interview Practice":
    "Act as a professional, encouraging HR interviewer. Ask realistic behavioral and career motivation questions (such as strengths, teamwork, conflict resolution, and career goals) one at a time, and coach the learner toward structured STAR-method answers.",
  "Technical Interview Practice":
    "Act as a constructive technical interviewer. Help the learner clearly explain technical projects, system trade-offs, debugging steps, and problem-solving logic in clear, concise professional English.",
  "Public Speaking Practice":
    "Act as a public speaking and presentation coach. Prompt the learner to deliver short spoken segments (openings, transitions, persuasive points, Q&A answers) and coach them on clarity, pacing, signposting, and audience engagement.",
  "Professional Workplace Communication":
    "Simulate practical workplace scenarios such as team standups, stakeholder updates, polite disagreement, writing/stating clear action items, and cross-functional collaboration.",
};

const LEVEL_INSTRUCTIONS: Record<ProficiencyLevel, string> = {
  Beginner:
    "Use clear, simple sentences and everyday vocabulary. Keep responses concise (2-4 sentences). Offer gentle, foundational grammar tips and easy-to-remember phrases.",
  Intermediate:
    "Use natural conversational English with moderately varied vocabulary and common workplace idioms. Focus on improving sentence flow, tense accuracy, articles, prepositions, and natural phrasing.",
  Advanced:
    "Use nuanced, fluent professional English. Focus on precision, executive conciseness, diplomatic phrasing, tone calibration, and idiomatic polish.",
};

const CHAT_PERSONA_INSTRUCTIONS: Record<string, string> = {
  "Career & Interview Advisor":
    "You are an expert English career communication and interview advisor on SpeakMate AI. Help learners prepare crisp behavioral/technical answers, research real companies or industry trends when Search is enabled, and sharpen professional tone.",
  "Current Events Discussion Coach":
    "You are an engaging English discussion coach on SpeakMate AI. Discuss current global, technology, science, and workplace topics using up-to-date facts, teach relevant vocabulary, and ask thoughtful speaking prompts.",
  "Grammar & Writing Strategist":
    "You are a clear, encouraging English grammar and professional writing strategist on SpeakMate AI. Break down sentence clarity, email structure, nuance, and grammar rules with concise side-by-side rewrites.",
  "Executive Communication Mentor":
    "You are an executive presentation and leadership communication mentor on SpeakMate AI. Coach learners on persuasive storytelling, structured briefings, stakeholder alignment, and diplomatic phrasing.",
};

const BASE_COACH_ROLE =
  "You are SpeakMate AI, a friendly and professional English communication coach. Help students and working professionals improve their English through natural conversations. Adapt your language to the learner's proficiency level. Correct mistakes politely, explain why a correction is needed, suggest natural alternatives, and encourage continuous practice. Focus on practical everyday, academic and workplace communication.";

function getConfiguredApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === "MY_GEMINI_API_KEY" || key === "your_gemini_api_key_here") {
    return null;
  }
  return key;
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isValidMode(value: unknown): value is PracticeMode {
  return typeof value === "string" && (ALLOWED_MODES as readonly string[]).includes(value);
}

function isValidLevel(value: unknown): value is ProficiencyLevel {
  return typeof value === "string" && (ALLOWED_LEVELS as readonly string[]).includes(value);
}

function isValidChatModel(value: unknown): value is ChatModelId {
  return typeof value === "string" && (ALLOWED_CHAT_MODELS as readonly string[]).includes(value);
}

function sanitizeHistory(raw: unknown): IncomingTurn[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const cleaned: IncomingTurn[] = [];
  for (const item of raw.slice(-24)) {
    if (
      item &&
      typeof item === "object" &&
      "role" in item &&
      "text" in item &&
      (item.role === "user" || item.role === "model") &&
      typeof item.text === "string"
    ) {
      const text = item.text.trim().slice(0, 4000);
      if (text.length > 0) {
        cleaned.push({ role: item.role, text });
      }
    }
  }
  return cleaned;
}

function isSafeHttpUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// Simple in-memory rate limiter (60 AI requests per 10 minutes per IP)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 60;
  const entry = rateBuckets.get(ip);
  if (!entry || now > entry.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

async function callWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: number }).status)
          : undefined;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

function mapGeminiError(
  err: unknown,
  paidModelHint = false
): { status: number; code: string; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: number }).status)
      : undefined;

  if (
    status === 403 ||
    rawMessage.includes("PERMISSION_DENIED") ||
    rawMessage.includes("API_KEY_INVALID")
  ) {
    return {
      status: 503,
      code: "API_KEY_INVALID",
      message: paidModelHint
        ? "This model requires a billing-enabled Gemini API key. You can select one in Settings > Secrets."
        : "The server Gemini API key is invalid or lacks permission. Please verify GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (status === 429 || rawMessage.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      code: "RATE_LIMITED",
      message: paidModelHint
        ? "Quota reached or billing-enabled API key required for this model. Select a paid-tier API key in Settings > Secrets or try again later."
        : "The Gemini API quota is temporarily exhausted. Please wait a moment before sending another request.",
    };
  }
  if (status === 404 || rawMessage.includes("NOT_FOUND")) {
    return {
      status: 502,
      code: "MODEL_UNAVAILABLE",
      message: "The requested Gemini model is currently unavailable for this API key.",
    };
  }
  return {
    status: 502,
    code: "AI_SERVICE_ERROR",
    message: "Unable to reach SpeakMate AI right now. Please try again in a moment.",
  };
}

async function startServer() {
  const app = express();
  app.set("trust proxy", true);

  // Larger body limit only on media/audio routes; 250kb default elsewhere
  const standardJson = express.json({ limit: "250kb" });
  const mediaJson = express.json({ limit: "15mb" });

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      geminiConfigured: getConfiguredApiKey() !== null,
      model: DEFAULT_COACH_MODEL,
      capabilities: {
        liveVoice: "gemini-3.8-live",
        transcription: "gemini-3.5-transcribe",
        searchGrounding: "gemini-4-hydrogen",
        fastChat: "gemini-3.1-flash-lite",
        videoInteractions: "gemini-omni-1.2-flash",
        music: "lyria-3-clip-preview",
      },
    });
  });

  // Cloud SQL (PostgreSQL) Authenticated Workspace Routes
  const isValidRecordId = (val: unknown): val is string =>
    typeof val === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(val);

  app.get("/api/db/workspace", requireAuth, async (req: AuthRequest, res) => {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const workspace = await getUserWorkspaceFromSql({
        uid,
        email,
        name: typeof req.user?.name === "string" ? req.user.name : undefined,
        photoUrl: typeof req.user?.picture === "string" ? req.user.picture : null,
      });
      res.json(workspace);
    } catch (error) {
      console.error("Workspace load failed:", error);
      res.status(500).json({ error: "Failed to load account data." });
    }
  });

  app.put("/api/db/profile", requireAuth, standardJson, async (req: AuthRequest, res) => {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body ?? {};
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const role = body.role === "Working Professional" ? "Working Professional" : "Student";
    const proficiencyLevel = isValidLevel(body.proficiencyLevel)
      ? body.proficiencyLevel
      : "Intermediate";
    const preferredMode = isValidMode(body.preferredMode)
      ? body.preferredMode
      : "Friendly Conversation";
    const dailyGoalMinutes = Number.isInteger(body.dailyGoalMinutes)
      ? Math.min(180, Math.max(5, body.dailyGoalMinutes))
      : 15;
    const preferredAvailability =
      typeof body.preferredAvailability === "string" && body.preferredAvailability.trim()
        ? body.preferredAvailability.trim().slice(0, 80)
        : "Weekday Evenings";
    const communicationGoals = Array.isArray(body.communicationGoals)
      ? body.communicationGoals
          .filter((g: unknown): g is string => typeof g === "string" && g.trim().length > 0)
          .slice(0, 10)
          .map((g: string) => g.trim().slice(0, 120))
      : [];

    if (name.length < 2) {
      res.status(400).json({ error: "Name must be at least 2 characters." });
      return;
    }

    try {
      const updated = await updateSqlUserProfile(uid, email, {
        name,
        role,
        proficiencyLevel,
        communicationGoals,
        preferredMode,
        dailyGoalMinutes,
        preferredAvailability,
      });
      res.json(updated);
    } catch (error) {
      console.error("Profile update failed:", error);
      res.status(500).json({ error: "Failed to update profile." });
    }
  });

  app.post("/api/db/sessions", requireAuth, standardJson, async (req: AuthRequest, res) => {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body ?? {};
    if (!isValidRecordId(body.id) || !isValidMode(body.mode) || !isValidLevel(body.level)) {
      res.status(400).json({ error: "Invalid practice session payload." });
      return;
    }

    const startedAt =
      typeof body.startedAt === "string" && body.startedAt.length >= 10
        ? body.startedAt.slice(0, 64)
        : new Date().toISOString();
    const endedAt =
      typeof body.endedAt === "string" && body.endedAt.length >= 10
        ? body.endedAt.slice(0, 64)
        : new Date().toISOString();
    const durationMinutes =
      typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes)
        ? Math.max(0, Math.min(600, Math.round(body.durationMinutes)))
        : 0;
    const messageCount =
      typeof body.messageCount === "number" && Number.isFinite(body.messageCount)
        ? Math.max(0, Math.min(500, Math.round(body.messageCount)))
        : 0;

    try {
      const saved = await createSqlPracticeSession(uid, email, {
        id: body.id,
        userId: uid,
        mode: body.mode,
        level: body.level,
        startedAt,
        endedAt,
        durationMinutes,
        messageCount,
        corrections: Array.isArray(body.corrections) ? body.corrections.slice(0, 50) : [],
        vocabularyLearned: Array.isArray(body.vocabularyLearned)
          ? body.vocabularyLearned.slice(0, 50)
          : [],
        summary: body.summary && typeof body.summary === "object" ? body.summary : undefined,
      });
      res.status(201).json(saved);
    } catch (error) {
      console.error("Save session failed:", error);
      res.status(500).json({ error: "Failed to save practice session." });
    }
  });

  app.post("/api/db/bookings", requireAuth, standardJson, async (req: AuthRequest, res) => {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body ?? {};
    const purpose = typeof body.sessionPurpose === "string" ? body.sessionPurpose.trim() : "";
    if (
      !isValidRecordId(body.id) ||
      !isValidRecordId(body.coachId) ||
      typeof body.coachName !== "string" ||
      typeof body.coachExpertise !== "string" ||
      typeof body.preferredDate !== "string" ||
      typeof body.preferredTime !== "string" ||
      purpose.length < 8
    ) {
      res.status(400).json({ error: "Invalid mentorship booking payload." });
      return;
    }

    try {
      const saved = await createSqlMentorshipBooking(uid, email, {
        id: body.id,
        userId: uid,
        coachId: body.coachId,
        coachName: body.coachName.trim().slice(0, 100),
        coachExpertise: body.coachExpertise.trim().slice(0, 160),
        preferredDate: body.preferredDate.trim().slice(0, 20),
        preferredTime: body.preferredTime.trim().slice(0, 30),
        sessionPurpose: purpose.slice(0, 600),
        createdAt: new Date().toISOString(),
        status: "Demo Request Saved",
        isDemoBooking: true,
      });
      res.status(201).json(saved);
    } catch (error) {
      console.error("Save booking failed:", error);
      res.status(500).json({ error: "Failed to save booking." });
    }
  });

  app.delete("/api/db/bookings/:id", requireAuth, async (req: AuthRequest, res) => {
    const uid = req.user?.uid;
    const bookingId = req.params.id;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!isValidRecordId(bookingId)) {
      res.status(400).json({ error: "Invalid booking ID." });
      return;
    }

    try {
      await deleteSqlMentorshipBooking(uid, bookingId);
      res.json({ deleted: true });
    } catch (error) {
      console.error("Delete booking failed:", error);
      res.status(500).json({ error: "Failed to cancel booking." });
    }
  });

  app.post("/api/db/chat-messages", requireAuth, standardJson, async (req: AuthRequest, res) => {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body ?? {};
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (
      !isValidRecordId(body.id) ||
      (body.role !== "user" && body.role !== "model") ||
      text.length === 0 ||
      text.length > 8000 ||
      typeof body.persona !== "string" ||
      typeof body.modelUsed !== "string"
    ) {
      res.status(400).json({ error: "Invalid chat message payload." });
      return;
    }

    try {
      const saved = await createSqlChatMessage(uid, email, {
        id: body.id,
        userId: uid,
        role: body.role,
        text,
        persona: body.persona.trim().slice(0, 80),
        modelUsed: body.modelUsed.trim().slice(0, 80),
        sources: Array.isArray(body.sources) ? body.sources.slice(0, 15) : [],
        createdAt: new Date().toISOString(),
      });
      res.status(201).json(saved);
    } catch (error) {
      console.error("Save chat message failed:", error);
      res.status(500).json({ error: "Failed to save chat message." });
    }
  });

  app.delete("/api/db/chat-messages", requireAuth, async (req: AuthRequest, res) => {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      await clearSqlChatMessages(uid);
      res.json({ cleared: true });
    } catch (error) {
      console.error("Clear chat messages failed:", error);
      res.status(500).json({ error: "Failed to clear chat history." });
    }
  });

  // 1. Structured AI English Practice Coach
  app.post("/api/practice/chat", standardJson, async (req, res) => {
    const clientIp = req.ip || "local";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        code: "TOO_MANY_REQUESTS",
        message: "You have sent too many requests in a short period. Please pause briefly.",
      });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: "GEMINI_NOT_CONFIGURED",
        message:
          "Gemini API is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable live AI English practice.",
      });
      return;
    }

    const { mode, level, message, history, userName, isStarter } = req.body ?? {};
    if (!isValidMode(mode)) {
      res.status(400).json({ code: "INVALID_MODE", message: "Please select a valid practice mode." });
      return;
    }
    if (!isValidLevel(level)) {
      res.status(400).json({ code: "INVALID_LEVEL", message: "Please select a valid proficiency level." });
      return;
    }

    const starterFlag = Boolean(isStarter);
    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    if (!starterFlag && (trimmedMessage.length === 0 || trimmedMessage.length > 2000)) {
      res.status(400).json({
        code: "INVALID_MESSAGE",
        message: "Message must be between 1 and 2000 characters.",
      });
      return;
    }

    const safeName =
      typeof userName === "string" && userName.trim().length > 0
        ? userName.trim().slice(0, 60)
        : "Learner";

    const cleanedHistory = sanitizeHistory(history);

    const systemInstruction = [
      BASE_COACH_ROLE,
      `Learner Name: ${safeName}.`,
      `Practice Mode: ${mode}. ${MODE_INSTRUCTIONS[mode]}`,
      `Proficiency Level: ${level}. ${LEVEL_INSTRUCTIONS[level]}`,
      "Always return valid JSON matching the requested schema.",
      "Rules for coaching fields:",
      "- reply: Your natural conversational response that continues the dialogue and asks an engaging follow-up question.",
      "- hasGrammarIssue: Set to true ONLY if the learner's latest message has a clear grammar, verb tense, article, preposition, or sentence structure mistake. If it is a starter turn or the learner's English is grammatically solid, set hasGrammarIssue to false and leave grammarCorrection fields empty strings.",
      "- grammarCorrection: When hasGrammarIssue is true, provide original, corrected, explanation (1 sentence), and category (e.g., 'Verb Tense', 'Article Usage', 'Prepositions', 'Subject-Verb Agreement', 'Word Order', or 'Sentence Structure').",
      "- naturalAlternative: Provide one smoother, more natural way a fluent speaker would express the learner's last idea (empty string on starter turns).",
      "- vocabularyTip: Include one practical, level-appropriate word or phrase relevant to this conversation topic with meaning and a realistic example sentence.",
      "- encouragement: A brief, warm 1-sentence encouragement to keep speaking.",
    ].join("\n\n");

    const contents = cleanedHistory.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    }));

    if (starterFlag) {
      contents.push({
        role: "user",
        parts: [
          {
            text: `Start a new ${mode} practice session with ${safeName} at the ${level} level. Greet them warmly by name, briefly set the scenario, and ask the opening question.`,
          },
        ],
      });
    } else {
      contents.push({
        role: "user",
        parts: [{ text: trimmedMessage }],
      });
    }

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: DEFAULT_COACH_MODEL,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                hasGrammarIssue: { type: Type.BOOLEAN },
                grammarCorrection: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    corrected: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                  required: ["original", "corrected", "explanation", "category"],
                },
                naturalAlternative: { type: Type.STRING },
                vocabularyTip: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                    example: { type: Type.STRING },
                  },
                  required: ["word", "meaning", "example"],
                },
                encouragement: { type: Type.STRING },
              },
              required: [
                "reply",
                "hasGrammarIssue",
                "grammarCorrection",
                "naturalAlternative",
                "vocabularyTip",
                "encouragement",
              ],
            },
          },
        })
      );

      const rawText = (response.text ?? "").trim();
      if (!rawText) {
        res.status(502).json({
          code: "EMPTY_RESPONSE",
          message: "SpeakMate AI returned an empty response. Please try again.",
        });
        return;
      }
      res.json(JSON.parse(rawText));
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ code: mapped.code, message: mapped.message });
    }
  });

  // 2. Post-Session Coaching Summary
  app.post("/api/practice/summary", standardJson, async (req, res) => {
    const clientIp = req.ip || "local";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ code: "TOO_MANY_REQUESTS", message: "Rate limit reached." });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: "GEMINI_NOT_CONFIGURED",
        message: "Gemini API is not configured on the server.",
      });
      return;
    }

    const { mode, level, transcript } = req.body ?? {};
    if (!isValidMode(mode) || !isValidLevel(level)) {
      res.status(400).json({ code: "INVALID_PARAMS", message: "Invalid practice mode or level." });
      return;
    }

    const cleanedTranscript = sanitizeHistory(transcript);
    if (cleanedTranscript.length === 0) {
      res.status(400).json({ code: "EMPTY_TRANSCRIPT", message: "No conversation turns found." });
      return;
    }

    const formattedTranscript = cleanedTranscript
      .map((t) => `${t.role === "user" ? "Learner" : "Coach"}: ${t.text}`)
      .join("\n");

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: DEFAULT_COACH_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Review this ${level}-level ${mode} English practice session and return a concise, honest coaching summary grounded strictly in what the learner wrote.\n\nTranscript:\n${formattedTranscript}`,
                },
              ],
            },
          ],
          config: {
            systemInstruction:
              "You are SpeakMate AI. Provide an encouraging, specific post-session English communication summary grounded only in the transcript provided. Do not invent mistakes or numerical confidence scores.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overview: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                focusAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedNextStep: { type: Type.STRING },
              },
              required: ["overview", "strengths", "focusAreas", "recommendedNextStep"],
            },
          },
        })
      );

      res.json(JSON.parse((response.text ?? "").trim()));
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ code: mapped.code, message: mapped.message });
    }
  });

  // 3. Multi-Turn Gemini Chatbot + Google Search Grounding (gemini-4-hydrogen / gemini-3.1-flash-lite / gemini-4-neon / gemini-4-carbon)
  app.post("/api/chatbot/message", standardJson, async (req, res) => {
    const clientIp = req.ip || "local";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ code: "TOO_MANY_REQUESTS", message: "Rate limit reached. Please pause briefly." });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: "GEMINI_NOT_CONFIGURED",
        message: "Gemini API is not configured on the server.",
      });
      return;
    }

    const { message, history, persona, model, useSearch, level, userName } = req.body ?? {};
    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    if (!trimmedMessage || trimmedMessage.length > 3000) {
      res.status(400).json({
        code: "INVALID_MESSAGE",
        message: "Message must be between 1 and 3000 characters.",
      });
      return;
    }

    const selectedModel: ChatModelId = isValidChatModel(model) ? model : "gemini-4-hydrogen";
    const enableSearch = Boolean(useSearch) && selectedModel === "gemini-4-hydrogen";
    const safePersona =
      typeof persona === "string" && persona in CHAT_PERSONA_INSTRUCTIONS
        ? persona
        : "Career & Interview Advisor";
    const safeLevel: ProficiencyLevel = isValidLevel(level) ? level : "Intermediate";
    const safeName =
      typeof userName === "string" && userName.trim().length > 0
        ? userName.trim().slice(0, 60)
        : "Learner";

    const cleanedHistory = sanitizeHistory(history);
    const contents = [
      ...cleanedHistory.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      })),
      {
        role: "user",
        parts: [{ text: trimmedMessage }],
      },
    ];

    const systemInstruction = [
      CHAT_PERSONA_INSTRUCTIONS[safePersona],
      `Learner Name: ${safeName}. Adapt vocabulary and explanation depth to ${safeLevel} English proficiency.`,
      enableSearch
        ? "When answering questions involving current events, companies, technologies, or real-world facts, use Google Search grounding to provide up-to-date, accurate answers."
        : "Keep explanations clear, practical, and easy to read.",
    ].join("\n\n");

    const isPaidModel = selectedModel === "gemini-4-neon" || selectedModel === "gemini-4-carbon";

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: selectedModel,
          contents,
          config: {
            systemInstruction,
            ...(enableSearch ? { tools: [{ googleSearch: {} }] } : {}),
          },
        })
      );

      const reply = (response.text ?? "").trim();
      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources: { title: string; uri: string }[] = [];
      const seenUris = new Set<string>();
      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (isSafeHttpUrl(uri) && !seenUris.has(uri)) {
          seenUris.add(uri);
          sources.push({
            title: typeof title === "string" && title.trim() ? title.trim().slice(0, 140) : uri,
            uri,
          });
        }
      }

      res.json({
        reply: reply || "I could not generate a reply for that prompt. Please try rephrasing.",
        sources: sources.slice(0, 10),
        modelUsed: selectedModel,
        searchGrounded: enableSearch && sources.length > 0,
      });
    } catch (err) {
      const mapped = mapGeminiError(err, isPaidModel);
      res.status(mapped.status).json({ code: mapped.code, message: mapped.message });
    }
  });

  // 4. Audio Transcription Endpoint (gemini-3.5-transcribe)
  app.post("/api/audio/transcribe", mediaJson, async (req, res) => {
    const clientIp = req.ip || "local";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ code: "TOO_MANY_REQUESTS", message: "Rate limit reached." });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: "GEMINI_NOT_CONFIGURED",
        message: "Gemini API is not configured on the server.",
      });
      return;
    }

    const { audioBase64, mimeType } = req.body ?? {};
    if (typeof audioBase64 !== "string" || audioBase64.length < 32 || audioBase64.length > 12_000_000) {
      res.status(400).json({
        code: "INVALID_AUDIO",
        message: "Please record a valid audio clip (under 9 MB).",
      });
      return;
    }

    const normalizedMime =
      typeof mimeType === "string" &&
      (ALLOWED_AUDIO_MIMES as readonly string[]).includes(mimeType.toLowerCase())
        ? mimeType.toLowerCase().split(";")[0]
        : "audio/webm";

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.5-transcribe",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: normalizedMime,
                  data: audioBase64,
                },
              },
              {
                text: "Transcribe this spoken English audio accurately. Return only the clean transcript text without extra commentary.",
              },
            ],
          },
        })
      );

      res.json({
        transcript: (response.text ?? "").trim(),
        modelUsed: "gemini-3.5-transcribe",
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ code: mapped.code, message: mapped.message });
    }
  });

  // 5. Video Generation (Text-to-Video & Image-to-Video) via Interactions API (gemini-omni-1.2-flash)
  app.post("/api/media/video", mediaJson, async (req, res) => {
    const clientIp = req.ip || "local";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ code: "TOO_MANY_REQUESTS", message: "Rate limit reached." });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: "GEMINI_NOT_CONFIGURED",
        message: "Gemini API is not configured on the server.",
      });
      return;
    }

    const { prompt, aspectRatio, imageBase64, imageMimeType } = req.body ?? {};
    const trimmedPrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!trimmedPrompt || trimmedPrompt.length > 1000) {
      res.status(400).json({
        code: "INVALID_PROMPT",
        message: "Please provide a video prompt between 1 and 1000 characters.",
      });
      return;
    }

    const safeAspect: "16:9" | "9:16" = aspectRatio === "9:16" ? "9:16" : "16:9";
    const hasImage = typeof imageBase64 === "string" && imageBase64.length > 64;

    if (hasImage && imageBase64.length > 10_000_000) {
      res.status(400).json({
        code: "IMAGE_TOO_LARGE",
        message: "Uploaded image must be under 7 MB.",
      });
      return;
    }

    const safeImageMime =
      typeof imageMimeType === "string" &&
      (ALLOWED_IMAGE_MIMES as readonly string[]).includes(imageMimeType.toLowerCase())
        ? imageMimeType.toLowerCase()
        : "image/png";

    try {
      const interaction = await ai.interactions.create(
        {
          model: "gemini-omni-1.2-flash",
          input: hasImage
            ? [
                {
                  type: "image",
                  mime_type: safeImageMime,
                  data: imageBase64,
                },
                {
                  type: "text",
                  text: trimmedPrompt,
                },
              ]
            : trimmedPrompt,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: "video",
            aspect_ratio: safeAspect,
            duration: "6s",
            resolution: "720p",
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart?.data) {
        res.status(502).json({
          code: "NO_VIDEO_OUTPUT",
          message: "The model did not return a video clip for this prompt.",
        });
        return;
      }

      const mime = videoPart.mime_type || "video/mp4";
      res.json({
        videoDataUrl: `data:${mime};base64,${videoPart.data}`,
        mimeType: mime,
        aspectRatio: safeAspect,
        modelUsed: "gemini-omni-1.2-flash",
      });
    } catch (err) {
      const mapped = mapGeminiError(err, true);
      res.status(mapped.status).json({ code: mapped.code, message: mapped.message });
    }
  });

  // 6. Music Generation (lyria-3-clip-preview / lyria-3-pro-preview)
  app.post("/api/media/music", standardJson, async (req, res) => {
    const clientIp = req.ip || "local";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ code: "TOO_MANY_REQUESTS", message: "Rate limit reached." });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        code: "GEMINI_NOT_CONFIGURED",
        message: "Gemini API is not configured on the server.",
      });
      return;
    }

    const { prompt, model } = req.body ?? {};
    const trimmedPrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!trimmedPrompt || trimmedPrompt.length > 800) {
      res.status(400).json({
        code: "INVALID_PROMPT",
        message: "Please provide a music prompt between 1 and 800 characters.",
      });
      return;
    }

    const selectedModel =
      model === "lyria-3-pro-preview" ? "lyria-3-pro-preview" : "lyria-3-clip-preview";

    try {
      const responseStream = await ai.models.generateContentStream({
        model: selectedModel,
        contents: trimmedPrompt,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = "";
      let mimeType = "audio/mpeg";

      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, "base64"));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        res.status(502).json({
          code: "NO_AUDIO_OUTPUT",
          message: "No audio data was returned by Lyria for this prompt.",
        });
        return;
      }

      const audioBase64 = Buffer.concat(audioChunks).toString("base64");
      res.json({
        audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
        mimeType,
        lyrics: lyrics.trim(),
        modelUsed: selectedModel,
      });
    } catch (err) {
      const mapped = mapGeminiError(err, true);
      res.status(mapped.status).json({ code: mapped.code, message: mapped.message });
    }
  });

  // Dev Vite middleware vs production static serving
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  // Create HTTP server & WebSocket bridge for Gemini Live API (/ws/live)
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024 });

  server.on("upgrade", (request, socket, head) => {
    const pathname = (request.url || "").split("?")[0];
    if (pathname === "/ws/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (clientWs: WebSocket) => {
    let liveSession: Awaited<ReturnType<GoogleGenAI["live"]["connect"]>> | null = null;
    let isClosing = false;

    const sendSafe = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    const closeSession = () => {
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // ignore close errors
        }
        liveSession = null;
      }
    };

    clientWs.on("message", async (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      if (msg.type === "start") {
        closeSession();
        const ai = createGeminiClient();
        if (!ai) {
          sendSafe({
            type: "error",
            message: "Gemini API key is not configured on the server.",
          });
          return;
        }

        const mode: PracticeMode = isValidMode(msg.mode) ? msg.mode : "Friendly Conversation";
        const level: ProficiencyLevel = isValidLevel(msg.level) ? msg.level : "Intermediate";
        const voiceName =
          typeof msg.voiceName === "string" &&
          (ALLOWED_LIVE_VOICES as readonly string[]).includes(msg.voiceName)
            ? msg.voiceName
            : "Zephyr";
        const safeName =
          typeof msg.userName === "string" && msg.userName.trim()
            ? msg.userName.trim().slice(0, 60)
            : "Learner";

        const liveInstruction = [
          BASE_COACH_ROLE,
          `You are having a live, real-time spoken voice conversation with ${safeName}.`,
          `Practice Mode: ${mode}. ${MODE_INSTRUCTIONS[mode]}`,
          `Proficiency Level: ${level}. ${LEVEL_INSTRUCTIONS[level]}`,
          "Keep each spoken response natural, warm, and concise (2 to 4 sentences) so the conversation flows back and forth smoothly. When the learner makes a noticeable grammar mistake, gently weave a polite correction and a natural phrasing tip into your spoken reply, then ask an encouraging follow-up question.",
        ].join("\n\n");

        try {
          liveSession = await ai.live.connect({
            model: "gemini-3.8-live",
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction: liveInstruction,
            },
            callbacks: {
              onopen: () => {
                sendSafe({ type: "ready", voiceName, mode, level });
              },
              onmessage: (message: LiveServerMessage) => {
                const content = message.serverContent;
                if (content?.interrupted) {
                  sendSafe({ type: "interrupted" });
                }
                if (content?.inputTranscription?.text) {
                  sendSafe({
                    type: "inputTranscript",
                    text: content.inputTranscription.text,
                  });
                }
                if (content?.outputTranscription?.text) {
                  sendSafe({
                    type: "outputTranscript",
                    text: content.outputTranscription.text,
                  });
                }
                for (const part of content?.modelTurn?.parts ?? []) {
                  if (part.inlineData?.data) {
                    sendSafe({ type: "audio", data: part.inlineData.data });
                  }
                }
                if (content?.turnComplete) {
                  sendSafe({ type: "turnComplete" });
                }
              },
              onerror: (event: unknown) => {
                if (!isClosing) {
                  const errMsg =
                    event instanceof Error ? event.message : "Live voice connection error.";
                  sendSafe({ type: "error", message: errMsg });
                }
              },
              onclose: () => {
                if (!isClosing) {
                  sendSafe({ type: "closed" });
                }
              },
            },
          });
        } catch (err) {
          const mapped = mapGeminiError(err);
          sendSafe({ type: "error", message: mapped.message });
        }
        return;
      }

      if (msg.type === "audio" && typeof msg.data === "string" && liveSession) {
        try {
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // ignore transient write errors on closed session
        }
        return;
      }

      if (msg.type === "text" && typeof msg.text === "string" && liveSession) {
        const cleanText = msg.text.trim().slice(0, 1000);
        if (cleanText) {
          try {
            liveSession.sendRealtimeInput({ text: cleanText });
          } catch {
            // ignore
          }
        }
        return;
      }

      if (msg.type === "stop") {
        closeSession();
        sendSafe({ type: "closed" });
      }
    });

    clientWs.on("close", () => {
      isClosing = true;
      closeSession();
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`SpeakMate AI server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start SpeakMate AI server:", err);
  process.exit(1);
});
