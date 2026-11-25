import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  Film,
  Globe,
  Menu,
  MessageSquareText,
  Sparkles,
  Users,
  X,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: (initialTab?: "login" | "register") => void;
  onLoadSampleWorkspace?: () => void;
}

type PreviewTopic = "Daily Life" | "Job Interviews" | "Technology";

const HERO_PREVIEWS: Record<
  PreviewTopic,
  {
    aiGreeting: string;
    userSentence: string;
    aiReply: string;
    original: string;
    corrected: string;
    rule: string;
    vocabWord: string;
    vocabPos: string;
    vocabMeaning: string;
  }
> = {
  "Daily Life": {
    aiGreeting: "Hello! I'm your SpeakMate AI partner. What would you like to talk about today?",
    userSentence: "I am go to college yesterday and prepare for my seminar.",
    aiReply:
      "Sounds like a productive day! What topic are you presenting in your seminar, and how are you organizing your opening points?",
    original: "I am go to college yesterday.",
    corrected: "I went to college yesterday.",
    rule: "Use the simple past tense ('went') instead of 'am go' for completed actions with past time markers like 'yesterday'.",
    vocabWord: "consistent",
    vocabPos: "adjective",
    vocabMeaning: "Acting steadily over time to build lasting progress.",
  },
  "Job Interviews": {
    aiGreeting: "Tell me about a project where you showed initiative under a tight deadline.",
    userSentence: "I am working on our capstone app since six months and led four teammates.",
    aiReply:
      "Great ownership! Could you share one measurable result your team achieved before submission?",
    original: "I am working on our capstone app since six months.",
    corrected: "I have been working on our capstone app for six months.",
    rule: "Use present perfect continuous with 'for' (not 'since') when stating a length of time.",
    vocabWord: "proactive",
    vocabPos: "adjective",
    vocabMeaning: "Taking early action to prevent problems or create improvements.",
  },
  Technology: {
    aiGreeting: "How would you explain a performance issue you solved in a recent software project?",
    userSentence: "The database have high latency when many user connects at once.",
    aiReply:
      "Nice start—what caching or indexing change did you introduce to cut response time?",
    original: "The database have high latency when many user connects.",
    corrected: "The database has high latency when many users connect.",
    rule: "Match singular subjects ('database has') and plural subjects ('many users connect') with the right verb form.",
    vocabWord: "scalability",
    vocabPos: "noun",
    vocabMeaning: "Ability of a system to handle growing load smoothly.",
  },
};

const CAPABILITIES = [
  {
    title: "AI Speaking Practice & Live Voice",
    description:
      "Practice text chats, audio transcription, or hands-free Live Voice calls across Daily Life, Job Interviews, Education, Technology, and General Conversation.",
    icon: MessageSquareText,
  },
  {
    title: "Instant Grammar & Vocabulary Bank",
    description:
      "Review side-by-side original vs. corrected sentences with clear tense rules, and mark context-matched vocabulary as learned to grow your bank.",
    icon: CheckCircle2,
  },
  {
    title: "AI Coach Chat with Search Grounding",
    description:
      "Explore interview trends, current events, and workplace writing with specialist personas backed by clickable Google Search citations.",
    icon: Globe,
  },
  {
    title: "3D Public Speaking Auditorium",
    description:
      "Rehearse presentations behind an interactive 3D lectern with teleprompter cues, auditorium lighting presets, and live microphone energy feedback.",
    icon: Box,
  },
  {
    title: "Partner Matching & Mentorship",
    description:
      "Discover compatible speaking peers with transparent 100-point compatibility breakdowns and book 1-on-1 coaching sessions with mentors.",
    icon: Users,
  },
  {
    title: "Creative Video & Music Studio",
    description:
      "Generate presentation visuals, motion clips, and instrumental focus audio to elevate rehearsals and spoken storytelling.",
    icon: Film,
  },
];

