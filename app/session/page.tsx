"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  loadSession,
  saveSummary,
  SessionConfig,
  SessionScore,
} from "@/lib/session";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  msgType: "question" | "feedback";
};

type AudioMetrics = {
  fillerCount: number;
  fillerWords: string[];
  wordCount: number;
  speakingTimeSeconds: number;
  wordsPerMinute: number;
};

type VideoMetrics = {
  eyeContactPercent: number;
  headStraightPercent: number;
  expressionNotes: string[];
  samplesCount: number;
};

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "basically",
  "you know",
  "actually",
  "literally",
  "kind of",
  "sort of",
];

function analyzeAudio(transcript: string, sec: number): AudioMetrics {
  const lower = transcript.toLowerCase();
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wpm = sec > 0 ? Math.round((words.length / sec) * 60) : 0;
  let fc = 0;
  const ff: string[] = [];
  FILLER_WORDS.forEach((f) => {
    const m = lower.match(new RegExp(`\\b${f}\\b`, "gi"));
    if (m) {
      fc += m.length;
      ff.push(f);
    }
  });
  return {
    fillerCount: fc,
    fillerWords: [...new Set(ff)],
    wordCount: words.length,
    speakingTimeSeconds: Math.round(sec),
    wordsPerMinute: wpm,
  };
}

function normalizeQ(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}
function isSimilar(a: string, b: string) {
  const na = normalizeQ(a);
  const nb = normalizeQ(b);
  if (na === nb) return true;
  const [s, l] = na.length < nb.length ? [na, nb] : [nb, na];
  return l.includes(s.slice(0, Math.floor(s.length * 0.72)));
}

const MAX_QUESTIONS = 8;

