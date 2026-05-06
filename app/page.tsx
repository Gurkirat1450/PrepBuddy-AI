"use client";

import { useRouter } from "next/navigation";

const MODES = [
  {
    type: "interview",
    icon: "🎯",
    title: "Interview Prep",
    desc: "Practice real interview questions with an AI interviewer. Choose text, audio, or video mode.",
    color: "#6366f1",
    glow: "#6366f133",
  },
  {
    type: "exam",
    icon: "📚",
    title: "Exam Prep",
    desc: "Prepare for college, government, competitive, or certification exams with smart revision.",
    color: "#10b981",
    glow: "#10b98133",
  },
  {
    type: "personality",
    icon: "🧠",
    title: "Personality Development",
    desc: "Improve communication, confidence, public speaking, and HR round preparation.",
    color: "#f59e0b",
    glow: "#f59e0b33",
  },
];

export default function HomePage() {
  const router = useRouter();

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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#fff",
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          PrepBuddy
        </h1>
        <p
          style={{ color: "#555", fontSize: 15, marginTop: 10, maxWidth: 420 }}
        >
          Your AI-powered preparation partner for interviews, exams, and
          personal growth.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 900,
        }}
      >
        {MODES.map((m) => (
          <button
            key={m.type}
            onClick={() => handleSelect(m.type)}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = m.color;
              el.style.boxShadow = `0 0 30px ${m.glow}`;
              el.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "#1e1e2e";
              el.style.boxShadow = "none";
              el.style.transform = "translateY(0)";
            }}
            style={{
              width: 260,
              background: "#111118",
              border: "1px solid #1e1e2e",
              borderRadius: 20,
              padding: "28px 24px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.25s ease",
              outline: "none",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 14 }}>{m.icon}</div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 8,
              }}
            >
              {m.title}
            </div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
              {m.desc}
            </div>
            <div
              style={{
                marginTop: 20,
                display: "inline-block",
                fontSize: 12,
                fontWeight: 600,
                color: m.color,
                padding: "5px 12px",
                borderRadius: 20,
                background: m.glow,
              }}
            >
              Get Started →
            </div>
          </button>
        ))}
      </div>

      <p style={{ color: "#333", fontSize: 12, marginTop: 48 }}>
        PrepBuddy AI • Powered by Groq + Llama 3
      </p>
    </div>
  );
}
