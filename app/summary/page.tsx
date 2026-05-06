"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSummary, SessionSummary, SessionScore } from "@/lib/session";

type AISummary = {
  strengths: string[];
  improvements: { topic: string; tip: string }[];
  overallTip: string;
};

function getScoreColor(s: number) {
  if (s >= 8) return "#10b981";
  if (s >= 6) return "#6366f1";
  if (s >= 4) return "#f59e0b";
  return "#ef4444";
}
function getScoreLabel(s: number) {
  if (s >= 8) return "Strong";
  if (s >= 6) return "Good";
  if (s >= 4) return "Needs Work";
  return "Weak";
}
function getVerdict(avg: number) {
  if (avg >= 8)
    return {
      label: "Interview Ready 🚀",
      color: "#10b981",
      desc: "You performed strongly. Keep practicing to stay sharp.",
    };
  if (avg >= 6)
    return {
      label: "Almost There 💪",
      color: "#6366f1",
      desc: "Good foundation. Focus on the areas below to level up.",
    };
  if (avg >= 4)
    return {
      label: "Keep Practicing 📚",
      color: "#f59e0b",
      desc: "You have the basics. Targeted practice will help.",
    };
  return {
    label: "More Prep Needed 🔧",
    color: "#ef4444",
    desc: "Go back to fundamentals and practice daily.",
  };
}
function extractQuestion(msg: string): string {
  const sentences = msg.split(/(?<=[.!?])\s+/);
  const q = [...sentences].reverse().find((s) => s.trim().endsWith("?"));
  if (q) return q.trim();
  const m = msg.match(/[—–]\s*([^—–]+\?)\s*$/);
  if (m) return m[1].trim();
  return msg.slice(0, 120);
}
function toYou(text: string): string {
  return text
    .replace(/\b(Gurkirat|the candidate|the interviewee)\b/gi, "you")
    .replace(/\bHe\b/g, "You")
    .replace(/\bShe\b/g, "You")
    .replace(/\bhe\b/g, "you")
    .replace(/\bshe\b/g, "you")
    .replace(/\bHis\b/g, "Your")
    .replace(/\bHer\b/g, "Your")
    .replace(/\bhis\b/g, "your")
    .replace(/\bher\b/g, "your")
    .replace(/\. you\b/g, ". You");
}

