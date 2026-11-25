import { useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpenCheck,
  Box,
  Film,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Mic,
  Settings,
  Users,
  X,
} from "lucide-react";
import { formatLevelLabel } from "../data/demoData";
import type { AppView, UserProfile } from "../types";

interface DashboardLayoutProps {
  user: UserProfile;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  children: ReactNode;
}

type WorkspaceView = Exclude<AppView, "landing" | "auth">;

const NAV_GROUPS: {
  label: string;
  items: {
    id: WorkspaceView;
    label: string;
    icon: typeof LayoutDashboard;
  }[];
}[] = [
  {
    label: "Practice & Studios",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "ai-practice", label: "AI Speaking Practice", icon: MessageSquareText },
      { id: "coach-chat", label: "AI Coach Chat", icon: Globe },
      { id: "stage-3d", label: "3D Stage Studio", icon: Box },
      { id: "media-studio", label: "Media Studio", icon: Film },
    ],
  },
  {
    label: "Community & Progress",
    items: [
      { id: "find-partner", label: "Find a Partner", icon: Users },
      { id: "mentorship", label: "Mentorship", icon: BookOpenCheck },
      { id: "progress", label: "Learning Progress", icon: BarChart3 },
      { id: "profile", label: "Settings", icon: Settings },
    ],
  },
];

const VIEW_META: Record<WorkspaceView, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Track your speaking streak, grammar accuracy, daily goal, and practice studios.",
  },
  "ai-practice": {
    title: "AI Speaking Practice & Live Voice",
    subtitle: "Topic-guided chat, real-time Live Voice call, grammar feedback, and vocabulary bank.",
  },
  "coach-chat": {
    title: "AI Coach Chat & Search Grounding",
    subtitle: "Specialist career, writing, and current-events coaching with Google Search citations.",
  },
  "stage-3d": {
    title: "3D Public Speaking Auditorium",
    subtitle: "Rehearse speeches behind an interactive 3D lectern with teleprompter and mic feedback.",
  },
  "media-studio": {
    title: "Creative Video & Music Studio",
    subtitle: "Create presentation visuals, animated scenes, and focus music tracks.",
  },
  "find-partner": {
    title: "Conversation Partner Matching",
    subtitle: "Discover compatible speaking peers with transparent 100-point compatibility breakdowns.",
  },
  mentorship: {
    title: "Professional Mentorship",
    subtitle: "Browse communication coaches and schedule structured 1-on-1 practice sessions.",
  },
  progress: {
    title: "Learning Progress & Analytics",
    subtitle: "Weekly practice minutes, grammar accuracy progression, vocabulary bank, and focus areas.",
  },
  profile: {
    title: "Profile & Settings",
    subtitle: "Manage your learner profile, daily speaking goal, proficiency level, and workspace data.",
  },
};

export function DashboardLayout({
  user,
  currentView,
  onNavigate,
  onLogout,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const firstName = user.name.trim().split(/\s+/)[0] || "Learner";
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const meta =
    currentView !== "landing" && currentView !== "auth"
      ? VIEW_META[currentView]
      : VIEW_META.dashboard;

  const headerTitle =
    currentView === "dashboard"
      ? `Hello, ${firstName}! Ready to improve your English?`
      : meta.title;

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-[#F0EEFF]">
      {/* Brand Lockup */}
      <div className="flex items-center justify-between border-b border-[#635BDB]/12 px-5 py-4">
        <button
          type="button"
          onClick={() => {
            onNavigate("dashboard");
            setSidebarOpen(false);
          }}
          className="flex items-center gap-2.5 text-left whitespace-nowrap cursor-pointer"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#635BDB] text-white">
            <Mic className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-[#141726]">
            SpeakMate <span className="text-[#635BDB]">AI</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation menu"
          className="rounded-lg p-1.5 text-[#4B5166] hover:bg-white/70 lg:hidden cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Grouped Navigation Covering All 9 Modules */}
      <nav
        className="flex-1 space-y-5 overflow-y-auto px-3.5 py-4"
        aria-label="Workspace navigation"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[11px] font-semibold text-[#6C728A]">{group.label}</p>
            <div className="mt-1.5 space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-[#635BDB] text-white shadow-[0_2px_8px_rgba(99,91,219,0.28)]"
                        : "text-[#3B4058] hover:bg-white/75 hover:text-[#141726]"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-[#635BDB]"}`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile Badge & Sign Out */}
      <div className="border-t border-[#635BDB]/12 p-3.5">
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-[#E6E8F0] bg-white/85 px-3 py-2">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#635BDB] text-xs font-bold text-white">
              {initials || "M"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#141726]">{user.name}</p>
            <p className="truncate text-xs text-[#6C728A]">
              {formatLevelLabel(user.proficiencyLevel)} ·{" "}
              {user.role === "Working Professional" ? "Pro" : "Student"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#4B5166] transition-colors hover:bg-white hover:text-red-600 whitespace-nowrap cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8F9FC] text-[#141726]">
      {/* Desktop Soft-Lavender Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[#E6E8F0] bg-[#F0EEFF] lg:fixed lg:inset-y-0 lg:flex lg:flex-col">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Collapsible Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#141726]/35"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-64 max-w-[82vw] flex-col border-r border-[#E6E8F0] bg-[#F0EEFF] shadow-xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E8F0] bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E6E8F0] bg-white text-[#141726] hover:bg-[#F8F9FC] lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-[#141726] sm:text-xl">
                {headerTitle}
              </h1>
              <p className="hidden truncate text-xs text-[#6C728A] sm:block">{meta.subtitle}</p>
            </div>
          </div>

          {currentView !== "ai-practice" && (
            <button
              type="button"
              onClick={() => onNavigate("ai-practice")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#635BDB] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(99,91,219,0.22)] transition-colors hover:bg-[#5249C9] sm:text-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              <span>Start Speaking Session</span>
            </button>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
