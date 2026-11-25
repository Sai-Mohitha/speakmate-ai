import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  MessageSquareText,
  TrendingUp,
} from "lucide-react";
import { formatLevelLabel } from "../data/demoData";
import type {
  AppView,
  PracticeSessionRecord,
  SpeakingTopic,
  VocabularyItem,
} from "../types";
import { computeUserAnalytics } from "../utils/storage";

interface ProgressAnalyticsPageProps {
  sessions: PracticeSessionRecord[];
  savedVocabulary: VocabularyItem[];
  onNavigate: (view: AppView) => void;
  onPracticeTopic?: (topic: SpeakingTopic) => void;
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const IMPROVEMENT_ADVICE: Record<
  string,
  { tip: string; recommendedTopic: SpeakingTopic }
> = {
  "Verb Tense": {
    tip: "Watch for finished time markers ('yesterday', 'last week') that call for simple past ('went', 'worked') and use 'for' with duration phrases.",
    recommendedTopic: "Daily Life",
  },
  Prepositions: {
    tip: "Omit 'about' after 'discuss' ('discussed the project') and always pair 'explain' with 'to' before a person ('explain to me').",
    recommendedTopic: "General Conversation",
  },
  "Subject-Verb Agreement": {
    tip: "In longer technical explanations, match singular nouns with '-s' verbs ('database has') and plural nouns with base verbs ('users connect').",
    recommendedTopic: "Technology",
  },
  "Articles & Determiners": {
    tip: "Use determiners ('a', 'the', 'our') before singular countable nouns and 'a lot of' with uncountable nouns like 'research' and 'feedback'.",
    recommendedTopic: "Job Interviews",
  },
};

export function ProgressAnalyticsPage({
  sessions,
  savedVocabulary,
  onNavigate,
  onPracticeTopic,
}: ProgressAnalyticsPageProps) {
  const analytics = computeUserAnalytics(sessions, savedVocabulary);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    sessions[0]?.id ?? null
  );

  const maxWeeklyMinutes = Math.max(
    25,
    ...analytics.weeklyActivity.map((day) => day.minutes)
  );
  const totalWeeklyMinutes = analytics.weeklyActivity.reduce((sum, d) => sum + d.minutes, 0);

  // Build SVG polyline points for Grammar Accuracy Progression
  const accuracySeries =
    analytics.accuracyHistory.length >= 2
      ? analytics.accuracyHistory
      : analytics.accuracyHistory.length === 1
        ? [
            { label: "Start", score: Math.max(68, analytics.accuracyHistory[0].score - 6) },
            analytics.accuracyHistory[0],
          ]
        : [];

