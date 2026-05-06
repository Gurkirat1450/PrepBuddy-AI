"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

const FEATURES = [
  {
    icon: "🎯",
    title: "AI Interview Prep",
    desc: "Practice with a real AI interviewer across 80+ tech domains. Text, audio, or video mode.",
  },
  {
    icon: "📚",
    title: "Exam Preparation",
    desc: "Crack UPSC, JEE, GATE, CAT, bank exams and certifications with smart question banks.",
  },
  {
    icon: "🧠",
    title: "Personality Development",
    desc: "Build communication skills, confidence, and ace HR rounds with AI coaching.",
  },
  {
    icon: "🎥",
    title: "Video Analysis",
    desc: "Real-time eye contact, posture, and expression feedback using your webcam.",
  },
  {
    icon: "📊",
    title: "Progress Tracking",
    desc: "Track your improvement over time with detailed analytics and session history.",
  },
  {
    icon: "🔒",
    title: "Secure & Personal",
    desc: "Your sessions are private, saved to your account, and accessible anytime.",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/home");
  }, [isLoaded, isSignedIn]);

  // Show nothing while checking auth to prevent flash
  if (!isLoaded || isSignedIn) return <div style={{ minHeight: "100vh", background: "#0a0a0f" }} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        fontFamily: "'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0a0a0fcc",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #ffffff08",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🚀</span>
          <span
            style={{
              fontSize: 18,
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
              marginLeft: 4,
            }}
          >
            AI
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push("/sign-in")}
            style={{
              background: "transparent",
              border: "1px solid #2a2a4a",
              borderRadius: 10,
              padding: "8px 20px",
              color: "#aaa",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => router.push("/sign-up")}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: 10,
              padding: "8px 20px",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "100px 20px 60px",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, #6366f122 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#6366f1",
            background: "#6366f115",
            border: "1px solid #6366f133",
            borderRadius: 20,
            padding: "5px 16px",
            marginBottom: 24,
            letterSpacing: "0.05em",
          }}
        >
          ✨ Powered by Groq + Llama 3
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 900,
            color: "#fff",
            margin: "0 0 20px",
            lineHeight: 1.1,
            letterSpacing: "-1px",
            maxWidth: 800,
          }}
        >
          Ace Your Next{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #6366f1, #a78bfa, #38bdf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Interview
          </span>{" "}
          with AI
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#888",
            maxWidth: 560,
            lineHeight: 1.7,
            marginBottom: 40,
          }}
        >
          Practice interviews, crack competitive exams, and build communication
          skills — with real-time AI feedback, voice analysis, and video
          coaching.
        </p>

        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 60,
          }}
        >
          <button
            onClick={() => router.push("/sign-up")}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: 14,
              padding: "14px 36px",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 30px #6366f155",
            }}
          >
            Start Practicing Free →
          </button>
          <button
            onClick={() => router.push("/sign-in")}
            style={{
              background: "transparent",
              border: "1px solid #2a2a4a",
              borderRadius: 14,
              padding: "14px 36px",
              color: "#aaa",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 40,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 80,
          }}
        >
          {[
            ["80+", "Tech Domains"],
            ["3", "Practice Modes"],
            ["AI Powered", "Real Feedback"],
            ["Free", "To Get Started"],
          ].map(([val, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
                {val}
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            maxWidth: 900,
            width: "100%",
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "linear-gradient(135deg, #111118, #0d0d18)",
                border: "1px solid #1e1e2e",
                borderRadius: 16,
                padding: "20px 22px",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 6,
                }}
              >
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div
          style={{
            marginTop: 60,
            padding: "32px 40px",
            background: "linear-gradient(135deg, #6366f115, #8b5cf615)",
            border: "1px solid #6366f133",
            borderRadius: 20,
            maxWidth: 500,
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 8,
            }}
          >
            Ready to level up? 🚀
          </div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
            Join thousands of students preparing smarter with AI
          </div>
          <button
            onClick={() => router.push("/sign-up")}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: 12,
              padding: "13px",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Create Free Account →
          </button>
        </div>

        <div style={{ marginTop: 40, fontSize: 12, color: "#333" }}>
          PrepBuddy AI • Powered by Groq + Llama 3 • Built for students
        </div>
      </div>
    </div>
  );
}
