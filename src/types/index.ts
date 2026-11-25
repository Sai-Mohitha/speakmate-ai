export type ProficiencyLevel = "Beginner" | "Intermediate" | "Advanced";

export type PracticeMode =
  | "Friendly Conversation"
  | "HR Interview Practice"
  | "Technical Interview Practice"
  | "Public Speaking Practice"
  | "Professional Workplace Communication";

export type SpeakingTopic =
  | "Daily Life"
  | "Job Interviews"
  | "Education"
  | "Technology"
  | "General Conversation";

export type AppView =
  | "landing"
  | "auth"
  | "dashboard"
  | "ai-practice"
  | "coach-chat"
  | "stage-3d"
  | "media-studio"
  | "find-partner"
  | "mentorship"
  | "progress"
  | "profile";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: "Student" | "Working Professional";
  proficiencyLevel: ProficiencyLevel;
  communicationGoals: string[];
  preferredMode: PracticeMode;
  dailyGoalMinutes: number;
  preferredAvailability: string;
  createdAt: string;
  isPreseededDemo?: boolean;
  authProvider?: "google" | "local-demo";
  photoURL?: string;
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  category: string;
}

export interface VocabularyItem {
  word: string;
  partOfSpeech?: string;
  meaning: string;
  example: string;
  learnedAt?: string;
  mode?: PracticeMode;
  topic?: SpeakingTopic;
}

export interface ChatTurn {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  hasGrammarIssue?: boolean;
  grammarCorrection?: GrammarCorrection;
  naturalAlternative?: string;
  vocabularyTip?: VocabularyItem;
  encouragement?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatbotMessageRecord {
  id: string;
  userId: string;
  role: "user" | "model";
  text: string;
  persona: string;
  modelUsed: string;
  sources?: GroundingSource[];
  createdAt: string;
}

export interface SessionSummary {
  overview: string;
  strengths: string[];
  focusAreas: string[];
  recommendedNextStep: string;
}

export interface PracticeSessionRecord {
  id: string;
  userId: string;
  mode: PracticeMode;
  level: ProficiencyLevel;
  topic?: SpeakingTopic;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  messageCount: number;
  corrections: GrammarCorrection[];
  vocabularyLearned: VocabularyItem[];
  summary?: SessionSummary;
}

export interface PartnerProfile {
  id: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  proficiencyLevel: ProficiencyLevel;
  primaryTopic: string;
  secondaryTopics: string[];
  practicePurpose: string;
  availability: string[];
  bio: string;
  isDemoUser: true;
  starterPrompt: string;
}

export interface MatchCriteria {
  proficiencyLevel: ProficiencyLevel;
  topic: string;
  purpose: string;
  availability: string;
}

export interface MatchBreakdownItem {
  label: string;
  weight: number;
  earned: number;
  reason: string;
}

export interface MatchResult {
  partner: PartnerProfile;
  score: number;
  statusLabel: "Strong Match" | "Good Match" | "Moderate Match";
  breakdown: MatchBreakdownItem[];
}

export interface CoachProfile {
  id: string;
  name: string;
  title: string;
  expertise: string;
  focusAreas: string[];
  biography: string;
  sampleExperience: string;
  avatarUrl: string;
  availableSlots: string[];
  isSampleCoach: true;
}

export interface MentorshipBooking {
  id: string;
  userId: string;
  coachId: string;
  coachName: string;
  coachExpertise: string;
  preferredDate: string;
  preferredTime: string;
  sessionPurpose: string;
  createdAt: string;
  status: "Demo Request Saved";
  isDemoBooking: true;
}
