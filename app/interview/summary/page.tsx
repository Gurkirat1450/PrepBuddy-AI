"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ScoreEntry = {
  question: string;
  answer: string;
  score: number;
  feedback: string;
};

type SummaryData = {
  scores: ScoreEntry[];
  domain: string;
  tech: string;
};

function getScoreColor(score: number) {
  if (score >= 8) return "#10b981";
  if (score >= 6) return "#6366f1";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score: number) {
  if (score >= 8) return "Strong";
  if (score >= 6) return "Good";
  if (score >= 4) return "Needs Work";
  return "Weak";
}

function getOverallVerdict(avg: number) {
  if (avg >= 8)
    return {
      label: "Interview Ready 🚀",
      color: "#10b981",
      desc: "You performed strongly across the board. Keep practicing to stay sharp.",
    };
  if (avg >= 6)
    return {
      label: "Almost There 💪",
      color: "#6366f1",
      desc: "Good foundation. Focus on the weak areas below to level up.",
    };
  if (avg >= 4)
    return {
      label: "Keep Practicing 📚",
      color: "#f59e0b",
      desc: "You have the basics but need more depth. Targeted practice will help.",
    };
  return {
    label: "More Prep Needed 🔧",
    color: "#ef4444",
    desc: "Go back to fundamentals and practice daily. You'll get there.",
  };
}

export default function SummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("interviewSummary");
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  const avgScore =
    data && data.scores.length > 0
      ? Math.round(
          data.scores.reduce((s, e) => s + e.score, 0) / data.scores.length,
        )
      : null;

  const verdict = avgScore !== null ? getOverallVerdict(avgScore) : null;

  // Identify weak areas (score < 6)
  const weakAreas =
    data?.scores.filter((e) => e.score < 6).map((e) => e.question) || [];

  const strongAreas =
    data?.scores.filter((e) => e.score >= 7).map((e) => e.question) || [];

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
            fontSize: 32,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          Interview Complete 🎯
        </h1>

        {data ? (
          <>
            <p
              style={{
                textAlign: "center",
                color: "#6366f1",
                marginBottom: 32,
                fontSize: 14,
              }}
            >
              {data.domain} • {data.tech}
            </p>

            {/* Overall score card */}
            {avgScore !== null && verdict && (
              <div
                style={{
                  background: "#111118",
                  border: `1px solid ${verdict.color}33`,
                  borderRadius: 20,
                  padding: "28px 24px",
                  marginBottom: 24,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: verdict.color,
                    lineHeight: 1,
                  }}
                >
                  {avgScore}
                  <span style={{ fontSize: 24, color: "#555" }}>/10</span>
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: verdict.color,
                    marginTop: 8,
                  }}
                >
                  {verdict.label}
                </div>
                <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
                  {verdict.desc}
                </p>
              </div>
            )}

            {/* Areas to work on */}
            {weakAreas.length > 0 && (
              <div
                style={{
                  background: "#1a1010",
                  border: "1px solid #3a1010",
                  borderRadius: 16,
                  padding: "20px 24px",
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#ef4444",
                    marginBottom: 12,
                  }}
                >
                  ⚠️ Areas to Work On
                </h2>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {weakAreas.map((q, i) => (
                    <li
                      key={i}
                      style={{
                        background: "#2a1010",
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontSize: 13,
                        color: "#fca5a5",
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ color: "#ef4444", flexShrink: 0 }}>•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strong areas */}
            {strongAreas.length > 0 && (
              <div
                style={{
                  background: "#0f1a10",
                  border: "1px solid #103a10",
                  borderRadius: 16,
                  padding: "20px 24px",
                  marginBottom: 24,
                }}
              >
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#10b981",
                    marginBottom: 12,
                  }}
                >
                  ✅ Strengths
                </h2>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {strongAreas.map((q, i) => (
                    <li
                      key={i}
                      style={{
                        background: "#0a2a10",
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontSize: 13,
                        color: "#6ee7b7",
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ color: "#10b981", flexShrink: 0 }}>•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-question breakdown */}
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#aaa",
                marginBottom: 12,
              }}
            >
              Question Breakdown
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 28,
              }}
            >
              {data.scores.map((entry, i) => {
                const color = getScoreColor(entry.score);
                const label = getScoreLabel(entry.score);
                return (
                  <div
                    key={i}
                    style={{
                      background: "#111118",
                      border: "1px solid #1e1e2e",
                      borderRadius: 16,
                      padding: "16px 20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{ fontSize: 12, color: "#555", fontWeight: 600 }}
                      >
                        Q{i + 1}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color,
                          background: `${color}15`,
                          padding: "3px 10px",
                          borderRadius: 20,
                        }}
                      >
                        {entry.score}/10 — {label}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#ccc",
                        marginBottom: 6,
                        fontWeight: 500,
                      }}
                    >
                      {entry.question}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#666",
                        fontStyle: "italic",
                        marginBottom: entry.feedback ? 8 : 0,
                      }}
                    >
                      Your answer: "{entry.answer.slice(0, 100)}
                      {entry.answer.length > 100 ? "…" : ""}"
                    </p>
                    {entry.feedback && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#888",
                          borderTop: "1px solid #1e1e2e",
                          paddingTop: 8,
                          marginTop: 4,
                        }}
                      >
                        {entry.feedback.slice(0, 200)}
                        {entry.feedback.length > 200 ? "…" : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div
            style={{
              background: "#111118",
              borderRadius: 20,
              padding: "32px",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            <p style={{ color: "#888" }}>
              Session complete. Start a new session to track your scores.
            </p>
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          style={{
            width: "100%",
            padding: "14px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none",
            borderRadius: 14,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Start New Session 🔁
        </button>
      </div>
    </div>
  );
}
