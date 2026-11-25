import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  MessageSquare,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  AVAILABILITY_SLOTS,
  CONVERSATION_TOPICS,
  DEMO_PARTNERS,
  PRACTICE_PURPOSES,
} from "../data/demoData";
import type {
  MatchCriteria,
  MatchResult,
  PracticeMode,
  ProficiencyLevel,
  UserProfile,
} from "../types";
import { rankDemoPartners } from "../utils/matching";

interface PartnerMatchingPageProps {
  user: UserProfile;
  onLaunchAIPracticeWithScenario: (mode: PracticeMode, level: ProficiencyLevel) => void;
}

function mapTopicToPracticeMode(topic: string, purpose: string): PracticeMode {
  if (purpose === "Job Interview Preparation" || topic === "Career & Interviews") {
    return "HR Interview Practice";
  }
  if (topic === "Technology & Engineering") {
    return "Technical Interview Practice";
  }
  if (topic === "Public Speaking & Presentations" || purpose === "Academic Presentations") {
    return "Public Speaking Practice";
  }
  if (topic === "Business & Leadership" || purpose === "Workplace Meetings & Emails") {
    return "Professional Workplace Communication";
  }
  return "Friendly Conversation";
}

export function PartnerMatchingPage({
  user,
  onLaunchAIPracticeWithScenario,
}: PartnerMatchingPageProps) {
  const [criteria, setCriteria] = useState<MatchCriteria>({
    proficiencyLevel: user.proficiencyLevel,
    topic: CONVERSATION_TOPICS[0],
    purpose: PRACTICE_PURPOSES[0],
    availability: user.preferredAvailability || AVAILABILITY_SLOTS[1],
  });

  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);
  const [activeDemoChat, setActiveDemoChat] = useState<MatchResult | null>(null);
  const [demoNote, setDemoNote] = useState("");
  const [demoSentNotes, setDemoSentNotes] = useState<Record<string, string[]>>({});

  const rankedMatches = useMemo(() => rankDemoPartners(DEMO_PARTNERS, criteria), [criteria]);

  function handleSendDemoIntro(partnerId: string) {
    const text = demoNote.trim();
    if (!text) return;
    setDemoSentNotes((prev) => ({
      ...prev,
      [partnerId]: [...(prev[partnerId] ?? []), text],
    }));
    setDemoNote("");
  }

  return (
    <div className="space-y-6">
      {/* Compatibility Formula Overview Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#E6E8F0] bg-white p-5 text-sm text-[#4B5563]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#635BDB]" />
        <div>
          <p className="font-semibold text-[#141726]">Weighted Compatibility Matching</p>
          <p className="mt-1 text-xs leading-relaxed text-[#4B5563]">
            Speaking partners below are ranked dynamically using SpeakMate AI&apos;s 100-point
            compatibility model: Proficiency Compatibility (35%), Shared Interests (30%), Practice
            Goals (20%), and Availability Overlap (15%).
          </p>
        </div>
      </div>

      {/* Matching Criteria Filter Bar */}
      <section className="rounded-xl border border-[#E6E8F0] bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#141726]">
          <SlidersHorizontal className="h-4 w-4 text-[#635BDB]" />
          <span>Matching Preferences</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="match-level" className="block text-xs font-semibold text-[#374151]">
              English Proficiency Level
            </label>
            <select
              id="match-level"
              value={criteria.proficiencyLevel}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  proficiencyLevel: e.target.value as ProficiencyLevel,
                }))
              }
              className="mt-1.5 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label htmlFor="match-topic" className="block text-xs font-semibold text-[#374151]">
              Conversation Topic
            </label>
            <select
              id="match-topic"
              value={criteria.topic}
              onChange={(e) => setCriteria((prev) => ({ ...prev, topic: e.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
            >
              {CONVERSATION_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="match-purpose" className="block text-xs font-semibold text-[#374151]">
              Practice Purpose
            </label>
            <select
              id="match-purpose"
              value={criteria.purpose}
              onChange={(e) => setCriteria((prev) => ({ ...prev, purpose: e.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
            >
              {PRACTICE_PURPOSES.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purpose}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="match-availability"
              className="block text-xs font-semibold text-[#374151]"
            >
              Preferred Availability
            </label>
            <select
              id="match-availability"
              value={criteria.availability}
              onChange={(e) => setCriteria((prev) => ({ ...prev, availability: e.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
            >
              {AVAILABILITY_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Ranked Demo Partner Cards */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {rankedMatches.map((match) => {
          const { partner, score, statusLabel, breakdown } = match;
          const isExpanded = expandedPartnerId === partner.id;
          const sentCount = demoSentNotes[partner.id]?.length ?? 0;

          return (
            <article
              key={partner.id}
              className="flex flex-col justify-between rounded-xl border border-[#E6E8F0] bg-white p-6"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#E6E8F0] bg-[#F8F9FC] text-sm font-bold text-[#635BDB]">
                      {partner.initials}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <h3 className="text-base font-semibold text-[#141726]">{partner.name}</h3>
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        {partner.role} · {partner.location}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-2xl font-bold text-[#635BDB] tabular-nums">
                      {score}%
                    </p>
                    <p className="text-xs font-medium text-[#4B5563]">{statusLabel}</p>
                  </div>
                </div>

                {/* Clean Unboxed Metadata */}
                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4B5563]">
                  <span className="font-semibold text-[#141726]">{partner.proficiencyLevel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{partner.primaryTopic}</span>
                  <span aria-hidden="true">·</span>
                  <span>{partner.practicePurpose}</span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#4B5563]">{partner.bio}</p>

                <p className="mt-3 text-xs text-[#6B7280]">
                  Availability: {partner.availability.join(", ")}
                </p>

                {/* Transparent Score Breakdown Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPartnerId((prev) => (prev === partner.id ? null : partner.id))
                  }
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#635BDB] hover:underline cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      Hide compatibility breakdown <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Inspect scoring breakdown <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2.5 border-t border-[#E6E8F0] pt-3">
                    {breakdown.map((item) => {
                      const pct = Math.round((item.earned / item.weight) * 100);
                      return (
                        <div key={item.label} className="text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#141726]">{item.label}</span>
                            <span className="font-mono text-[#4B5563] tabular-nums">
                              {item.earned}/{item.weight} pts
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
                            <div
                              className="h-full rounded-full bg-[#635BDB]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[#6B7280]">{item.reason}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E8F0] pt-4">
                <span className="text-xs text-[#6B7280]">
                  {sentCount > 0 ? `Intro drafted (${sentCount})` : "Available to practice"}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDemoChat(match)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#635BDB] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5249C9] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Start Conversation
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {/* Partner Conversation Modal */}
      {activeDemoChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141726]/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#E6E8F0] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-semibold text-[#635BDB] tabular-nums">
                  Partner Match · {activeDemoChat.score}% Compatible
                </p>
                <h3 className="mt-1 text-lg font-bold text-[#141726]">
                  {activeDemoChat.partner.name}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  {activeDemoChat.partner.proficiencyLevel} · {activeDemoChat.partner.primaryTopic}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDemoChat(null)}
                aria-label="Close partner preview"
                className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F1F3F6] hover:text-[#141726] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-[#E6E8F0] bg-[#F8F9FC] p-4 text-sm text-[#374151]">
              <p className="text-xs font-semibold text-[#6B7280]">Conversation Opener</p>
              <p className="mt-1.5 leading-relaxed text-[#141726]">
                &ldquo;{activeDemoChat.partner.starterPrompt}&rdquo;
              </p>
            </div>

            {(demoSentNotes[activeDemoChat.partner.id]?.length ?? 0) > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-[#6B7280]">Your Intro Messages</p>
                {demoSentNotes[activeDemoChat.partner.id].map((msg, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#635BDB]/20 bg-[#F0EEFF] px-3.5 py-2 text-xs text-[#5249C9]"
                  >
                    {msg}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="demo-partner-msg"
                className="block text-xs font-semibold text-[#374151]"
              >
                Write an introduction message
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="demo-partner-msg"
                  type="text"
                  value={demoNote}
                  onChange={(e) => setDemoNote(e.target.value)}
                  placeholder="Hi! Would you like to practice interview questions together?"
                  className="flex-1 rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
                />
                <button
                  type="button"
                  onClick={() => handleSendDemoIntro(activeDemoChat.partner.id)}
                  className="rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2 text-xs font-semibold text-[#141726] hover:bg-[#F8F9FC] whitespace-nowrap cursor-pointer"
                >
                  Save Message
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col justify-between gap-3 border-t border-[#E6E8F0] pt-4 sm:flex-row sm:items-center">
              <p className="text-xs text-[#6B7280]">
                Want a live conversation right now on this exact topic?
              </p>
              <button
                type="button"
                onClick={() => {
                  const mappedMode = mapTopicToPracticeMode(
                    activeDemoChat.partner.primaryTopic,
                    activeDemoChat.partner.practicePurpose
                  );
                  const targetLevel = activeDemoChat.partner.proficiencyLevel;
                  setActiveDemoChat(null);
                  onLaunchAIPracticeWithScenario(mappedMode, targetLevel);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#635BDB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5249C9] whitespace-nowrap cursor-pointer"
              >
                Practice With SpeakMate AI
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