const STEPS = [
  {
    number: "01",
    title: "Pick a Real-World Topic or Studio",
    description:
      "Choose Daily Life, Job Interviews, Education, Technology, or step into Live Voice Call, Coach Chat, or the 3D Speaking Stage.",
  },
  {
    number: "02",
    title: "Speak or Chat Naturally",
    description:
      "Respond at your own pace via text, voice transcription, or real-time voice—with topic-aware follow-up questions tailored to your level.",
  },
  {
    number: "03",
    title: "Review Corrections & Track Growth",
    description:
      "Apply side-by-side grammar notes, save new vocabulary to your bank, and track your weekly minutes, accuracy progression, and streak.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Practicing 15 minutes a day in Job Interviews mode and rehearsing my intro in the 3D auditorium helped me cut filler words before campus placements.",
    name: "Ananya Krishnan",
    role: "Final-Year Computer Science Student, Anna University",
    outcome: "+14% grammar accuracy in 3 weeks",
  },
  {
    quote:
      "Seeing the original sentence next to the corrected phrasing with one clear rule made grammar click faster than memorizing worksheets.",
    name: "Rohan Deshpande",
    role: "Graduate Software Analyst, Bengaluru",
    outcome: "42 workplace terms mastered",
  },
  {
    quote:
      "Combining AI Coach Chat for company research with Live Voice rehearsals gave me genuine calm walking into seminar Q&A and interviews.",
    name: "Meera Nair",
    role: "M.Sc. Data Analytics Candidate, Pune",
    outcome: "12-day daily speaking streak",
  },
];

const SAMPLE_WEEK = [
  { day: "Mon", min: 15 },
  { day: "Tue", min: 22 },
  { day: "Wed", min: 18 },
  { day: "Thu", min: 25 },
  { day: "Fri", min: 20 },
  { day: "Sat", min: 14 },
  { day: "Sun", min: 24 },
];

