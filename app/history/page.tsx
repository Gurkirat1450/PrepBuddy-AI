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
    wordsPerMinute?: number;
    fillerCount?: number;
    eyeContactPct?: number;
  }[];
};

function getScoreColor(s: number) {
  if (s >= 8) return "#10b981";
  if (s >= 6) return "#6366f1";
  if (s >= 4) return "#f59e0b";
  return "#ef4444";
}
function getTypeIcon(type: string) {
  return type === "interview" ? "🎯" : type === "exam" ? "📚" : "🧠";
}
function getTypeColor(type: string) {
  return type === "interview"
    ? "#6366f1"
    : type === "exam"
      ? "#10b981"
      : "#f59e0b";
}
function getModeIcon(mode: string) {
  return mode === "voice" ? "🎙️" : mode === "video" ? "🎥" : "💬";
}
function getSessionLabel(s: SessionRecord) {
  if (s.type === "interview")
    return [s.domain, s.tech].filter(Boolean).join(" • ") || "Interview";
  if (s.type === "exam") return s.subject || s.examType || "Exam";
  return s.focusArea || "Personality";
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Simple SVG line graph
function ProgressGraph({ sessions }: { sessions: SessionRecord[] }) {
  const data = [...sessions]
    .reverse()
    .filter((s) => s.avgScore !== null && s.avgScore !== undefined);
  if (data.length < 2)
    return (
      <div
        style={{
          height: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#333",
          fontSize: 13,
        }}
      >
        Complete at least 2 sessions to see your progress graph
      </div>
    );

  const scores = data.map((s) => s.avgScore as number);
  const w = 600;
  const h = 120;
  const pad = 20;
  const minS = Math.min(...scores, 0);
  const maxS = Math.max(...scores, 10);
  const xStep = (w - pad * 2) / (scores.length - 1);
  const yScale = (h - pad * 2) / (maxS - minS || 1);

  const points = scores.map((s, i) => ({
    x: pad + i * xStep,
    y: h - pad - (s - minS) * yScale,
    score: s,
    label: getSessionLabel(data[i]),
    date: formatDate(data[i].completedAt),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id="graphGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[2, 4, 6, 8, 10].map((v) => {
          const y = h - pad - (v - minS) * yScale;
          return y > 0 && y < h ? (
            <g key={v}>
              <line
                x1={pad}
                y1={y}
                x2={w - pad}
                y2={y}
                stroke="#1e1e2e"
                strokeWidth="1"
              />
              <text
                x={pad - 4}
                y={y + 4}
                fill="#333"
                fontSize="9"
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          ) : null;
        })}
        {/* Area fill */}
        <path d={areaD} fill="url(#graphGrad)" />
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {points.map((p, i) => (
          <g
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 6 : 4}
              fill={getScoreColor(p.score)}
              stroke="#0a0a0f"
              strokeWidth="2"
            />
          </g>
        ))}
        {/* Hover tooltip */}
        {hovered !== null &&
          (() => {
            const p = points[hovered];
            const tx = Math.min(Math.max(p.x - 60, 0), w - 140);
            return (
              <g>
                <rect
                  x={tx}
                  y={p.y - 44}
                  width="130"
                  height="38"
                  rx="6"
                  fill="#1a1a2e"
                  stroke="#2a2a4a"
                />
                <text
                  x={tx + 8}
                  y={p.y - 30}
                  fill="#fff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {p.score}/10 —{" "}
                  {getScoreColor(p.score) === "#10b981"
                    ? "Strong"
                    : p.score >= 6
                      ? "Good"
                      : "Keep Going"}
                </text>
                <text x={tx + 8} y={p.y - 16} fill="#666" fontSize="9">
                  {p.label.slice(0, 18)}
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "interview" | "exam" | "personality"
  >("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/get-history")
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    setDeleting(id);
    await fetch("/api/delete-session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  };

  const filtered =
    filter === "all" ? sessions : sessions.filter((s) => s.type === filter);
  const scores = sessions.map((s) => s.avgScore).filter(Boolean) as number[];
  const avgScore = scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;
  const bestScore = scores.length ? Math.max(...scores).toFixed(1) : null;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = sessions.filter(
    (s) => new Date(s.completedAt) > weekAgo,
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#e2e2f0",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* Nav */}
      <div
        style={{
          background: "#111118",
          borderBottom: "1px solid #1e1e2e",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚀</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>
            PrepBuddy
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#6366f1",
              background: "#6366f122",
              padding: "2px 7px",
              borderRadius: 20,
              fontWeight: 600,
            }}
          >
            AI
          </span>
        </div>
        <button
          onClick={() => router.push("/home")}
          style={{
            background: "transparent",
            border: "1px solid #2a2a4a",
            borderRadius: 10,
            padding: "7px 16px",
            color: "#888",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← Home
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Session History 📋
        </h1>
        <p style={{ color: "#555", fontSize: 13, marginBottom: 28 }}>
          {sessions.length} sessions completed
        </p>

        {/* Analytics bar */}
        {sessions.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {[
              {
                icon: "📊",
                label: "Total",
                value: sessions.length,
                color: "#6366f1",
              },
              {
                icon: "⭐",
                label: "Avg Score",
                value: avgScore ? `${avgScore}/10` : "—",
                color: "#10b981",
              },
              {
                icon: "🏆",
                label: "Best",
                value: bestScore ? `${bestScore}/10` : "—",
                color: "#f59e0b",
              },
              {
                icon: "🔥",
                label: "This Week",
                value: thisWeek,
                color: "#a78bfa",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "#111118",
                  border: "1px solid #1e1e2e",
                  borderRadius: 12,
                  padding: "14px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "#555" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Progress graph */}
        {sessions.length >= 2 && (
          <div
            style={{
              background: "#111118",
              border: "1px solid #1e1e2e",
              borderRadius: 16,
              padding: "20px 24px",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 16,
              }}
            >
              📈 Score Progress
            </div>
            <ProgressGraph sessions={sessions} />
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  <div
                    style={{
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      onClick={() => setExpanded(isOpen ? null : session.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flex: 1,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: `${color}22`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 17,
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
                            marginBottom: 2,
                          }}
                        >
                          {getSessionLabel(session)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#555",
                            display: "flex",
                            gap: 6,
                          }}
                        >
                          <span>
                            {getModeIcon(session.mode)} {session.mode}
                          </span>
                          <span>•</span>
                          <span>{session.totalQ}Q</span>
                          <span>•</span>
                          <span>{formatDate(session.completedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexShrink: 0,
                      }}
                    >
                      {session.avgScore !== null &&
                        session.avgScore !== undefined && (
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 800,
                              color: getScoreColor(session.avgScore),
                            }}
                          >
                            {Math.round(session.avgScore)}
                            <span style={{ fontSize: 11, color: "#555" }}>
                              /10
                            </span>
                          </div>
                        )}
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={deleting === session.id}
                        style={{
                          background: "transparent",
                          border: "1px solid #ef444433",
                          borderRadius: 8,
                          padding: "4px 8px",
                          color: "#ef4444",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {deleting === session.id ? "..." : "🗑️"}
                      </button>
                      <div
                        onClick={() => setExpanded(isOpen ? null : session.id)}
                        style={{
                          cursor: "pointer",
                          color: isOpen ? color : "#333",
                          fontSize: 10,
                        }}
                      >
                        {isOpen ? "▲" : "▼"}
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div
                      style={{
                        borderTop: "1px solid #1e1e2e",
                        padding: "14px 18px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {session.scores.map((score, i) => (
                        <div
                          key={score.id}
                          style={{
                            background: "#0d0d14",
                            borderRadius: 10,
                            padding: "10px 14px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 5,
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
                                fontSize: 11,
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
                              fontSize: 12,
                              color: "#aaa",
                              margin: "0 0 4px",
                            }}
                          >
                            {score.question.slice(0, 100)}
                            {score.question.length > 100 ? "..." : ""}
                          </p>
                          {score.feedback && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "#fcd34d",
                                margin: 0,
                                background: "#1c1a10",
                                borderRadius: 6,
                                padding: "5px 8px",
                              }}
                            >
                              {score.feedback.slice(0, 120)}
                              {score.feedback.length > 120 ? "..." : ""}
                            </p>
                          )}
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              marginTop: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {score.wordsPerMinute && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "#6366f1",
                                  background: "#6366f115",
                                  borderRadius: 4,
                                  padding: "1px 6px",
                                }}
                              >
                                ⚡ {score.wordsPerMinute} wpm
                              </span>
                            )}
                            {score.fillerCount !== undefined &&
                              score.fillerCount !== null && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color:
                                      score.fillerCount > 3
                                        ? "#ef4444"
                                        : "#10b981",
                                    background: "#10b98115",
                                    borderRadius: 4,
                                    padding: "1px 6px",
                                  }}
                                >
                                  💬 {score.fillerCount} fillers
                                </span>
                              )}
                            {score.eyeContactPct !== undefined &&
                              score.eyeContactPct !== null && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#a78bfa",
                                    background: "#a78bfa15",
                                    borderRadius: 4,
                                    padding: "1px 6px",
                                  }}
                                >
                                  👁️ {score.eyeContactPct}% eye contact
                                </span>
                              )}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => router.push("/setup")}
                        style={{
                          alignSelf: "flex-end",
                          background: `linear-gradient(135deg, ${color}, ${color}88)`,
                          border: "none",
                          borderRadius: 10,
                          padding: "7px 18px",
                          color: "#fff",
                          fontSize: 12,
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