  const svgWidth = 420;
  const svgHeight = 160;
  const padX = 28;
  const padY = 20;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  const points = accuracySeries.map((item, idx) => {
    const x =
      accuracySeries.length === 1
        ? padX + plotW / 2
        : padX + (idx / (accuracySeries.length - 1)) * plotW;
    const clamped = Math.max(50, Math.min(100, item.score));
    const y = padY + plotH - ((clamped - 50) / 50) * plotH;
    return { ...item, x, y };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  const improvementCards =
    analytics.grammarCategoryCounts.length > 0
      ? analytics.grammarCategoryCounts.slice(0, 3).map((item) => {
          const advice = IMPROVEMENT_ADVICE[item.category] ?? {
            tip: "Review your saved corrections in this area and practice 2–3 spoken sentences focusing on clean structure.",
            recommendedTopic: "General Conversation" as SpeakingTopic,
          };
          return {
            title: item.category,
            countLabel: `${item.count} ${item.count === 1 ? "note" : "notes"} logged`,
            tip: advice.tip,
            topic: advice.recommendedTopic,
          };
        })
      : [
          {
            title: "Past Tense Fluency",
            countLabel: "Recommended focus",
            tip: IMPROVEMENT_ADVICE["Verb Tense"].tip,
            topic: "Daily Life" as SpeakingTopic,
          },
          {
            title: "STAR Interview Storytelling",
            countLabel: "Recommended focus",
            tip: "Structure behavioral answers into Situation, Task, Action, and Result in under 90 seconds.",
            topic: "Job Interviews" as SpeakingTopic,
          },
          {
            title: "Technical Clarity",
            countLabel: "Recommended focus",
            tip: IMPROVEMENT_ADVICE["Subject-Verb Agreement"].tip,
            topic: "Technology" as SpeakingTopic,
          },
        ];

  if (sessions.length === 0 && savedVocabulary.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E6E8F0] bg-white p-10 text-center shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0EEFF] text-[#635BDB]">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[#141726]">
          No learning analytics recorded yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#4B5166]">
          Complete a conversation in AI Speaking Practice and save your session—or load sample
          student data from Settings—to populate your weekly charts, accuracy progression, and
          vocabulary bank.
        </p>
        <button
          type="button"
          onClick={() => onNavigate("ai-practice")}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#635BDB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5249C9] cursor-pointer"
        >
          Start Speaking Session
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top 4 Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
          <p className="text-xs font-medium text-[#6C728A]">Total Practice Minutes</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#141726] tabular-nums">
            {analytics.totalMinutes}{" "}
            <span className="font-sans text-sm font-normal text-[#6C728A]">min</span>
          </p>
          <p className="mt-1.5 text-xs font-semibold text-[#0F766E]">
            {analytics.totalSessions} sessions completed
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
          <p className="text-xs font-medium text-[#6C728A]">Grammar Accuracy</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#141726] tabular-nums">
            {analytics.totalSessions > 0 ? `${analytics.grammarAccuracy}%` : "—"}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
            <TrendingUp className="h-3.5 w-3.5 text-[#19B5A5]" />
            <span>Upward progression</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
          <p className="text-xs font-medium text-[#6C728A]">Vocabulary Count</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#141726] tabular-nums">
            {analytics.uniqueVocabulary.length}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-[#0F766E]">Saved &amp; learned terms</p>
        </div>

        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
          <p className="text-xs font-medium text-[#6C728A]">Streak Summary</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-[#141726] tabular-nums">
            {analytics.streakDays}{" "}
            <span className="font-sans text-sm font-normal text-[#6C728A]">
              {analytics.streakDays === 1 ? "day" : "days"}
            </span>
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
            <Flame className="h-3.5 w-3.5 text-[#19B5A5]" />
            <span>Consistent daily habit</span>
          </p>
        </div>
      </section>

      {/* Charts Row: Weekly Practice Minutes + Grammar Accuracy Progression */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Practice Minutes */}
        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)] lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#141726]">Weekly Practice Minutes</h2>
              <p className="text-xs text-[#6C728A]">Monday through Sunday speaking volume</p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#635BDB] tabular-nums">
              {totalWeeklyMinutes} min
            </span>
          </div>

          <div className="mt-6 flex h-48 items-end justify-between gap-3 border-b border-[#E6E8F0] pb-3 pt-4">
            {analytics.weeklyActivity.map((day) => {
              const heightPct =
                day.minutes > 0 ? Math.max(12, Math.round((day.minutes / maxWeeklyMinutes) * 100)) : 0;
              return (
                <div
                  key={day.dateKey}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="font-mono text-[11px] font-medium text-[#6C728A] tabular-nums">
                    {day.minutes > 0 ? `${day.minutes}m` : "0"}
                  </span>
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className={`w-full max-w-[34px] rounded-t-lg transition-all ${
                        day.minutes > 0 ? "bg-[#635BDB]" : "h-1.5 bg-[#ECEEF5]"
                      }`}
                      style={day.minutes > 0 ? { height: `${heightPct}%` } : undefined}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            {analytics.weeklyActivity.map((day) => (
              <span
                key={day.dateKey}
                className="flex-1 text-center text-xs font-medium text-[#6C728A]"
              >
                {day.dayLabel}
              </span>
            ))}
          </div>
        </div>

        {/* Grammar Accuracy Progression */}
        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)] lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#141726]">
                Grammar Accuracy Progression
              </h2>
              <p className="text-xs text-[#6C728A]">Accuracy score across your recent sessions</p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#0F766E] tabular-nums">
              Current: {analytics.grammarAccuracy}%
            </span>
          </div>

          {points.length > 0 ? (
            <div className="mt-5">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="h-44 w-full overflow-visible"
                role="img"
                aria-label="Grammar accuracy progression chart"
              >
                {[100, 75, 50].map((tick) => {
                  const y = padY + plotH - ((tick - 50) / 50) * plotH;
                  return (
                    <g key={tick}>
                      <line
                        x1={padX}
                        x2={svgWidth - padX}
                        y1={y}
                        y2={y}
                        stroke="#E6E8F0"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={0}
                        y={y + 4}
                        fill="#6C728A"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {tick}%
                      </text>
                    </g>
                  );
                })}

                <polyline
                  fill="none"
                  stroke="#635BDB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylineStr}
                />

                {points.map((pt, i) => (
                  <g key={`${pt.label}-${i}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="5"
                      fill="#19B5A5"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      fill="#141726"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pt.score}%
                    </text>
                  </g>
                ))}
              </svg>

              <div className="mt-2 flex items-center justify-between px-4">
                {points.map((pt, i) => (
                  <span key={`${pt.label}-lbl-${i}`} className="text-[11px] text-[#6C728A]">
                    {pt.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-8 text-sm text-[#6C728A]">
              Complete at least one session to display your accuracy progression.
            </p>
          )}
        </div>
      </section>

      {/* Actionable Areas for Improvement */}
      <section className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#141726]">Areas for Improvement</h2>
            <p className="text-xs text-[#6C728A]">
              Actionable focus recommendations drawn from your recent grammar corrections
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {improvementCards.map((card) => (
            <div
              key={card.title}
              className="flex flex-col justify-between rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#141726]">{card.title}</h3>
                  <span className="font-mono text-[11px] font-medium text-[#635BDB] tabular-nums">
                    {card.countLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#4B5166]">{card.tip}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onPracticeTopic) {
                    onPracticeTopic(card.topic);
                  } else {
                    onNavigate("ai-practice");
                  }
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#635BDB] hover:text-[#5249C9] cursor-pointer"
              >
                Practice {card.topic}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Vocabulary Bank */}
      <section className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#141726]">Saved Vocabulary Bank</h2>
            <p className="text-xs text-[#6C728A]">
              Words marked as learned during AI Speaking Practice and completed sessions
            </p>
          </div>
          <BookOpen className="h-4 w-4 text-[#635BDB]" />
        </div>

        {analytics.uniqueVocabulary.length === 0 ? (
          <p className="mt-4 text-sm text-[#6C728A]">
            No vocabulary saved yet. Click &ldquo;Mark as Learned&rdquo; in AI Speaking Practice to
            build your bank.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#E6E8F0] text-xs font-semibold text-[#6C728A]">
                  <th className="py-2.5 pr-4">Word</th>
                  <th className="py-2.5 pr-4">Part of Speech</th>
                  <th className="py-2.5 pr-4">Definition</th>
                  <th className="py-2.5">Example Sentence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E8F0]">
                {analytics.uniqueVocabulary.map((vocab) => (
                  <tr key={vocab.word} className="align-top transition-colors hover:bg-[#F8F9FC]">
                    <td className="py-3 pr-4 font-semibold text-[#141726]">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#19B5A5]" />
                        {vocab.word}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs italic text-[#635BDB]">
                      {vocab.partOfSpeech ?? "term"}
                    </td>
                    <td className="py-3 pr-4 text-xs leading-relaxed text-[#4B5166]">
                      {vocab.meaning}
                    </td>
                    <td className="py-3 text-xs italic leading-relaxed text-[#374151]">
                      &ldquo;{vocab.example}&rdquo;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Session History */}
      {sessions.length > 0 && (
        <section className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
          <h2 className="text-base font-semibold text-[#141726]">Practice Session History</h2>
          <p className="text-xs text-[#6C728A]">
            Expand any session to review saved coaching summaries and grammar corrections
          </p>

          <div className="mt-4 divide-y divide-[#E6E8F0]">
            {sessions.map((session) => {
              const isOpen = expandedSessionId === session.id;
              return (
                <div key={session.id} className="py-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSessionId((prev) => (prev === session.id ? null : session.id))
                    }
                    className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#141726]">
                        {session.topic ?? session.mode}
                      </p>
                      <p className="mt-0.5 text-xs text-[#6C728A]">
                        {formatLevelLabel(session.level)} · {formatDateLabel(session.endedAt)} ·{" "}
                        <span className="font-mono tabular-nums">{session.durationMinutes} min</span>{" "}
                        ·{" "}
                        <span className="font-mono tabular-nums">{session.corrections.length}</span>{" "}
                        grammar notes
                      </p>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[#6C728A]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[#6C728A]" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="mt-4 space-y-4 rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] p-4 text-xs">
                      {session.summary && (
                        <div>
                          <p className="font-semibold text-[#141726]">Session Summary</p>
                          <p className="mt-1 leading-relaxed text-[#4B5166]">
                            {session.summary.overview}
                          </p>
                        </div>
                      )}

                      {session.corrections.length > 0 && (
                        <div className="border-t border-[#E6E8F0] pt-3">
                          <p className="font-semibold text-[#141726]">Recorded Grammar Notes</p>
                          <div className="mt-2 space-y-2">
                            {session.corrections.map((corr, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg border border-[#E6E8F0] bg-white p-3"
                              >
                                <p className="text-[11px] font-semibold text-[#635BDB]">
                                  {corr.category}
                                </p>
                                <p className="mt-1 text-[#6C728A] line-through">{corr.original}</p>
                                <p className="font-semibold text-[#141726]">{corr.corrected}</p>
                                <p className="mt-0.5 text-[#4B5166]">{corr.explanation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