export default function SessionPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [interviewStyle, setInterviewStyle] = useState<"formal" | "advice">(
    "formal",
  );
  const [scores, setScores] = useState<SessionScore[]>([]);

  // Voice/video state
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics | null>(null);

  // Video state
  const [liveVideo, setLiveVideo] = useState({
    faceDetected: false,
    eyeContact: false,
    headStraight: true,
    expression: "neutral",
    gazeX: 0,
    gazeY: 0,
  });
  const [faceReady, setFaceReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const askedSet = useRef<Set<string>>(new Set());
  const bankQueueRef = useRef<string[]>([]);
  const resumeQueueRef = useRef<string[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const inputRef = useRef("");
  const initialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);
  const scoresRef = useRef<SessionScore[]>([]);
  const styleRef = useRef<"formal" | "advice">("formal");
  const recognitionRef = useRef<any>(null);
  const speakingStartRef = useRef<number>(0);
  const transcriptRef = useRef("");
  const isSpeakingRef = useRef(false);
  const faceMeshRef = useRef<any>(null);
  const animFrameRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const videoSamplesRef = useRef({
    total: 0,
    eyeContact: 0,
    headStraight: 0,
    expressions: [] as string[],
  });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    countRef.current = count;
  }, [count]);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);
  useEffect(() => {
    styleRef.current = interviewStyle;
  }, [interviewStyle]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  // Load config from sessionStorage
  useEffect(() => {
    const cfg = loadSession();
    if (!cfg) {
      router.push("/");
      return;
    }
    setConfig(cfg);

    if (cfg.resumeQuestions?.length) {
      resumeQueueRef.current = [...cfg.resumeQuestions];
    }

    // Load question bank for interview
    if (cfg.type === "interview" && cfg.domain && cfg.tech) {
      fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: cfg.domain,
          tech: cfg.tech,
          previous: [],
          loadBankOnly: true,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          const bank: string[] = Array.isArray(d.bank) ? d.bank : [];
          const seed = Date.now();
          let s = seed;
          const arr = [...bank];
          for (let i = arr.length - 1; i > 0; i--) {
            s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
            s = s ^ (s >>> 16);
            const j = Math.abs(s) % (i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          bankQueueRef.current = arr;
        })
        .catch(console.error);
    }

    // Setup camera for video mode
    if (cfg.mode === "video") {
      let remaining = 15;
      setCountdown(15);
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownRef.current);
          startSession(cfg);
        }
      }, 1000);
      startCamera(cfg);
    } else {
      startSession(cfg);
    }
  }, []);

  const startSession = (cfg: SessionConfig) => {
    if (initialized.current) return;
    initialized.current = true;
    clearInterval(countdownRef.current);
    setCountdown(null);
    loadFirstQuestion(cfg);
  };

  // ── Question generation ───────────────────────────────────────────────────
  const loadFirstQuestion = async (cfg: SessionConfig) => {
    const q = await getFirstQuestion(cfg);
    addQuestion(q);
  };

  const getFirstQuestion = async (cfg: SessionConfig): Promise<string> => {
    if (cfg.type === "interview") {
      const fn = cfg.candidateName?.split(" ")[0] || "";
      return fn
        ? `Hi ${fn}! Let's begin. Please introduce yourself and tell me about your background in ${cfg.tech}.`
        : `Let's begin. Please introduce yourself and tell me about your background in ${cfg.tech}.`;
    }
    if (cfg.type === "exam") {
      const res = await fetch("/api/generate-exam-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType: cfg.examType,
          subject: cfg.subject,
          high: cfg.topicFocus === "high",
          weak: cfg.topicFocus === "weak",
          previous: [],
        }),
      });
      const d = await res.json();
      return (
        d.question || `Explain a key concept in ${cfg.subject || cfg.examType}.`
      );
    }
    if (cfg.type === "personality") {
      const res = await fetch("/api/generate-personality-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus: cfg.focusArea,
          goals: cfg.goals,
          previous: [],
          isFirst: true,
        }),
      });
      const d = await res.json();
      return d.question || "Tell me about yourself and your goals.";
    }
    return "Let's begin. Please introduce yourself.";
  };

  const getNextQuestion = async (): Promise<string> => {
    const cfg = config!;

    // Resume questions first (interview only)
    while (resumeQueueRef.current.length > 0) {
      const rq = resumeQueueRef.current.shift()!;
      if (!isAsked(rq)) return rq;
    }

    if (cfg.type === "interview") {
      while (bankQueueRef.current.length > 0) {
        const q = bankQueueRef.current.shift()!;
        if (!isAsked(q)) return q;
      }
      return `How do you handle performance optimization in ${cfg.tech}?`;
    }

    if (cfg.type === "exam") {
      const res = await fetch("/api/generate-exam-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType: cfg.examType,
          subject: cfg.subject,
          high: cfg.topicFocus === "high",
          weak: cfg.topicFocus === "weak",
          previous: Array.from(askedSet.current),
        }),
      });
      const d = await res.json();
      return d.question || `Explain another concept in ${cfg.subject}.`;
    }

    if (cfg.type === "personality") {
      const res = await fetch("/api/generate-personality-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus: cfg.focusArea,
          goals: cfg.goals,
          previous: Array.from(askedSet.current),
          isFirst: false,
        }),
      });
      const d = await res.json();
      return d.question || "Describe a challenge you overcame recently.";
    }

    return "Tell me more about your experience.";
  };

  // ── Message helpers ───────────────────────────────────────────────────────
  const markAsked = (q: string) => askedSet.current.add(normalizeQ(q));
  const isAsked = (q: string) => {
    const nq = normalizeQ(q);
    for (const a of askedSet.current) if (isSimilar(nq, a)) return true;
    return false;
  };

  const addQuestion = (content: string) => {
    if (!content?.trim()) return;
    markAsked(content);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content, msgType: "question" },
    ]);
    if (config?.mode === "voice" || config?.mode === "video")
      speakText(content);
  };

  const addFeedback = (content: string) => {
    if (!content?.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content, msgType: "feedback" },
    ]);
  };

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      text.replace(/—/g, ", ").replace(/\s+/g, " ").trim(),
    );
    const go = () => {
      const voices = window.speechSynthesis.getVoices();
      const prio = [
        "Microsoft David",
        "Google UK English Male",
        "Microsoft Mark",
        "Google US English",
      ];
      let v =
        prio.map((n) => voices.find((x) => x.name.includes(n))).find(Boolean) ||
        voices.find((x) => x.lang === "en-US");
      if (v) utterance.voice = v;
      utterance.rate = 0.87;
      utterance.pitch = 0.95;
      utterance.volume = 1;
      utterance.onend = () => {
        if (!isSpeakingRef.current) setTimeout(startListening, 700);
      };
      window.speechSynthesis.speak(utterance);
    };
    window.speechSynthesis.getVoices().length > 0
      ? go()
      : (window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          go();
        });
  };

  // ── Speech recognition ────────────────────────────────────────────────────
  const startListening = () => {
    if (loading || isSpeakingRef.current) return;
    transcriptRef.current = "";
    setTranscript("");
    setInterimText("");
    setAudioMetrics(null);
    speakingStartRef.current = Date.now();
    isSpeakingRef.current = true;
    videoSamplesRef.current = {
      total: 0,
      eyeContact: 0,
      headStraight: 0,
      expressions: [],
    };
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition requires Chrome/Edge.");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      if (final) {
        transcriptRef.current += final;
        setTranscript(transcriptRef.current);
      }
      setInterimText(interim);
    };
    rec.onerror = (e: any) => {
      if (e.error !== "aborted") {
        setListening(false);
        isSpeakingRef.current = false;
      }
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    isSpeakingRef.current = false;
    const sec = (Date.now() - speakingStartRef.current) / 1000;
    const ft = transcriptRef.current.trim();
    if (ft) {
      const am = analyzeAudio(ft, sec);
      setAudioMetrics(am);
      setTimeout(() => sendMessage(ft, am), 300);
    }
  };

  // ── Camera + MediaPipe ────────────────────────────────────────────────────
  const startCamera = async (cfg: SessionConfig) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setupMediaPipe();
      }
    } catch (e) {
      console.error("Camera error:", e);
    }
  };

  const setupMediaPipe = async () => {
    try {
      const { FaceMesh } = await import("@mediapipe/face_mesh");
      const fm = new FaceMesh({
        locateFile: (f: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`,
      });
      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      fm.onResults((results: any) => processFaceResults(results));
      faceMeshRef.current = fm;
      setFaceReady(true);
      const run = async () => {
        if (
          faceMeshRef.current &&
          videoRef.current &&
          videoRef.current.readyState >= 2
        )
          await faceMeshRef.current.send({ image: videoRef.current });
        animFrameRef.current = setTimeout(run, 100);
      };
      run();
    } catch (e) {
      console.error("MediaPipe error:", e);
    }
  };

  const processFaceResults = (results: any) => {
    if (!results.multiFaceLandmarks?.[0]) {
      setLiveVideo((prev) => ({ ...prev, faceDetected: false }));
      return;
    }
    const lm = results.multiFaceLandmarks[0];
    let eyeContact = false,
      gazeX = 0,
      gazeY = 0;
    if (lm.length >= 478) {
      const li = lm[468];
      const lo = lm[33];
      const lin = lm[133];
      const lt = lm[159];
      const lb = lm[145];
      const ri = lm[473];
      const rin = lm[362];
      const ro = lm[263];
      const rt = lm[386];
      const rb = lm[374];
      const lew = Math.abs(lo.x - lin.x);
      const rew = Math.abs(ro.x - rin.x);
      const lgH = lew > 0 ? (li.x - Math.min(lo.x, lin.x)) / lew : 0.5;
      const rgH = rew > 0 ? (ri.x - Math.min(rin.x, ro.x)) / rew : 0.5;
      const avgH = (lgH + rgH) / 2;
      const leh = Math.abs(lt.y - lb.y);
      const reh = Math.abs(rt.y - rb.y);
      const lgV = leh > 0 ? (li.y - Math.min(lt.y, lb.y)) / leh : 0.5;
      const rgV = reh > 0 ? (ri.y - Math.min(rt.y, rb.y)) / reh : 0.5;
      const avgV = (lgV + rgV) / 2;
      gazeX = (0.5 - avgH) * 2;
      gazeY = (0.5 - avgV) * 2;
      eyeContact = Math.abs(gazeX) < 0.35 && Math.abs(gazeY) < 0.4;
    }
    const le = lm[33];
    const re = lm[263];
    const angle = Math.abs(
      Math.atan2(re.y - le.y, re.x - le.x) * (180 / Math.PI),
    );
    const headStraight = angle < 10;
    setLiveVideo({
      faceDetected: true,
      eyeContact,
      headStraight,
      expression: "neutral",
      gazeX,
      gazeY,
    });
    if (listening) {
      const s = videoSamplesRef.current;
      s.total++;
      if (eyeContact) s.eyeContact++;
      if (headStraight) s.headStraight++;
    }
  };

  const computeVideoMetrics = (): VideoMetrics => {
    const s = videoSamplesRef.current;
    if (s.total === 0)
      return {
        eyeContactPercent: 0,
        headStraightPercent: 0,
        expressionNotes: [],
        samplesCount: 0,
      };
    return {
      eyeContactPercent: Math.round((s.eyeContact / s.total) * 100),
      headStraightPercent: Math.round((s.headStraight / s.total) * 100),
      expressionNotes: [],
      samplesCount: s.total,
    };
  };

  // ── End session ───────────────────────────────────────────────────────────
  const endSession = () => {
    recognitionRef.current?.stop();
    if (animFrameRef.current) clearTimeout(animFrameRef.current);
    window.speechSynthesis?.cancel();
    if (videoRef.current?.srcObject)
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
    saveSummary({
      config: config!,
      scores: scoresRef.current,
      completedAt: new Date().toISOString(),
    });
    router.push("/summary");
  };

  // ── Send / evaluate answer ────────────────────────────────────────────────
  const handleSend = () => {
    const ans = inputRef.current.trim();
    if (!ans || loading) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: ans, msgType: "question" },
    ]);
    setInput("");
    inputRef.current = "";
    sendMessage(ans, null);
  };

  const sendMessage = async (answer: string, am: AudioMetrics | null) => {
    setLoading(true);
    const cfg = config!;
    const currentStyle = styleRef.current;
    const currentCount = countRef.current;
    const lastQ =
      [...messagesRef.current]
        .reverse()
        .find((m) => m.role === "assistant" && m.msgType === "question")
        ?.content || "";
    const conversationHistory = messagesRef.current.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
    const bankSnapshot = bankQueueRef.current
      .filter((q) => !isAsked(q))
      .slice(0, 8);
    const vm = cfg.mode === "video" ? computeVideoMetrics() : undefined;

    let evalData: any = null;
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: lastQ,
          answer,
          domain: cfg.domain || cfg.subject || cfg.focusArea,
          tech: cfg.tech,
          interviewStyle: currentStyle,
          conversationHistory,
          candidateName: cfg.candidateName || "",
          resumeContext: cfg.resumeText?.slice(0, 500) || "",
          questionBank: bankSnapshot,
          questionCount: currentCount,
          audioMetrics: am,
          videoMetrics: vm,
          inputMode: cfg.mode,
          type: cfg.type,
        }),
      });
      evalData = await res.json();
    } catch (e) {
      console.error("Eval failed:", e);
    }

    const decision = evalData?.decision || "continue";
    const score = evalData?.confidenceScore || 5;
    const interviewerMessage = (evalData?.interviewerMessage || "").trim();
    const coachFeedback = (evalData?.coachFeedback || "").trim();
    const nextQuestion = (evalData?.nextQuestion || "").trim();

    setScores((prev) => [
      ...prev,
      {
        question: lastQ,
        answer,
        score,
        feedback: (evalData?.internalFeedback || coachFeedback || "").trim(),
        audioMetrics: am || undefined,
        videoMetrics: vm,
      },
    ]);

    const shouldAdvance = decision === "continue" || decision === "switch";
    const nextCount = shouldAdvance ? currentCount + 1 : currentCount;
    if (shouldAdvance) setCount(nextCount);

    if (currentStyle === "formal") {
      const nextQ =
        interviewerMessage && !isAsked(interviewerMessage)
          ? interviewerMessage
          : await getNextQuestion();
      setLoading(false);
      if (nextCount >= MAX_QUESTIONS) {
        setTimeout(endSession, 2000);
        return;
      }
      addQuestion(nextQ);
      return;
    }

    if (coachFeedback) addFeedback(coachFeedback);
    setLoading(false);
    if (nextCount >= MAX_QUESTIONS) {
      setTimeout(endSession, 2000);
      return;
    }

    setTimeout(async () => {
      const nextQ =
        decision === "retry"
          ? lastQ
          : nextQuestion && !isAsked(nextQuestion)
            ? nextQuestion
            : await getNextQuestion();
      addQuestion(nextQ);
    }, 900);
  };

  if (!config)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#555",
        }}
      >
        Loading...
      </div>
    );

  const isVoiceMode = config.mode === "voice" || config.mode === "video";
  const firstName = config.candidateName?.split(" ")[0] || "";
  const accentColor =
    config.type === "interview"
      ? "#6366f1"
      : config.type === "exam"
        ? "#10b981"
        : "#f59e0b";
  const sessionTitle =
    config.type === "interview"
      ? `${config.domain} • ${config.tech}`
      : config.type === "exam"
        ? `${config.subject || config.examType}`
        : config.focusArea || "Personality Dev";

  const gazeArrow = () => {
    const { gazeX, gazeY } = liveVideo;
    if (Math.abs(gazeX) < 0.2 && Math.abs(gazeY) < 0.2) return "⦿ Center";
    if (Math.abs(gazeX) >= Math.abs(gazeY))
      return gazeX > 0 ? "→ Right" : "← Left";
    return gazeY < 0 ? "↑ Up" : "↓ Down";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0f",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* Video countdown overlay */}
      {countdown !== null && config.mode === "video" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "#0a0a0fee",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 280,
              height: 180,
              borderRadius: 18,
              border: "2px solid #2a2a4a",
              background: "#111118",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>📷</span>
            <span style={{ fontSize: 12, color: "#555" }}>
              Camera starting...
            </span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 12,
                color: "#888",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Starting in
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color:
                  countdown <= 3
                    ? "#ef4444"
                    : countdown <= 7
                      ? "#f59e0b"
                      : accentColor,
                transition: "color 0.3s",
              }}
            >
              {countdown}
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#555",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span>📷 Center your face in the camera</span>
            <span>🎙️ Find a quiet place</span>
            <span>👁️ Look directly at the camera</span>
          </div>
          <button
            onClick={() => startSession(config)}
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              border: "none",
              borderRadius: 12,
              padding: "12px 36px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Start Now →
          </button>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          background: "#111118",
          borderBottom: "1px solid #1e1e2e",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            {config.type === "interview"
              ? "🎯"
              : config.type === "exam"
                ? "📚"
                : "🧠"}
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
              PrepBuddy{" "}
              {config.mode === "video"
                ? "🎥"
                : config.mode === "voice"
                  ? "🎙️"
                  : "💬"}
            </div>
            <div style={{ color: accentColor, fontSize: 11 }}>
              {sessionTitle}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {config.type === "interview" && (
            <div
              style={{
                display: "flex",
                background: "#1a1a2e",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #2a2a3e",
              }}
            >
              {(["formal", "advice"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setInterviewStyle(s)}
                  style={{
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background:
                      interviewStyle === s ? accentColor : "transparent",
                    color: interviewStyle === s ? "#fff" : "#888",
                    textTransform: "capitalize",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div
            style={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 8,
              padding: "5px 12px",
              fontSize: 11,
              color: "#aaa",
            }}
          >
            {Math.min(count + 1, MAX_QUESTIONS)}/{MAX_QUESTIONS}
          </div>
          <button
            onClick={endSession}
            style={{
              background: "transparent",
              border: "1px solid #ef4444",
              color: "#ef4444",
              padding: "5px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            End
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ height: 2, background: "#1a1a2e" }}>
        <div
          style={{
            height: "100%",
            width: `${(count / MAX_QUESTIONS) * 100}%`,
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
            transition: "width 0.6s ease",
          }}
        />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Video panel (only in video mode) */}
        {config.mode === "video" && (
          <div
            style={{
              width: 240,
              flexShrink: 0,
              background: "#0d0d14",
              borderRight: "1px solid #1e1e2e",
              display: "flex",
              flexDirection: "column",
              padding: 12,
              gap: 8,
              overflowY: "auto",
            }}
          >
            <div style={{ position: "relative" }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid #2a2a4a",
                  background: "#000",
                  display: "block",
                }}
              />
              {listening && (
                <div
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    background: "#1a0000cc",
                    borderRadius: 20,
                    padding: "2px 6px",
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#ef4444",
                      animation: "pulse 1s infinite",
                    }}
                  />
                  <span
                    style={{ fontSize: 9, color: "#ef4444", fontWeight: 700 }}
                  >
                    REC
                  </span>
                </div>
              )}
              {liveVideo.faceDetected && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 5,
                    left: 5,
                    background: "#111118cc",
                    borderRadius: 6,
                    padding: "2px 6px",
                    fontSize: 9,
                    color: liveVideo.eyeContact ? "#10b981" : "#ef4444",
                    fontWeight: 600,
                  }}
                >
                  {gazeArrow()}
                </div>
              )}
            </div>
            {[
              {
                label: "Face",
                val: liveVideo.faceDetected ? "Detected" : "Not detected",
                color: liveVideo.faceDetected ? "#10b981" : "#555",
                icon: "👤",
              },
              {
                label: "Eye Contact",
                val: liveVideo.faceDetected
                  ? liveVideo.eyeContact
                    ? "✓ Good"
                    : `✗ ${gazeArrow()}`
                  : "—",
                color: liveVideo.faceDetected
                  ? liveVideo.eyeContact
                    ? "#10b981"
                    : "#ef4444"
                  : "#555",
                icon: "👁️",
              },
              {
                label: "Head",
                val: liveVideo.faceDetected
                  ? liveVideo.headStraight
                    ? "✓ Upright"
                    : "⚠ Tilted"
                  : "—",
                color: liveVideo.faceDetected
                  ? liveVideo.headStraight
                    ? "#10b981"
                    : "#f59e0b"
                  : "#555",
                icon: "🎯",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: "#111118",
                  borderRadius: 7,
                  padding: "6px 8px",
                }}
              >
                <span style={{ fontSize: 10, color: "#666" }}>
                  {item.icon} {item.label}
                </span>
                <span
                  style={{ fontSize: 10, fontWeight: 700, color: item.color }}
                >
                  {item.val}
                </span>
              </div>
            ))}
            {listening && liveVideo.faceDetected && !liveVideo.eyeContact && (
              <div
                style={{
                  background: "#0f1a2e",
                  borderRadius: 7,
                  padding: "6px 8px",
                  fontSize: 10,
                  color: "#6eb4f7",
                }}
              >
                👁️ Look at the camera
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            <div
              style={{
                maxWidth: 680,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      marginBottom: 5,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color:
                        msg.role === "user"
                          ? accentColor
                          : msg.msgType === "feedback"
                            ? "#f59e0b"
                            : "#10b981",
                    }}
                  >
                    {msg.role === "user"
                      ? firstName || "You"
                      : msg.msgType === "feedback"
                        ? "Coach"
                        : "Interviewer"}
                  </div>
                  <div
                    style={{
                      maxWidth: "78%",
                      padding: "12px 16px",
                      fontSize: 14,
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap",
                      borderRadius:
                        msg.role === "user"
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                      ...(msg.role === "user"
                        ? {
                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
                            color: "#fff",
                          }
                        : msg.msgType === "feedback"
                          ? {
                              background: "#1c1a10",
                              border: "1px solid #3a3010",
                              color: "#fcd34d",
                            }
                          : {
                              background: "#131320",
                              border: "1px solid #2a2a4a",
                              color: "#e2e2f0",
                            }),
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Voice transcript preview */}
              {(listening || interimText) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: accentColor,
                      marginBottom: 5,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {firstName || "You"} (speaking...)
                  </div>
                  <div
                    style={{
                      maxWidth: "78%",
                      padding: "12px 16px",
                      fontSize: 14,
                      lineHeight: 1.65,
                      borderRadius: "18px 18px 4px 18px",
                      background: `${accentColor}22`,
                      border: `1px dashed ${accentColor}`,
                      color: "#e2e2f0",
                    }}
                  >
                    {transcript}{" "}
                    <span
                      style={{ color: `${accentColor}88`, fontStyle: "italic" }}
                    >
                      {interimText}
                    </span>
                  </div>
                </div>
              )}

              {loading && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#10b981",
                      marginBottom: 5,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {styleRef.current === "advice" && !interviewStyle
                      ? "Coach"
                      : "Interviewer"}
                  </div>
                  <div
                    style={{
                      background: "#131320",
                      border: "1px solid #2a2a4a",
                      borderRadius: "18px 18px 18px 4px",
                      padding: "12px 18px",
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    {[0, 1, 2].map((d) => (
                      <div
                        key={d}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: accentColor,
                          animation: "bounce 1.2s infinite",
                          animationDelay: `${d * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div
            style={{
              background: "#111118",
              borderTop: "1px solid #1e1e2e",
              padding: "16px 20px",
            }}
          >
            {isVoiceMode ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <button
                  onClick={listening ? stopListening : startListening}
                  disabled={loading}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: listening
                      ? "radial-gradient(circle, #ef444433, #1a0000)"
                      : `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
                    border: `2px solid ${listening ? "#ef4444" : "#2a2a4a"}`,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 24,
                    transition: "all 0.3s",
                    animation: listening ? "pulse 1.5s infinite" : "none",
                  }}
                >
                  {loading ? "⏳" : listening ? "⏹️" : "🎙️"}
                </button>
                <p style={{ color: "#555", fontSize: 11, margin: 0 }}>
                  {loading
                    ? "Processing..."
                    : listening
                      ? "Recording — tap to stop"
                      : "Tap to speak"}
                </p>
              </div>
            ) : (
              <div
                style={{
                  maxWidth: 680,
                  margin: "0 auto",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-end",
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    inputRef.current = e.target.value;
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 140) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                  placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  style={{
                    flex: 1,
                    background: "#1a1a2e",
                    border: "1px solid #2a2a4a",
                    borderRadius: 14,
                    padding: "12px 16px",
                    color: "#e2e2f0",
                    fontSize: 14,
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.5,
                    fontFamily: "inherit",
                    minHeight: 46,
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={loading}
                  style={{
                    background: loading
                      ? "#2a2a4a"
                      : `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
                    border: "none",
                    borderRadius: 14,
                    width: 46,
                    height: 46,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {loading ? "⏳" : "➤"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-6px);opacity:1}}
        @keyframes pulse{0%,100%{box-shadow:0 0 18px #ef444455}50%{box-shadow:0 0 30px #ef4444aa}}
        textarea::placeholder{color:#444}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#2a2a4a;border-radius:3px}
      `}</style>
    </div>
  );
}
