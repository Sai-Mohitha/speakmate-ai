import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { signInWithGooglePopup } from "../firebase";
import type { UserProfile } from "../types";
import { fetchSqlWorkspace } from "../utils/sqlStore";
import {
  loginDemoUser,
  loginOrCreatePreseededDemoAccount,
  registerDemoUser,
} from "../utils/storage";

interface AuthPageProps {
  initialMode?: "login" | "register";
  onBackToLanding: () => void;
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthPage({
  initialMode = "login",
  onBackToLanding,
  onAuthenticated,
}: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"Student" | "Working Professional">("Student");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [forgotNotice, setForgotNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setFieldErrors({});
    setForgotNotice(false);
  }, [initialMode]);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setError(null);
    setFieldErrors({});
    setForgotNotice(false);
    setShowPassword(false);
  }

  async function handleGoogleSignIn() {
    setError(null);
    setForgotNotice(false);
    setGoogleLoading(true);
    try {
      await signInWithGooglePopup();
      const workspace = await fetchSqlWorkspace();
      onAuthenticated(workspace.profile);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError("Google sign-in window was closed before completing.");
      } else if (code === "auth/popup-blocked") {
        setError(
          "Pop-up was blocked by your browser. Please allow pop-ups or continue with email and password."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Could not complete Google Sign-In. You can still continue with email and password."
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setForgotNotice(false);

    const nextFieldErrors: { name?: string; email?: string; password?: string } = {};
    if (mode === "register" && name.trim().length < 2) {
      nextFieldErrors.name = "Please enter your full name (at least 2 characters).";
    }
    if (!validateEmail(email)) {
      nextFieldErrors.email = "Please enter a valid email address.";
    }
    if (password.length < 6) {
      nextFieldErrors.password = "Password must be at least 6 characters long.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      if (mode === "register") {
        const result = await registerDemoUser({ name, email, password, role });
        if (result.error || !result.user) {
          setError(result.error ?? "Unable to create account.");
          return;
        }
        onAuthenticated(result.user);
      } else {
        const result = await loginDemoUser(email, password);
        if (result.error || !result.user) {
          setError(result.error ?? "Unable to sign in.");
          return;
        }
        onAuthenticated(result.user);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadSampleLearner() {
    setError(null);
    setFieldErrors({});
    setForgotNotice(false);
    setSubmitting(true);
    try {
      const sampleUser = await loginOrCreatePreseededDemoAccount();
      onAuthenticated(sampleUser);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#141726]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 lg:py-14">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4B5166] transition-colors hover:text-[#635BDB] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SpeakMate AI
        </button>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Context Panel */}
          <div className="rounded-2xl bg-[#F0EEFF] p-7 lg:col-span-5">
            <p className="text-sm font-bold text-[#635BDB]">SpeakMate AI</p>
            <h1
              className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#141726]"
              style={{ textWrap: "balance" }}
            >
              {mode === "register"
                ? "Start speaking English with confidence."
                : "Welcome back to your speaking studio."}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#4B5166]">
              Practice conversations, live voice calls, 3D stage presentations, peer partner
              matching, and mentorship in one unified communication workspace.
            </p>

            <ul className="mt-6 space-y-3 border-t border-[#635BDB]/15 pt-6 text-sm text-[#141726]">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#19B5A5]" />
                <span>AI conversation practice, Live Voice Call &amp; audio transcription</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#19B5A5]" />
                <span>Instant grammar rules, vocabulary bank &amp; Search-grounded Coach Chat</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#19B5A5]" />
                <span>3D Public Speaking Auditorium, Partner Matching &amp; Mentorship</span>
              </li>
            </ul>

            <div className="mt-7 rounded-xl border border-[#E6E8F0] bg-white p-4 text-xs leading-relaxed text-[#4B5166]">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#635BDB]" />
                <div>
                  <p className="font-semibold text-[#141726]">Cloud Sync &amp; Local Storage</p>
                  <p className="mt-1">
                    Continue with Google for cross-device cloud sync, or use an email workspace
                    stored privately in your browser.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Focused Auth Card */}
          <div className="rounded-2xl border border-[#E6E8F0] bg-white p-6 shadow-[0_2px_12px_rgba(20,23,38,0.04)] sm:p-8 lg:col-span-7">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#141726]">
                {mode === "register" ? "Create your account" : "Sign in to SpeakMate AI"}
              </h2>
              <p className="mt-1 text-xs text-[#6C728A]">
                {mode === "register"
                  ? "Choose Google for cloud sync, or create your account with email."
                  : "Enter your email and password or continue with Google."}
              </p>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || submitting}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#E6E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#141726] transition-colors hover:bg-[#F8F9FC] disabled:opacity-60 cursor-pointer"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#635BDB]" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                    />
                    <path
                      fill="#34A853"
                      d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                )}
                Continue with Google
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E6E8F0]" />
              <span className="text-xs font-medium text-[#6C728A]">
                {mode === "register" ? "or create an account with email" : "or sign in with email"}
              </span>
              <div className="h-px flex-1 bg-[#E6E8F0]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === "register" && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-semibold text-[#141726]">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                    }}
                    placeholder="e.g., Mohitha Reddy"
                    required
                    className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#141726] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 ${
                      fieldErrors.name
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                        : "border-[#E6E8F0] focus:border-[#635BDB] focus:ring-[#635BDB]/15"
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-[#141726]">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="you@example.com"
                  required
                  className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#141726] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 ${
                    fieldErrors.email
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                      : "border-[#E6E8F0] focus:border-[#635BDB] focus:ring-[#635BDB]/15"
                  }`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-[#141726]"
                  >
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setForgotNotice((prev) => !prev)}
                      className="text-xs font-medium text-[#635BDB] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((p) => ({ ...p, password: undefined }));
                      }
                    }}
                    placeholder={
                      mode === "register" ? "Minimum 6 characters" : "Enter your password"
                    }
                    required
                    minLength={6}
                    className={`block w-full rounded-xl border bg-white py-2.5 pl-3.5 pr-10 text-sm text-[#141726] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 ${
                      fieldErrors.password
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                        : "border-[#E6E8F0] focus:border-[#635BDB] focus:ring-[#635BDB]/15"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[#6C728A] hover:text-[#141726] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              {mode === "register" && (
                <div>
                  <span className="block text-xs font-semibold text-[#141726]">Role</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                    {(["Student", "Working Professional"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setRole(option)}
                        className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
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
              )}

              {forgotNotice && mode === "login" && (
                <div className="rounded-xl border border-[#E6E8F0] bg-[#F8F9FC] px-3.5 py-2.5 text-xs leading-relaxed text-[#4B5166]">
                  Email accounts are stored locally in this browser. Sign in with{" "}
                  <span className="font-semibold text-[#141726]">Google</span> for cloud-managed
                  access, create a new account, or load the sample learner workspace below.
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || googleLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#635BDB] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5249C9] disabled:opacity-60 cursor-pointer"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "register" ? "Create Account" : "Sign In"}
              </button>
            </form>

            {/* Clean Sign In / Create Account Switcher + Subtle Sample Learner Helper */}
            <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-[#E6E8F0] pt-5 sm:flex-row">
              <p className="text-xs text-[#4B5166]">
                {mode === "login" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("register")}
                      className="font-semibold text-[#635BDB] hover:underline cursor-pointer"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-semibold text-[#635BDB] hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={handleLoadSampleLearner}
                disabled={submitting || googleLoading}
                className="text-xs font-medium text-[#6C728A] underline decoration-[#D7DBE8] underline-offset-4 transition-colors hover:text-[#141726] hover:decoration-[#141726] disabled:opacity-50 cursor-pointer"
              >
                Load Sample Learner
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