function QuestionCard({
  entry,
  index,
}: {
  entry: SessionScore;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const color = getScoreColor(entry.score);
  const label = getScoreLabel(entry.score);
  const q = extractQuestion(entry.question);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#111118",
        border: `1px solid ${hovered ? "#6366f1" : "#1e1e2e"}`,
        borderRadius: 16,
        padding: "16px 18px",
        cursor: "default",
        transition: "border-color 0.25s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: hovered ? 10 : 0,
        }}
      >
        <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>
          Q{index + 1}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color,
              background: `${color}15`,
              padding: "3px 10px",
              borderRadius: 20,
            }}
          >
            {entry.score}/10 — {label}
          </span>
          <span
            style={{
              fontSize: 10,
              color: hovered ? "#6366f1" : "#333",
              transition: "transform 0.3s, color 0.2s",
              display: "inline-block",
              transform: hovered ? "rotate(180deg)" : "none",
            }}
          >
            ▼
          </span>
        </div>
      </div>

      <p
        style={{
          fontSize: 13,
          color: "#e2e2f0",
          fontWeight: 600,
          lineHeight: 1.5,
          margin: hovered ? "0 0 10px" : 0,
        }}
      >
        {q}
      </p>

      <div
        style={{
          overflow: "hidden",
          maxHeight: hovered ? "800px" : "0",
          transition: "max-height 0.4s ease",
        }}
      >
        <div
          style={{
            background: "#0d0d14",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: entry.feedback ? 8 : 0,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#555",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 5,
            }}
          >
            Your Answer
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#aaa",
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {entry.answer}
          </p>
        </div>
        {entry.feedback && (
          <div
            style={{
              background: "#1c1a10",
              border: "1px solid #3a3010",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#f59e0b",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              Suggestion
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#fcd34d",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {toYou(entry.feedback)}
            </p>
          </div>
        )}
        {entry.audioMetrics && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            {[
              {
                l: "🎙️ Words",
                v: `${entry.audioMetrics.wordCount}`,
                c: "#6366f1",
              },
              {
                l: "⚡ Pace",
                v: `${entry.audioMetrics.wordsPerMinute} wpm`,
                c:
                  entry.audioMetrics.wordsPerMinute > 180 ||
                  entry.audioMetrics.wordsPerMinute < 90
                    ? "#f59e0b"
                    : "#10b981",
              },
              {
                l: "💬 Fillers",
                v: `${entry.audioMetrics.fillerCount}`,
                c:
                  entry.audioMetrics.fillerCount > 5
                    ? "#ef4444"
                    : entry.audioMetrics.fillerCount > 2
                      ? "#f59e0b"
                      : "#10b981",
              },
            ].map((b) => (
              <span
                key={b.l}
                style={{
                  fontSize: 11,
                  background: "#1a1a2e",
                  borderRadius: 6,
                  padding: "3px 8px",
                  color: b.c,
                }}
              >
                {b.l}: {b.v}
              </span>
            ))}
          </div>
        )}
        {entry.videoMetrics && entry.videoMetrics.samplesCount > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                background: "#1a1a2e",
                borderRadius: 6,
                padding: "3px 8px",
                color:
                  entry.videoMetrics.eyeContactPercent > 70
                    ? "#10b981"
                    : "#f59e0b",
              }}
            >
              👁️ Eye: {entry.videoMetrics.eyeContactPercent}%
            </span>
            <span
              style={{
                fontSize: 11,
                background: "#1a1a2e",
                borderRadius: 6,
                padding: "3px 8px",
                color:
                  entry.videoMetrics.headStraightPercent > 80
                    ? "#10b981"
                    : "#f59e0b",
              }}
            >
              🎯 Posture: {entry.videoMetrics.headStraightPercent}%
            </span>
          </div>
        )}
      </div>

      {!hovered && (
        <p style={{ fontSize: 10, color: "#333", margin: "6px 0 0" }}>
          Hover to see your answer
        </p>
      )}
    </div>
  );
}

