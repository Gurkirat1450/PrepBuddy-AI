// Shared session configuration stored in sessionStorage
// Key: "prepbuddy_session"

export type SessionMode = "text" | "voice" | "video";
export type SessionType = "interview" | "exam" | "personality";

export interface SessionConfig {
  type: SessionType;
  mode: SessionMode;

  // Interview specific
  domain?: string;
  track?: string;
  tech?: string;
  candidateName?: string;
  resumeText?: string;
  resumeQuestions?: string[];

  // Exam specific
  examType?: string;
  subject?: string;
  topicFocus?: "high" | "weak" | "all";

  // Personality specific
  focusArea?: string;
  goals?: string[]; // e.g. ["confidence", "hr"]
}

export interface SessionScore {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  audioMetrics?: {
    fillerCount: number;
    fillerWords: string[];
    wordCount: number;
    speakingTimeSeconds: number;
    wordsPerMinute: number;
  };
  videoMetrics?: {
    eyeContactPercent: number;
    headStraightPercent: number;
    expressionNotes: string[];
    samplesCount: number;
  };
}

export interface SessionSummary {
  config: SessionConfig;
  scores: SessionScore[];
  completedAt: string;
}

const SESSION_KEY = "prepbuddy_session";
const SUMMARY_KEY = "prepbuddy_summary";

export function saveSession(config: SessionConfig) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(config));
}

export function loadSession(): SessionConfig | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSummary(summary: SessionSummary) {
  sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
}

export function loadSummary(): SessionSummary | null {
  try {
    const raw = sessionStorage.getItem(SUMMARY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SUMMARY_KEY);
}
