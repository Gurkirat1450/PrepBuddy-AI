"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession, saveSession } from "@/lib/session";

export default function ResumePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const session = loadSession();
  const mode = session?.mode || "text";
  const modeLabel =
    mode === "voice" ? "Audio" : mode === "video" ? "Video" : "Text";

  const handleUpload = async () => {
    if (!file) {
      alert("Please upload your resume DOCX first.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("resume", file);

    const parseRes = await fetch("/api/parse-resume", {
      method: "POST",
      body: formData,
    });
    const parseData = await parseRes.json();

    if (!parseData.success) {
      alert("Failed to read resume. Please try again.");
      setLoading(false);
      return;
    }

    const qRes = await fetch("/api/generate-resume-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: parseData.text }),
    });
    const qData = await qRes.json();

    saveSession({
      ...session!,
      candidateName: parseData.candidateName || "",
      resumeText: parseData.text.slice(0, 3000),
      resumeQuestions: qData.questions || [],
    });

    setLoading(false);
    router.push("/session");
  };

  const goBack = () => {
    sessionStorage.setItem("prepbuddy_back_step", "details");
    router.push("/setup");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#e2e2f0",
        fontFamily: "'Segoe UI', sans-serif",
        padding: "40px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 520, width: "100%" }}>
        <button
          onClick={goBack}
          style={{
            background: "none",
            border: "none",
            color: "#555",
            cursor: "pointer",
            fontSize: 13,
            marginBottom: 32,
            padding: 0,
          }}
        >
          ← Back to Setup
        </button>

        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
          Upload Your Resume 📄
        </h1>
        <p
          style={{
            color: "#555",
            fontSize: 14,
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          Your resume helps the AI personalize interview questions based on your
          projects and experience.
          {mode === "voice" && " 🎙️ Audio mode selected."}
          {mode === "video" && " 🎥 Video mode selected."}
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f?.name.endsWith(".docx")) setFile(f);
          }}
          onClick={() => document.getElementById("resumeInput")?.click()}
          style={{
            border: `2px dashed ${dragging ? "#6366f1" : file ? "#10b981" : "#2a2a4a"}`,
            borderRadius: 16,
            padding: "40px 24px",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: 24,
            transition: "all 0.2s",
            background: dragging ? "#6366f111" : file ? "#10b98111" : "#111118",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>
            {file ? "✅" : "📄"}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: file ? "#10b981" : "#fff",
              marginBottom: 6,
            }}
          >
            {file ? file.name : "Drop your DOCX here"}
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>
            {file
              ? "Click to change file"
              : "or click to browse — DOCX files only"}
          </div>
          <input
            id="resumeInput"
            type="file"
            accept=".docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={loading || !file}
          style={{
            width: "100%",
            padding: "14px",
            background:
              loading || !file
                ? "#1a1a2e"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none",
            borderRadius: 12,
            color: loading || !file ? "#444" : "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading || !file ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Reading Resume..." : `Start ${modeLabel} Interview →`}
        </button>
      </div>
    </div>
  );
}