export default function SummaryPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const s = loadSummary();
    if (s) {
      setSummary(s);
      if (s.scores.length > 0) {
        setLoadingAI(true);
        fetch("/api/generate-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scores: s.scores,
            domain: s.config.domain || s.config.subject || s.config.focusArea,
            tech: s.config.tech,
            candidateName: s.config.candidateName,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            setAiSummary(d);
            setLoadingAI(false);
          })
          .catch(() => setLoadingAI(false));
      }
    }
  }, []);

  const avgScore =
    summary && summary.scores.length > 0
      ? Math.round(
          summary.scores.reduce((s, e) => s + e.score, 0) /
            summary.scores.length,
        )
      : null;
  const verdict = avgScore !== null ? getVerdict(avgScore) : null;

  const cfg = summary?.config;
  const accentColor =
    cfg?.type === "interview"
      ? "#6366f1"
      : cfg?.type === "exam"
        ? "#10b981"
        : "#f59e0b";
  const sessionLabel =
    cfg?.type === "interview"
      ? `${cfg.domain} • ${cfg.tech}`
      : cfg?.type === "exam"
        ? `${cfg.subject || cfg.examType}`
        : cfg?.focusArea || "Personality";
  const firstName = cfg?.candidateName?.split(" ")[0] || "";

  const card = {
    background: "#111118",
    border: "1px solid #1e1e2e",
    borderRadius: 16,
    padding: "18px 22px",
    marginBottom: 14,
  };
  const sTitle = {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 12,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#e2e2f0",
        fontFamily: "'Segoe UI', sans-serif",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          Session Complete 🎯
        </h1>
        {summary && (
          <p
            style={{
              textAlign: "center",
              color: accentColor,
              marginBottom: 32,
              fontSize: 13,
            }}
          >
            {sessionLabel}
            {firstName ? ` • ${firstName}` : ""}
          </p>
        )}

        {summary ? (
          <>
            {avgScore !== null && verdict && (
              <div
                style={{
                  ...card,
                  textAlign: "center",
                  border: `1px solid ${verdict.color}33`,
                }}
              >
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 800,
                    color: verdict.color,
                    lineHeight: 1,
                  }}
                >
                  {avgScore}
                  <span style={{ fontSize: 20, color: "#555" }}>/10</span>
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: verdict.color,
                    marginTop: 8,
                  }}
                >
                  {verdict.label}
                </div>
                <p
                  style={{
                    color: "#888",
                    fontSize: 13,
                    marginTop: 5,
                    marginBottom: 0,
                  }}
                >
                  {verdict.desc}
                </p>
              </div>
            )}

            <div
              style={{
                ...card,
                background: "#0f1a10",
                border: "1px solid #103a10",
              }}
            >
              <div style={{ ...sTitle, color: "#10b981" }}>
                ✅ Your Strengths
              </div>
              {loadingAI ? (
                <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
                  Analyzing...
                </p>
              ) : (aiSummary?.strengths?.length ?? 0) > 0 ? (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                  }}
                >
                  {aiSummary.strengths.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        gap: 8,
                        fontSize: 13,
                        color: "#6ee7b7",
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          color: "#10b981",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        •
                      </span>
                      <span>{toYou(s)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
                  Complete more sessions to see patterns.
                </p>
              )}
            </div>

            {(aiSummary?.improvements?.length ?? 0) > 0 && (
              <div
                style={{
                  ...card,
                  background: "#1a1010",
                  border: "1px solid #3a1010",
                }}
              >
                <div style={{ ...sTitle, color: "#ef4444" }}>
                  ⚠️ Areas to Improve
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {aiSummary.improvements.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#2a1010",
                        borderRadius: 10,
                        padding: "10px 14px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#ef4444",
                          marginBottom: 4,
                        }}
                      >
                        {item.topic}
                      </div>
                      <div style={{ fontSize: 13, color: "#fca5a5" }}>
                        {toYou(item.tip)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ ...sTitle, color: "#aaa", marginBottom: 10 }}>
              Question Breakdown
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {summary.scores.map((e, i) => (
                <QuestionCard key={i} entry={e} index={i} />
              ))}
            </div>

            {(loadingAI || aiSummary?.overallTip) && (
              <div
                style={{
                  ...card,
                  background: "#0f0f1a",
                  border: "1px solid #2a2a4a",
                  marginBottom: 20,
                }}
              >
                <div style={{ ...sTitle, color: "#6366f1" }}>
                  💡 Key Takeaway
                </div>
                {loadingAI && !aiSummary?.overallTip ? (
                  <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
                    Generating...
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#a5b4fc",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {toYou(aiSummary?.overallTip || "")}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ ...card, textAlign: "center" as const }}>
            <p style={{ color: "#888", margin: 0 }}>
              No session data found. Complete a session to see your summary.
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("/setup")}
            style={{
              flex: 1,
              padding: "13px",
              background: "transparent",
              border: "1px solid #2a2a4a",
              borderRadius: 12,
              color: "#888",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            New Session
          </button>
          <button
            onClick={() => router.push("/")}
            style={{
              flex: 1,
              padding: "13px",
              background: `linear-gradient(135deg, ${accentColor || "#6366f1"}, ${accentColor || "#6366f1"}88)`,
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Home 🏠
          </button>
        </div>
      </div>
    </div>
  );
}
