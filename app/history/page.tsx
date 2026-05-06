"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SessionRecord = {
  id: string;
  type: string;
  mode: string;
  domain?: string;
  tech?: string;
  examType?: string;
  subject?: string;
  focusArea?: string;
  avgScore?: number;
  totalQ: number;
  completedAt: string;
  scores: {
    id: string;
    question: string;
    answer: string;
    score: number;
    feedback?: string;
  }[];
};

function getScoreColor(s: number) {
  if (s >= 8) return "#10b981";
  if (s >= 6) return "#6366f1";
  if (s >= 4) return "#f59e0b";
  return "#ef4444";
}

function getTypeIcon(type: string) {
  if (type === "interview") return "🎯";
  if (type === "exam") return "📚";
  return "🧠";
}

function getTypeColor(type: string) {
  if (type === "interview") return "#6366f1";
  if (type === "exam") return "#10b981";
  return "#f59e0b";
}

function getModeIcon(mode: string) {
  if (mode === "voice") return "🎙️";
  if (mode === "video") return "🎥";
  return "💬";
}

function getSessionLabel(s: SessionRecord) {
  if (s.type === "interview")
    return `${s.domain || ""} • ${s.tech || ""}`.trim().replace(/^•\s*/, "");
  if (s.type === "exam") return s.subject || s.examType || "Exam";
  return s.focusArea || "Personality";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "interview" | "exam" | "personality"
  >("all");

  useEffect(() => {
    fetch("/api/get-history")
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? sessions : sessions.filter((s) => s.type === filter);

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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>
              Session History 📋
            </h1>
            <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>
              {sessions.length} sessions completed
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent",
              border: "1px solid #2a2a4a",
              borderRadius: 10,
              padding: "8px 16px",
              color: "#888",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ← Home
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["all", "interview", "exam", "personality"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${filter === f ? "#6366f1" : "#2a2a4a"}`,
                background: filter === f ? "#6366f122" : "transparent",
                color: filter === f ? "#6366f1" : "#555",
                textTransform: "capitalize",
              }}
            >
              {f === "all"
                ? "All"
                : f === "interview"
                  ? "🎯 Interview"
                  : f === "exam"
                    ? "📚 Exam"
                    : "🧠 Personality"}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            style={{ textAlign: "center", padding: "60px 0", color: "#555" }}
          >
            Loading sessions...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ color: "#555", fontSize: 14 }}>
              No sessions yet. Start practicing!
            </p>
            <button
              onClick={() => router.push("/setup")}
              style={{
                marginTop: 16,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: 12,
                padding: "12px 28px",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Start a Session →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((session) => {
              const color = getTypeColor(session.type);
              const isOpen = expanded === session.id;
              return (
                <div
                  key={session.id}
                  style={{
                    background: "#111118",
                    border: `1px solid ${isOpen ? color : "#1e1e2e"}`,
                    borderRadius: 16,
                    overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}
                >
                  {/* Session header */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : session.id)}
                    style={{
                      padding: "16px 20px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: `${color}22`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {getTypeIcon(session.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#fff",
                          marginBottom: 3,
                        }}
                      >
                        {getSessionLabel(session)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#555",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          {getModeIcon(session.mode)} {session.mode}
                        </span>
                        <span>•</span>
                        <span>{session.totalQ} questions</span>
                        <span>•</span>
                        <span>{formatDate(session.completedAt)}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {session.avgScore !== null &&
                        session.avgScore !== undefined && (
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 800,
                              color: getScoreColor(session.avgScore),
                            }}
                          >
                            {Math.round(session.avgScore)}
                            <span style={{ fontSize: 12, color: "#555" }}>
                              /10
                            </span>
                          </div>
                        )}
                      <div
                        style={{
                          fontSize: 10,
                          color: isOpen ? color : "#333",
                          marginTop: 2,
                        }}
                      >
                        {isOpen ? "▲" : "▼"}
                      </div>
                    </div>
                  </div>

                  {/* Expanded scores */}
                  {isOpen && (
                    <div
                      style={{
                        borderTop: "1px solid #1e1e2e",
                        padding: "16px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {session.scores.map((score, i) => (
                        <div
                          key={score.id}
                          style={{
                            background: "#0d0d14",
                            borderRadius: 12,
                            padding: "12px 16px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: "#555",
                                fontWeight: 600,
                              }}
                            >
                              Q{i + 1}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: getScoreColor(score.score),
                                background: `${getScoreColor(score.score)}15`,
                                padding: "2px 8px",
                                borderRadius: 20,
                              }}
                            >
                              {score.score}/10
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: 13,
                              color: "#aaa",
                              margin: "0 0 6px",
                              lineHeight: 1.5,
                            }}
                          >
                            {score.question.slice(0, 120)}
                            {score.question.length > 120 ? "..." : ""}
                          </p>
                          {score.feedback && (
                            <p
                              style={{
                                fontSize: 12,
                                color: "#fcd34d",
                                margin: 0,
                                background: "#1c1a10",
                                borderRadius: 8,
                                padding: "6px 10px",
                              }}
                            >
                              {score.feedback.slice(0, 150)}
                              {score.feedback.length > 150 ? "..." : ""}
                            </p>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => router.push("/setup")}
                        style={{
                          alignSelf: "flex-end",
                          background: `linear-gradient(135deg, ${color}, ${color}88)`,
                          border: "none",
                          borderRadius: 10,
                          padding: "8px 20px",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          marginTop: 4,
                        }}
                      >
                        Practice Again →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
