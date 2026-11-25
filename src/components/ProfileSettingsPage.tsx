import { useState, type FormEvent } from "react";
import { CheckCircle2, Database, LogOut, RotateCcw, Save } from "lucide-react";
import { COMMUNICATION_GOALS, PROFICIENCY_LEVELS } from "../data/demoData";
import type { ProficiencyLevel, UserProfile } from "../types";

interface ProfileSettingsPageProps {
  user: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onLoadSampleData: () => void;
  onResetProgress: () => void;
  onLogout: () => void;
}

const DAILY_GOAL_PRESETS = [10, 15, 20, 30, 45];

export function ProfileSettingsPage({
  user,
  onUpdateProfile,
  onLoadSampleData,
  onResetProgress,
  onLogout,
}: ProfileSettingsPageProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<"Student" | "Working Professional">(user.role);
  const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel>(
    user.proficiencyLevel
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(user.dailyGoalMinutes);
  const [goals, setGoals] = useState<string[]>(user.communicationGoals);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((item) => item !== goal) : [...prev, goal]
    );
    setSavedNotice(null);
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (dailyGoalMinutes < 5 || dailyGoalMinutes > 180) {
      setError("Daily speaking goal should be between 5 and 180 minutes.");
      return;
    }

    onUpdateProfile({
      ...user,
      name: name.trim(),
      role,
      proficiencyLevel,
      dailyGoalMinutes,
      communicationGoals: goals,
    });
    setSavedNotice("Your profile, daily goal, and proficiency level have been saved.");
  }

  function handleSeedSample() {
    onLoadSampleData();
    setConfirmReset(false);
    setSavedNotice("Sample speaking sessions and vocabulary have been loaded into your workspace.");
  }

  function handleConfirmReset() {
    onResetProgress();
    setConfirmReset(false);
    setSavedNotice("Your local practice history and saved vocabulary have been reset.");
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)] sm:p-7"
      >
        {/* Profile Details */}
        <div>
          <h2 className="text-base font-semibold text-[#141726]">Profile Details</h2>
          <p className="mt-0.5 text-xs text-[#6C728A]">
            Personalize your SpeakMate AI coaching greeting and practice recommendations.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-name" className="block text-xs font-semibold text-[#141726]">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSavedNotice(null);
                }}
                className="mt-1.5 block w-full rounded-xl border border-[#E6E8F0] bg-white px-3.5 py-2.5 text-sm text-[#141726] focus:border-[#635BDB] focus:outline-none focus:ring-2 focus:ring-[#635BDB]/15"
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="block text-xs font-semibold text-[#141726]">
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                readOnly
                value={user.email}
                className="mt-1.5 block w-full rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] px-3.5 py-2.5 text-sm text-[#6C728A]"
              />
            </div>
          </div>

          <div className="mt-4">
            <span className="block text-xs font-semibold text-[#141726]">Learner Role</span>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:max-w-md">
              {(["Student", "Working Professional"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setRole(option);
                    setSavedNotice(null);
                  }}
                  className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    role === option
                      ? "border-[#635BDB] bg-[#F0EEFF] text-[#635BDB]"
                      : "border-[#E6E8F0] bg-white text-[#4B5166] hover:bg-[#F8F9FC]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Proficiency Level Selector */}
        <div className="border-t border-[#E6E8F0] pt-6">
          <h2 className="text-base font-semibold text-[#141726]">Proficiency Level</h2>
          <p className="mt-0.5 text-xs text-[#6C728A]">
            Adjusts AI conversation vocabulary complexity and grammar coaching depth.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PROFICIENCY_LEVELS.map((item) => {
              const active = proficiencyLevel === item.level;
              return (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => {
                    setProficiencyLevel(item.level);
                    setSavedNotice(null);
                  }}
                  className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                    active
                      ? "border-[#635BDB] bg-[#F0EEFF]/80"
                      : "border-[#E6E8F0] bg-white hover:bg-[#F8F9FC]"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      active ? "text-[#635BDB]" : "text-[#141726]"
                    }`}
                  >
                    {item.displayLabel}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4B5166]">{item.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Speaking Goal Selector */}
        <div className="border-t border-[#E6E8F0] pt-6">
          <h2 className="text-base font-semibold text-[#141726]">Daily Speaking Goal</h2>
          <p className="mt-0.5 text-xs text-[#6C728A]">
            Choose how many minutes per day you want to practice speaking English.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {DAILY_GOAL_PRESETS.map((minutes) => {
              const active = dailyGoalMinutes === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => {
                    setDailyGoalMinutes(minutes);
                    setSavedNotice(null);
                  }}
                  className={`rounded-xl border px-4 py-2 font-mono text-xs font-semibold transition-colors tabular-nums cursor-pointer ${
                    active
                      ? "border-[#635BDB] bg-[#635BDB] text-white"
                      : "border-[#E6E8F0] bg-white text-[#4B5166] hover:bg-[#F0EEFF]/60"
                  }`}
                >
                  {minutes} min
                </button>
              );
            })}

            <div className="flex items-center gap-2 pl-2">
              <label htmlFor="custom-goal" className="text-xs text-[#6C728A]">
                Custom:
              </label>
              <input
                id="custom-goal"
                type="number"
                min={5}
                max={180}
                value={dailyGoalMinutes}
                onChange={(e) => {
                  setDailyGoalMinutes(Number(e.target.value));
                  setSavedNotice(null);
                }}
                className="w-20 rounded-xl border border-[#E6E8F0] bg-white px-3 py-2 font-mono text-xs font-semibold text-[#141726] tabular-nums focus:border-[#635BDB] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Communication Goals */}
        <div className="border-t border-[#E6E8F0] pt-6">
          <h2 className="text-base font-semibold text-[#141726]">Focus Goals</h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {COMMUNICATION_GOALS.map((goal) => {
              const checked = goals.includes(goal);
              return (
                <label
                  key={goal}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                    checked
                      ? "border-[#635BDB] bg-[#F0EEFF]/70 text-[#635BDB]"
                      : "border-[#E6E8F0] bg-white text-[#374151] hover:bg-[#F8F9FC]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleGoal(goal)}
                    className="h-4 w-4 rounded border-[#D1D5DB] accent-[#635BDB]"
                  />
                  <span>{goal}</span>
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {savedNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-[#19B5A5]/30 bg-[#E8F8F6] px-3.5 py-2.5 text-xs font-semibold text-[#0F766E]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#19B5A5]" />
            <span>{savedNotice}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E8F0] pt-5">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E6E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#4B5166] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#635BDB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5249C9] cursor-pointer"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </form>

      {/* Sample Data & Reset Controls */}
      <section className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
        <h2 className="text-base font-semibold text-[#141726]">Sample Data &amp; Workspace Reset</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#6C728A]">
          Populate realistic 6-day practice sessions to preview analytics charts, or clear local
          practice progress to start fresh.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSeedSample}
            className="inline-flex items-center gap-2 rounded-xl border border-[#635BDB]/30 bg-[#F0EEFF] px-4 py-2.5 text-xs font-semibold text-[#635BDB] transition-colors hover:bg-[#E5E2FF] cursor-pointer"
          >
            <Database className="h-4 w-4" />
            Load Sample Student Data
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E6E8F0] bg-white px-4 py-2.5 text-xs font-semibold text-[#4B5166] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Practice Progress
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs">
              <span className="font-medium text-red-700">Clear saved sessions &amp; vocab?</span>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="rounded-lg bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg bg-white px-3 py-1 font-medium text-[#4B5166] hover:bg-[#F8F9FC] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