export function LandingPage({ onGetStarted, onLoadSampleWorkspace }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [previewTopic, setPreviewTopic] = useState<PreviewTopic>("Daily Life");

  const preview = HERO_PREVIEWS[previewTopic];

  return (
    <div id="top" className="min-h-screen bg-[#F8F9FC] text-[#141726]">
      {/* Strict 3-Zone Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#E6E8F0] bg-[#FFFFFF]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-5 py-4 sm:px-6">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-[#141726] whitespace-nowrap shrink-0"
          >
            SpeakMate <span className="text-[#635BDB]">AI</span>
          </a>

          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4B5166]"
            aria-label="Primary navigation"
          >
            <a
              href="#features"
              className="transition-colors hover:text-[#635BDB] whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-[#635BDB] whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#progress-preview"
              className="transition-colors hover:text-[#635BDB] whitespace-nowrap shrink-0"
            >
              Progress Preview
            </a>
            <button
              type="button"
              onClick={() => onGetStarted("login")}
              className="transition-colors hover:text-[#635BDB] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onGetStarted("register")}
              className="hidden sm:inline-flex items-center justify-center rounded-xl bg-[#635BDB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5249C9] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E6E8F0] bg-white text-[#141726] md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#E6E8F0] bg-white px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium text-[#4B5166]">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#635BDB]"
              >
                Capabilities
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#635BDB]"
              >
                How It Works
              </a>
              <a
                href="#progress-preview"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#635BDB]"
              >
                Progress Preview
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStarted("login");
                }}
                className="py-1.5 text-left hover:text-[#635BDB] cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStarted("register");
                }}
                className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-[#635BDB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5249C9] cursor-pointer"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-6 lg:pb-24 lg:pt-16">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Value Proposition */}
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-sm font-semibold text-[#635BDB]">
              AI English Communication &amp; Speaking Platform
            </p>
            <h1
              className="mt-3 text-4xl font-bold leading-[1.12] tracking-tight text-[#141726] sm:text-5xl"
              style={{ textWrap: "balance" }}
            >
              Speak English with Confidence.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#4B5166]">
              Practice natural conversations and live voice calls, rehearse presentations in a 3D
              auditorium, receive instant grammar corrections, connect with speaking partners and
              mentors, and track measurable fluency every day.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onGetStarted("register")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#635BDB] px-6 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#5249C9] whitespace-nowrap cursor-pointer"
              >
                Start Practicing
                <ArrowRight className="h-4 w-4" />
              </button>
              {onLoadSampleWorkspace && (
                <button
                  type="button"
                  onClick={onLoadSampleWorkspace}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E6E8F0] bg-white px-5 py-3 text-sm font-semibold text-[#141726] transition-colors hover:border-[#635BDB]/30 hover:bg-[#F0EEFF]/60 whitespace-nowrap cursor-pointer"
                >
                  Explore Sample Workspace
                </button>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#E6E8F0] pt-6 text-xs text-[#6C728A]">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#19B5A5]" />
                AI Chat, Live Voice &amp; 3D Stage
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#19B5A5]" />
                Instant grammar &amp; vocabulary bank
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#19B5A5]" />
                Peer matching &amp; mentorship
              </span>
            </div>
          </div>

          {/* Right Interactive AI Chat + Grammar Preview Card */}
          <div className="lg:col-span-6">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-[#E6E8F0] bg-white p-5 shadow-[0_6px_24px_rgba(20,23,38,0.05)] sm:p-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E8F0] pb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#141726]">Live Coaching Preview</p>
                    <p className="text-xs text-[#6C728A]">
                      Switch topics to inspect real-time grammar &amp; vocabulary feedback
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-xl bg-[#F0EEFF] p-1">
                    {(["Daily Life", "Job Interviews", "Technology"] as const).map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => setPreviewTopic(topic)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          previewTopic === topic
                            ? "bg-[#635BDB] text-white shadow-2xs"
                            : "text-[#4B5166] hover:text-[#141726]"
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Thread Preview */}
                <div className="mt-4 space-y-3">
                  <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-[#F0EEFF] px-4 py-3 text-sm leading-relaxed text-[#141726]">
                    <p className="text-[11px] font-semibold text-[#635BDB]">SpeakMate AI</p>
                    <p className="mt-0.5">{preview.aiGreeting}</p>
                  </div>

                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[#635BDB] px-4 py-3 text-sm leading-relaxed text-white">
                    <p className="text-[11px] font-medium text-white/80">You</p>
                    <p className="mt-0.5">{preview.userSentence}</p>
                  </div>

                  <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-[#E6E8F0] bg-[#F8F9FC] px-4 py-3 text-sm leading-relaxed text-[#141726]">
                    <p className="text-[11px] font-semibold text-[#635BDB]">SpeakMate AI</p>
                    <p className="mt-0.5">{preview.aiReply}</p>
                  </div>
                </div>
              </div>

              {/* Grammar Correction + Vocab Highlight */}
              <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#E6E8F0] pt-4 sm:grid-cols-12">
                <div className="rounded-xl bg-[#F8F9FC] p-3.5 sm:col-span-7">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#19B5A5]" />
                    <span>Grammar Correction</span>
                  </div>
                  <p className="mt-2 text-xs text-[#6C728A] line-through">{preview.original}</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#141726]">{preview.corrected}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4B5166]">{preview.rule}</p>
                </div>

                <div className="rounded-xl bg-[#F0EEFF]/70 p-3.5 sm:col-span-5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#635BDB]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Vocabulary Tip</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#141726]">
                    {preview.vocabWord}{" "}
                    <span className="text-xs font-normal italic text-[#6C728A]">
                      ({preview.vocabPos})
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4B5166]">
                    {preview.vocabMeaning}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="border-t border-[#E6E8F0] bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#635BDB]">Complete Platform Capabilities</p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight text-[#141726]"
              style={{ textWrap: "balance" }}
            >
              Everything you need to speak clearly in class, interviews, and work.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-[#E6E8F0] bg-[#F8F9FC]/60 p-6 transition-colors hover:border-[#635BDB]/40 hover:bg-white"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#635BDB]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#141726]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4B5166]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3-Step How It Works */}
      <section id="how-it-works" className="border-t border-[#E6E8F0] bg-[#F8F9FC] py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#635BDB]">How It Works</p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight text-[#141726]"
              style={{ textWrap: "balance" }}
            >
              A structured 15-minute daily speaking routine.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)]"
              >
                <span className="font-mono text-sm font-semibold text-[#635BDB] tabular-nums">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-[#141726]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4B5166]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Progress Preview & Testimonials */}
      <section
        id="progress-preview"
        className="border-t border-[#E6E8F0] bg-white py-16 lg:py-20"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-sm font-semibold text-[#635BDB]">Progress Preview</p>
              <h2
                className="mt-2 text-3xl font-bold tracking-tight text-[#141726]"
                style={{ textWrap: "balance" }}
              >
                Watch your fluency, accuracy, and streak grow week over week.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#4B5166]">
                Every speaking session updates your Mon–Sun activity chart, grammar accuracy trend,
                skill breakdown, and saved vocabulary bank automatically.
              </p>

              <div className="mt-6 space-y-3.5">
                {[
                  { label: "Fluency", value: 86, color: "bg-[#635BDB]" },
                  { label: "Grammar Accuracy", value: 89, color: "bg-[#19B5A5]" },
                  { label: "Vocabulary Range", value: 82, color: "bg-[#635BDB]" },
                ].map((skill) => (
                  <div key={skill.label}>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-[#141726]">{skill.label}</span>
                      <span className="font-mono text-[#4B5166] tabular-nums">{skill.value}%</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F0EEFF]">
                      <div
                        className={`h-full rounded-full ${skill.color}`}
                        style={{ width: `${skill.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-[#E6E8F0] bg-[#F8F9FC] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#141726]">
                      Weekly Practice Activity
                    </h3>
                    <p className="text-xs text-[#6C728A]">Sample 7-day learner speaking cadence</p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#0F766E] tabular-nums">
                    +18% vs last week
                  </span>
                </div>

                <div className="mt-6 flex h-44 items-end justify-between gap-3 border-b border-[#E6E8F0] pb-3">
                  {SAMPLE_WEEK.map((item) => (
                    <div
                      key={item.day}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="font-mono text-[11px] font-medium text-[#6C728A] tabular-nums">
                        {item.min}m
                      </span>
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div
                          className="w-full max-w-[34px] rounded-t-lg bg-[#635BDB]"
                          style={{ height: `${Math.round((item.min / 28) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  {SAMPLE_WEEK.map((item) => (
                    <span
                      key={item.day}
                      className="flex-1 text-center text-xs font-medium text-[#6C728A]"
                    >
                      {item.day}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Learner Testimonials */}
          <div className="mt-16 border-t border-[#E6E8F0] pt-14">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-[#635BDB]">Learner Outcomes</p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#141726]">
                  Built for students and professionals preparing for real conversations
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onGetStarted("register")}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#635BDB] hover:text-[#5249C9] whitespace-nowrap cursor-pointer"
              >
                Create your workspace
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="flex flex-col justify-between rounded-2xl border border-[#E6E8F0] bg-[#F8F9FC]/60 p-6"
                >
                  <blockquote className="text-sm leading-relaxed text-[#374151]">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 border-t border-[#E6E8F0] pt-4">
                    <p className="text-sm font-semibold text-[#141726]">{t.name}</p>
                    <p className="text-xs text-[#6C728A]">{t.role}</p>
                    <p className="mt-2 font-mono text-xs font-semibold text-[#0F766E] tabular-nums">
                      {t.outcome}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="border-t border-[#E6E8F0] bg-[#F8F9FC] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-base font-bold text-[#141726]">
              SpeakMate <span className="text-[#635BDB]">AI</span>
            </p>
            <p className="mt-1 text-xs text-[#6C728A]">
              AI-powered English speaking, grammar correction, mentorship, and progress platform.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#4B5166]">
            <a href="#features" className="hover:text-[#635BDB]">
              Capabilities
            </a>
            <a href="#how-it-works" className="hover:text-[#635BDB]">
              How It Works
            </a>
            <a href="#progress-preview" className="hover:text-[#635BDB]">
              Progress Preview
            </a>
            <button
              type="button"
              onClick={() => onGetStarted("login")}
              className="hover:text-[#635BDB] cursor-pointer"
            >
              Sign In
            </button>
            <span className="text-[#6C728A]">© {new Date().getFullYear()} SpeakMate AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
