"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveSession,
  SessionConfig,
  SessionType,
  SessionMode,
} from "@/lib/session";
import {
  interviewOptions,
  examOptions,
  personalityOptions,
} from "@/data/options";

type Step = "type" | "mode" | "details";
type InterviewDomains = typeof interviewOptions.domains;
type DomainKey = keyof InterviewDomains;

export default function SetupPage() {
  const router = useRouter();

  const [sessionType, setSessionType] = useState<SessionType>("interview");
  const [step, setStep] = useState<Step>(() => {
    if (typeof window === "undefined") return "type";
    const p = new URLSearchParams(window.location.search).get("step");
    return p && ["type", "mode", "details"].includes(p) ? (p as Step) : "type";
  });
  const [mode, setMode] = useState<SessionMode>("text");
  const [domain, setDomain] = useState<DomainKey | "">("");
  const [track, setTrack] = useState("");
  const [tech, setTech] = useState("");
  const [examType, setExamType] = useState("");
  const [subject, setSubject] = useState("");
  const [topicFocus, setTopicFocus] = useState<"high" | "weak" | "all">("all");
  const [focusArea, setFocusArea] = useState(personalityOptions[0]);
  const [goals, setGoals] = useState<string[]>([]);

  useEffect(() => {
    const backStep = sessionStorage.getItem("prepbuddy_back_step");
    if (backStep && ["type", "mode", "details"].includes(backStep)) {
      sessionStorage.removeItem("prepbuddy_back_step");
      setStep(backStep as Step);
      return;
    }
    const preselected = sessionStorage.getItem("prepbuddy_selected_type");
    if (preselected) {
      setSessionType(preselected as SessionType);
      sessionStorage.removeItem("prepbuddy_selected_type");
      setStep(preselected === "exam" ? "details" : "mode");
    }
  }, []);

  // Interview computed
  const domains = Object.keys(interviewOptions.domains) as DomainKey[];
  const currentDomain: DomainKey = (domain || domains[0]) as DomainKey;
  const domainData = interviewOptions.domains[currentDomain];
  const tracks = Object.keys(domainData?.tracks || {});
  const currentTrack = track || tracks[0] || "";
  const technologies: string[] = currentTrack
    ? (domainData?.tracks as Record<string, string[]>)[currentTrack] || []
    : [];
  const currentTech = tech || technologies[0] || "";

  // Exam computed
  const examTypes = Object.keys(examOptions.examTypes);
  const currentExamType = examType || examTypes[0];
  const examTypeData = examOptions.examTypes[
    currentExamType as keyof typeof examOptions.examTypes
  ] as any;
  const subjects: string[] =
    examTypeData?.subjects || Object.keys(examTypeData?.exams || {});
  const currentSubject = subject || subjects[0] || "";

  const handleStart = () => {
    const config: SessionConfig = { type: sessionType, mode };
    if (sessionType === "interview") {
      config.domain = currentDomain;
      config.track = currentTrack;
      config.tech = currentTech;
      saveSession(config);
      router.push("/resume");
    } else if (sessionType === "exam") {
      config.examType = currentExamType;
      config.subject = currentSubject;
      config.topicFocus = topicFocus;
      saveSession(config);
      router.push("/session");
    } else {
      config.focusArea = focusArea;
      config.goals = goals;
      saveSession(config);
      router.push("/session");
    }
  };

  // Back navigation: details → mode → home (skip type step entirely)
  const goBack = () => {
    if (step === "details" && sessionType !== "exam") setStep("mode"); else if (step === "details" && sessionType === "exam") router.push("/home");
    else router.push("/home");
  };

  const TYPE_OPTIONS = [
    {
      type: "interview" as SessionType,
      icon: "🎯",
      label: "Interview Prep",
      color: "#6366f1",
    },
    {
      type: "exam" as SessionType,
      icon: "📚",
      label: "Exam Prep",
      color: "#10b981",
    },
    {
      type: "personality" as SessionType,
      icon: "🧠",
      label: "Personality Dev",
      color: "#f59e0b",
    },
  ];

  const MODE_OPTIONS = [
    {
      mode: "text" as SessionMode,
      icon: "💬",
      label: "Text",
      desc: "Type your answers",
    },
    {
      mode: "voice" as SessionMode,
      icon: "🎙️",
      label: "Audio",
      desc: "Speak your answers",
    },
    {
      mode: "video" as SessionMode,
      icon: "🎥",
      label: "Video",
      desc: "Camera + mic + analysis",
    },
  ];

  const accentColor =
    sessionType === "interview"
      ? "#6366f1"
      : sessionType === "exam"
        ? "#10b981"
        : "#f59e0b";

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
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
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
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back
        </button>

        {/* Progress dots — only show mode + details */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 36,
            justifyContent: "center",
          }}
        >
          {(["mode", "details"] as Step[]).map((s) => (
            <div
              key={s}
              style={{
                width: step === s ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background:
                  step === s
                    ? accentColor
                    : step === "details" && s === "mode"
                      ? accentColor + "88"
                      : "#1e1e2e",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* STEP 1: Type — shown when coming fresh from home */}
        {step === "type" && (
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                marginBottom: 6,
                textAlign: "center",
              }}
            >
              What would you like to practice?
            </h1>
            <p
              style={{
                color: "#555",
                textAlign: "center",
                marginBottom: 32,
                fontSize: 14,
              }}
            >
              Choose a session type to get started
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => {
                    setSessionType(opt.type);
                    setStep(opt.type === "exam" ? "details" : "mode");
                  }}
                  style={{
                    background:
                      sessionType === opt.type ? `${opt.color}15` : "#111118",
                    border: `1px solid ${sessionType === opt.type ? opt.color : "#1e1e2e"}`,
                    borderRadius: 14,
                    padding: "18px 20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.icon}</span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
                    {opt.label}
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      color: opt.color,
                      fontSize: 18,
                    }}
                  >
                    →
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Mode */}
        {step === "mode" && (
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                marginBottom: 6,
                textAlign: "center",
              }}
            >
              {sessionType === "interview"
                ? "Choose interview mode"
                : "Choose practice mode"}
            </h1>
            <p
              style={{
                color: "#555",
                textAlign: "center",
                marginBottom: 32,
                fontSize: 14,
              }}
            >
              How would you like to practice?
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 32,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {(sessionType === "interview"
                ? MODE_OPTIONS
                : sessionType === "personality" ? MODE_OPTIONS : [MODE_OPTIONS[0]]
              ).map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => setMode(opt.mode)}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    background:
                      mode === opt.mode ? `${accentColor}15` : "#111118",
                    border: `1px solid ${mode === opt.mode ? accentColor : "#1e1e2e"}`,
                    borderRadius: 14,
                    padding: "20px 16px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>
                    {opt.icon}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("details")}
              style={{
                width: "100%",
                padding: "14px",
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* STEP 3: Details */}
        {step === "details" && (
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                marginBottom: 6,
                textAlign: "center",
              }}
            >
              {sessionType === "interview"
                ? "Set up your interview"
                : sessionType === "exam"
                  ? "Set up your exam prep"
                  : "Set up your practice"}
            </h1>
            <p
              style={{
                color: "#555",
                textAlign: "center",
                marginBottom: 32,
                fontSize: 14,
              }}
            >
              Customize your session
            </p>

            {sessionType === "interview" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 24 }}
              >
                <Section label="Domain" accent={accentColor}>
                  <ChipGroup
                    options={domains}
                    selected={currentDomain}
                    onSelect={(d) => {
                      setDomain(d as DomainKey);
                      setTrack("");
                      setTech("");
                    }}
                    accent={accentColor}
                  />
                </Section>
                <Section label="Track" accent={accentColor}>
                  <ChipGroup
                    options={tracks}
                    selected={currentTrack}
                    onSelect={(t) => {
                      setTrack(t);
                      setTech("");
                    }}
                    accent={accentColor}
                  />
                </Section>
                {technologies.length > 0 && (
                  <Section label="Technology" accent={accentColor}>
                    <ChipGroup
                      options={technologies}
                      selected={currentTech}
                      onSelect={setTech}
                      accent={accentColor}
                    />
                  </Section>
                )}
              </div>
            )}

            {sessionType === "exam" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 24 }}
              >
                <Section label="Exam Type" accent={accentColor}>
                  <ChipGroup
                    options={examTypes}
                    selected={currentExamType}
                    onSelect={(e) => {
                      setExamType(e);
                      setSubject("");
                    }}
                    accent={accentColor}
                  />
                </Section>
                {subjects.length > 0 && (
                  <Section label="Subject / Exam" accent={accentColor}>
                    <ChipGroup
                      options={subjects}
                      selected={currentSubject}
                      onSelect={setSubject}
                      accent={accentColor}
                    />
                  </Section>
                )}
                <Section label="Topic Focus" accent={accentColor}>
                  <ChipGroup
                    options={["All Topics", "High Scoring", "Weak Areas"]}
                    selected={
                      topicFocus === "all"
                        ? "All Topics"
                        : topicFocus === "high"
                          ? "High Scoring"
                          : "Weak Areas"
                    }
                    onSelect={(v) =>
                      setTopicFocus(
                        v === "High Scoring"
                          ? "high"
                          : v === "Weak Areas"
                            ? "weak"
                            : "all",
                      )
                    }
                    accent={accentColor}
                  />
                </Section>
              </div>
            )}

            {sessionType === "personality" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 24 }}
              >
                <Section label="Focus Area" accent={accentColor}>
                  <ChipGroup
                    options={personalityOptions}
                    selected={focusArea}
                    onSelect={setFocusArea}
                    accent={accentColor}
                  />
                </Section>
                <Section label="Practice Goals" accent={accentColor}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      "Confidence Improvement",
                      "HR Round Practice",
                      "Public Speaking",
                      "Leadership",
                    ].map((g) => (
                      <button
                        key={g}
                        onClick={() =>
                          setGoals((prev) =>
                            prev.includes(g)
                              ? prev.filter((x) => x !== g)
                              : [...prev, g],
                          )
                        }
                        style={{
                          padding: "8px 14px",
                          borderRadius: 8,
                          fontSize: 13,
                          cursor: "pointer",
                          border: `1px solid ${goals.includes(g) ? accentColor : "#2a2a3e"}`,
                          background: goals.includes(g)
                            ? `${accentColor}22`
                            : "transparent",
                          color: goals.includes(g) ? accentColor : "#888",
                          transition: "all 0.2s",
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            <button
              onClick={handleStart}
              style={{
                width: "100%",
                marginTop: 32,
                padding: "14px",
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {sessionType === "interview"
                ? "Continue to Resume Upload →"
                : sessionType === "exam"
                  ? "Start Preparation →"
                  : "Start Practice →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: accent,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onSelect,
  accent,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            cursor: "pointer",
            border: `1px solid ${selected === opt ? accent : "#2a2a3e"}`,
            background: selected === opt ? `${accent}22` : "transparent",
            color: selected === opt ? accent : "#888",
            transition: "all 0.2s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
