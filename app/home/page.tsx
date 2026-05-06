"use client";

import { useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

type Stats = {
  totalSessions: number;
  avgScore: number;
  bestScore: number;
  thisWeek: number;
};

const MODES = [
  {
    type: "interview",
    icon: "🎯",
    title: "Interview Preparation",
    desc: "Practice with AI interviewer. Text, audio, or video mode.",
    color: "#6366f1",
    glow: "#6366f133",
  },
  {
    type: "exam",
    icon: "📚",
    title: "Exam Preparation",
    desc: "Government, competitive, certification exams.",
    color: "#10b981",
    glow: "#10b98133",
  },
  {
    type: "personality",
    icon: "🧠",
    title: "Personality Development",
    desc: "Communication, confidence, HR rounds.",
    color: "#f59e0b",
    glow: "#f59e0b33",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [savedTarget, setSavedTarget] = useState("");
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const firstName = user?.firstName || "there";

  useEffect(() => {
    // Load stats
    fetch("/api/get-history")
      .then((r) => r.json())
      .then((d) => {
        const sessions = d.sessions || [];
        if (sessions.length === 0) return;
        const scores = sessions.map((s: any) => s.avgScore).filter(Boolean);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        setStats({
          totalSessions: sessions.length,
          avgScore: scores.length
            ? Math.round(
                (scores.reduce((a: number, b: number) => a + b, 0) /
                  scores.length) *
                  10,
              ) / 10
            : 0,
          bestScore: scores.length
            ? Math.round(Math.max(...scores) * 10) / 10
            : 0,
          thisWeek: sessions.filter(
            (s: any) => new Date(s.completedAt) > weekAgo,
          ).length,
        });
      })
      .catch(console.error);

    // Load saved target date
    const saved = localStorage.getItem("prepbuddy_target_date");
    if (saved) {
      setSavedTarget(saved);
      setTargetDate(saved);
      updateDaysLeft(saved);
    }
  }, []);

  const updateDaysLeft = (date: string) => {
    if (!date) return;
    const diff = new Date(date).getTime() - Date.now();
    setDaysLeft(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
  };

  const saveTarget = () => {
    localStorage.setItem("prepbuddy_target_date", targetDate);
    setSavedTarget(targetDate);
    updateDaysLeft(targetDate);
    setShowDatePicker(false);
  };

  const clearTarget = () => {
    localStorage.removeItem("prepbuddy_target_date");
    setSavedTarget("");
    setTargetDate("");
    setDaysLeft(null);
  };

  const handleSelect = (type: string) => {
    sessionStorage.setItem("prepbuddy_selected_type", type);
    router.push("/setup");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* Top nav */}
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
          <span
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.3px",
            }}
          >
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => router.push("/history")}
            style={{
              background: "transparent",
              border: "1px solid #2a2a4a",
              borderRadius: 10,
              padding: "7px 16px",
              color: "#888",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            📋 History
          </button>
          <UserButton />
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}
          >
            Hey {firstName}! 👋
          </h1>
          <p style={{ color: "#555", fontSize: 14, marginTop: 6 }}>
            Ready to practice today? Pick a mode to get started.
          </p>
        </div>

        {/* Stats + Countdown row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {/* Stats cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {[
              {
                label: "Sessions",
                value: stats?.totalSessions ?? "—",
                color: "#6366f1",
                icon: "🎯",
              },
              {
                label: "Avg Score",
                value: stats ? `${stats.avgScore}/10` : "—",
                color: "#10b981",
                icon: "📊",
              },
              {
                label: "Best Score",
                value: stats ? `${stats.bestScore}/10` : "—",
                color: "#f59e0b",
                icon: "🏆",
              },
              {
                label: "This Week",
                value: stats?.thisWeek ?? "—",
                color: "#a78bfa",
                icon: "📅",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "#111118",
                  border: "1px solid #1e1e2e",
                  borderRadius: 14,
                  padding: "16px 18px",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div
            style={{
              background:
                daysLeft !== null
                  ? "linear-gradient(135deg, #1a1a2e, #0f0f1a)"
                  : "#111118",
              border: `1px solid ${daysLeft !== null ? "#6366f144" : "#1e1e2e"}`,
              borderRadius: 14,
              padding: "16px 20px",
              minWidth: 160,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {daysLeft !== null ? (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6366f1",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Target Date
                </div>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 900,
                    color:
                      daysLeft <= 3
                        ? "#ef4444"
                        : daysLeft <= 7
                          ? "#f59e0b"
                          : "#6366f1",
                    lineHeight: 1,
                  }}
                >
                  {daysLeft}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>days left</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button
                    onClick={() => setShowDatePicker(true)}
                    style={{
                      fontSize: 10,
                      color: "#6366f1",
                      background: "transparent",
                      border: "1px solid #6366f144",
                      borderRadius: 6,
                      padding: "2px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={clearTarget}
                    style={{
                      fontSize: 10,
                      color: "#ef4444",
                      background: "transparent",
                      border: "1px solid #ef444433",
                      borderRadius: 6,
                      padding: "2px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🎯</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#888",
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  Set a target date
                </div>
                <button
                  onClick={() => setShowDatePicker(true)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6366f1",
                    background: "#6366f115",
                    border: "1px solid #6366f133",
                    borderRadius: 8,
                    padding: "6px 14px",
                    cursor: "pointer",
                  }}
                >
                  + Set Target
                </button>
              </>
            )}
          </div>
        </div>

        {/* Date picker modal */}
        {showDatePicker && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "#000000aa",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDatePicker(false);
            }}
          >
            <div
              style={{
                background: "#111118",
                border: "1px solid #2a2a4a",
                borderRadius: 20,
                padding: "28px 32px",
                minWidth: 320,
              }}
            >
              <h3
                style={{
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Set Target Date 🎯
              </h3>
              <p style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>
                When is your interview or exam?
              </p>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                style={{
                  width: "100%",
                  background: "#1a1a2e",
                  border: "1px solid #2a2a4a",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#fff",
                  fontSize: 14,
                  marginBottom: 16,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowDatePicker(false)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid #2a2a4a",
                    borderRadius: 10,
                    padding: "10px",
                    color: "#888",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveTarget}
                  disabled={!targetDate}
                  style={{
                    flex: 1,
                    background: targetDate
                      ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                      : "#1a1a2e",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px",
                    color: targetDate ? "#fff" : "#444",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: targetDate ? "pointer" : "not-allowed",
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mode cards */}
        <div style={{ marginBottom: 12 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 16,
            }}
          >
            Start a Session
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {MODES.map((m) => (
              <button
                key={m.type}
                onClick={() => handleSelect(m.type)}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = m.color;
                  el.style.boxShadow = `0 0 24px ${m.glow}`;
                  el.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = "#1e1e2e";
                  el.style.boxShadow = "none";
                  el.style.transform = "translateY(0)";
                }}
                style={{
                  background: "#111118",
                  border: "1px solid #1e1e2e",
                  borderRadius: 18,
                  padding: "24px 20px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.25s",
                  outline: "none",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icon}</div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 6,
                  }}
                >
                  {m.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#666",
                    lineHeight: 1.6,
                    marginBottom: 16,
                  }}
                >
                  {m.desc}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: m.color,
                    background: m.glow,
                    padding: "5px 12px",
                    borderRadius: 20,
                    display: "inline-block",
                  }}
                >
                  Get Started →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
