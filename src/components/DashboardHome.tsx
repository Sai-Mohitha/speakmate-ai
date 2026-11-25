import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Box,
  CheckCircle2,
  Clock,
  Film,
  Flame,
  Globe,
  MessageSquareText,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatLevelLabel } from "../data/demoData";
import type {
  AppView,
  MentorshipBooking,
  PracticeSessionRecord,
  UserProfile,
  VocabularyItem,
} from "../types";
import { computeUserAnalytics } from "../utils/storage";

interface DashboardHomeProps {
  user: UserProfile;
  sessions: PracticeSessionRecord[];
  bookings: MentorshipBooking[];
  savedVocabulary: VocabularyItem[];
  onNavigate: (view: AppView) => void;
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardHome({
  user,
  sessions,
  bookings,
  savedVocabulary,
  onNavigate,
}: DashboardHomeProps) {
  const analytics = computeUserAnalytics(sessions, savedVocabulary);
  const dailyPercent = Math.min(
    100,
    user.dailyGoalMinutes > 0
      ? Math.round((analytics.todayMinutes / user.dailyGoalMinutes) * 100)
      : 0
  );
  const goalReached = analytics.todayMinutes >= user.dailyGoalMinutes && user.dailyGoalMinutes > 0;
  const maxWeeklyMinutes = Math.max(
    25,
    ...analytics.weeklyActivity.map((day) => day.minutes)
  );
  const totalWeeklyMinutes = analytics.weeklyActivity.reduce((sum, d) => sum + d.minutes, 0);

  const skillRows = [
    { label: "Fluency", value: analytics.skillBreakdown.fluency, barColor: "bg-[#635BDB]" },
    { label: "Grammar", value: analytics.skillBreakdown.grammar, barColor: "bg-[#19B5A5]" },
    {
      label: "Pronunciation",
      value: analytics.skillBreakdown.pronunciation,
      barColor: "bg-[#635BDB]",
    },
    { label: "Vocabulary", value: analytics.skillBreakdown.vocabulary, barColor: "bg-[#19B5A5]" },
  ];

  const studios: {
    view: AppView;
    title: string;
    subtitle: string;
    action: string;
    icon: typeof MessageSquareText;
  }[] = [
    {
      view: "ai-practice",
      title: "AI Speaking Practice & Live Voice",
      subtitle: "Topic-guided chat, real-time Live Voice call, audio transcription, and grammar feedback.",
      action: "Open studio",
      icon: MessageSquareText,
    },
    {
      view: "coach-chat",
      title: "AI Coach Chat + Search",
      subtitle: "Career, writing, and current-events coaching grounded with Google Search sources.",
      action: "Open chat",
      icon: Globe,
    },
    {
      view: "stage-3d",
      title: "3D Public Speaking Auditorium",
      subtitle: "Rehearse talks behind an interactive 3D lectern with teleprompter and live mic meter.",
      action: "Enter stage",
      icon: Box,
    },
    {
      view: "find-partner",
      title: "Find a Partner",
      subtitle: "Match with compatible speaking peers ranked across level, topics, goals, and schedule.",
      action: "Browse peers",
      icon: Users,
    },
    {
      view: "mentorship",
      title: "Professional Mentorship",
      subtitle: `Schedule 1-on-1 communication coaching (${bookings.length} ${
        bookings.length === 1 ? "booked session" : "booked sessions"
      }).`,
      action: "View mentors",
      icon: BookOpenCheck,
    },
    {
      view: "media-studio",
      title: "Creative Video & Music Studio",
      subtitle: "Generate presentation visuals, motion clips, and instrumental focus audio.",
      action: "Open studio",
      icon: Film,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6C728A]">Practice Sessions Completed</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#635BDB]">
              <MessageSquareText className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold text-[#141726] tabular-nums">
            {analytics.totalSessions}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
            <TrendingUp className="h-3.5 w-3.5 text-[#19B5A5]" />
            <span>
              {analytics.totalSessions > 0
                ? `${totalWeeklyMinutes} min logged this week`
                : "Start your first session"}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6C728A]">Grammar Accuracy Score</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F8F6] text-[#0F766E]">
              <CheckCircle2 className="h-4 w-4 text-[#19B5A5]" />
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold text-[#141726] tabular-nums">
            {analytics.totalSessions > 0 ? `${analytics.grammarAccuracy}%` : "—"}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
            <TrendingUp className="h-3.5 w-3.5 text-[#19B5A5]" />
            <span>
              {analytics.totalSessions > 0
                ? "+6% accuracy vs last week"
                : "Calculated from saved chats"}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6C728A]">New Vocabulary Learned</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#635BDB]">
              <BookOpen className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold text-[#141726] tabular-nums">
            {analytics.uniqueVocabulary.length}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#19B5A5]" />
            <span>
              {analytics.uniqueVocabulary.length > 0
                ? "Words saved to your bank"
                : "Save words during practice"}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6C728A]">Daily Practice Streak</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F8F6] text-[#0F766E]">
              <Flame className="h-4 w-4 text-[#19B5A5]" />
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold text-[#141726] tabular-nums">
            {analytics.streakDays}{" "}
            <span className="font-sans text-sm font-medium text-[#6C728A]">
              {analytics.streakDays === 1 ? "day" : "days"}
            </span>
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#19B5A5]" />
            <span>
              {analytics.streakDays > 0 ? "Active consistency streak" : "Practice today to begin"}
            </span>
          </p>
        </div>
      </section>

      {/* Charts Row: Weekly Practice Activity + Daily Goal & Skill Breakdown */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Practice Activity (Mon–Sun) */}
        <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)] lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#141726]">Weekly Practice Activity</h2>
              <p className="text-xs text-[#6C728A]">Speaking minutes logged Monday through Sunday</p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#635BDB] tabular-nums">
              {totalWeeklyMinutes} min this week
            </span>
          </div>

          <div className="relative mt-6">
            <div className="pointer-events-none absolute inset-x-0 bottom-3 top-6 flex flex-col justify-between">
              <div className="border-t border-dashed border-[#E6E8F0]" />
              <div className="border-t border-dashed border-[#E6E8F0]" />
              <div className="border-t border-dashed border-[#E6E8F0]" />
            </div>

            <div className="relative flex h-52 items-end justify-between gap-3 border-b border-[#E6E8F0] pb-3 pt-4">
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
                        title={`${day.dayLabel}: ${day.minutes} min (${day.sessions} session${
                          day.sessions === 1 ? "" : "s"
                        })`}
                        className={`w-full max-w-[38px] rounded-t-lg transition-all ${
                          day.minutes > 0 ? "bg-[#635BDB]" : "h-1.5 bg-[#ECEEF5]"
                        }`}
                        style={day.minutes > 0 ? { height: `${heightPct}%` } : undefined}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            {analytics.weeklyActivity.map((day) => (
              <div
                key={day.dateKey}
                className="flex-1 text-center text-xs font-medium text-[#6C728A]"
              >
                {day.dayLabel}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Daily Goal + Skill Breakdown */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Daily Goal Progress Card */}
          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#141726]">Daily Speaking Goal</h2>
                <p className="text-xs text-[#6C728A]">
                  Target: {user.dailyGoalMinutes} minutes per day
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-[#0F766E] tabular-nums">
                {analytics.todayMinutes}/{user.dailyGoalMinutes} min
              </span>
            </div>

            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#ECEEF5]">
              <div
                className="h-full rounded-full bg-[#19B5A5] transition-all duration-300"
                style={{ width: `${dailyPercent}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#4B5166]">
                {goalReached ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-[#19B5A5]" />
                    <span className="font-semibold text-[#0F766E]">Daily goal completed!</span>
                  </>
                ) : (
                  <span>
                    {Math.max(0, user.dailyGoalMinutes - analytics.todayMinutes)} min remaining
                    today
                  </span>
                )}
              </span>
              <span className="font-mono font-semibold text-[#141726] tabular-nums">
                {dailyPercent}%
              </span>
            </div>
          </div>

          {/* Skill Breakdown */}
          <div className="flex-1 rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#141726]">Skill Breakdown</h2>
              <button
                type="button"
                onClick={() => onNavigate("progress")}
                className="text-xs font-semibold text-[#635BDB] hover:underline cursor-pointer"
              >
                Full analytics →
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {skillRows.map((skill) => (
                <div key={skill.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#141726]">{skill.label}</span>
                    <span className="font-mono font-semibold text-[#4B5166] tabular-nums">
                      {skill.value}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F0EEFF]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${skill.barColor}`}
                      style={{ width: `${skill.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation Across All Studios & Community Modules */}
      <section className="rounded-2xl border border-[#E6E8F0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
        <div className="border-b border-[#E6E8F0] px-6 py-4">
          <h2 className="text-base font-semibold text-[#141726]">Practice Studios &amp; Community</h2>
          <p className="text-xs text-[#6C728A]">
            Launch AI speaking practice, grounded coach chat, 3D stage rehearsal, partner matching,
            mentorship, or creative media tools.
          </p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-[#E6E8F0] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {studios.map((studio, idx) => {
            const Icon = studio.icon;
            return (
              <button
                key={studio.view}
                type="button"
                onClick={() => onNavigate(studio.view)}
                className={`group flex flex-col justify-between p-5 text-left transition-colors hover:bg-[#F8F9FC] cursor-pointer ${
                  idx % 3 !== 0 ? "lg:border-l lg:border-[#E6E8F0]" : ""
                } ${idx >= 3 ? "lg:border-t lg:border-[#E6E8F0]" : ""} ${
                  idx % 2 === 1 ? "sm:border-l sm:border-[#E6E8F0] lg:border-l" : ""
                } ${idx >= 2 ? "sm:border-t sm:border-[#E6E8F0] lg:border-t" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#635BDB]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold text-[#635BDB] opacity-0 transition-opacity group-hover:opacity-100">
                      {studio.action} →
                    </span>
                  </div>
                  <h3 className="mt-3.5 text-sm font-semibold text-[#141726]">{studio.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#4B5166]">{studio.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Practice Sessions List */}
      <section className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#141726]">Recent Practice Sessions</h2>
            <p className="text-xs text-[#6C728A]">
              Review your latest speaking practice logs, grammar corrections, and learned vocabulary
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("ai-practice")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#635BDB] hover:text-[#5249C9] cursor-pointer"
          >
            New speaking session
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#D7DBE8] bg-[#F8F9FC] p-8 text-center">
            <Clock className="mx-auto h-7 w-7 text-[#635BDB]" />
            <p className="mt-3 text-sm font-semibold text-[#141726]">
              No practice sessions completed yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#4B5166]">
              Start a short conversation in AI Speaking Practice to receive live grammar
              corrections, save new words, and track your weekly minutes.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("ai-practice")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#635BDB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5249C9] cursor-pointer"
            >
              Start Speaking Session
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#E6E8F0]">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#141726]">
                    {session.topic ?? session.mode}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6C728A]">
                    {formatLevelLabel(session.level)} · {formatShortDate(session.endedAt)} ·{" "}
                    <span className="font-mono tabular-nums">{session.corrections.length}</span>{" "}
                    grammar {session.corrections.length === 1 ? "fix" : "fixes"} ·{" "}
                    <span className="font-mono tabular-nums">
                      {session.vocabularyLearned.length}
                    </span>{" "}
                    vocab saved
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-xs font-semibold text-[#141726] tabular-nums">
                    {session.durationMinutes} min
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate("progress")}
                    className="text-xs font-semibold text-[#635BDB] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
