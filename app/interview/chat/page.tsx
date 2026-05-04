"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  msgType: "question" | "feedback";
};

type ScoreEntry = {
  question: string;
  answer: string;
  score: number;
  feedback: string;
};

function normalizeQ(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function isSimilar(a: string, b: string): boolean {
  const na = normalizeQ(a);
  const nb = normalizeQ(b);
  if (na === nb) return true;
  const [shorter, longer] = na.length < nb.length ? [na, nb] : [nb, na];
  return longer.includes(shorter.slice(0, Math.floor(shorter.length * 0.72)));
}

const MAX_QUESTIONS = 8;

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const domain = searchParams.get("domain") || "";
  const tech = searchParams.get("tech") || "";
  const mode = searchParams.get("mode") || "text";
  const resumeText = searchParams.get("resume") || "";
  const candidateName = searchParams.get("candidateName") || "";

  const resumeQuestions: string[] = (() => {
    try {
      return JSON.parse(searchParams.get("resumeQuestions") || "[]");
    } catch {
      return [];
    }
  })();

  const firstName = candidateName ? candidateName.split(" ")[0] : "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [interviewStyle, setInterviewStyle] = useState<"formal" | "advice">(
    "formal",
  );
  const [scores, setScores] = useState<ScoreEntry[]>([]);

  const askedSet = useRef<Set<string>>(new Set());
  const bankQueueRef = useRef<string[]>([]);
  const resumeQueueRef = useRef<string[]>([...resumeQuestions]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const inputRef = useRef("");
  const initialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);
  const scoresRef = useRef<ScoreEntry[]>([]);
  const styleRef = useRef<"formal" | "advice">("formal");

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

  // ── Load bank once on mount ───────────────────────────────────────────────
  useEffect(() => {
    // Read directly from URL — don't rely on React state
    const params = new URLSearchParams(window.location.search);
    const d = params.get("domain") || "";
    const t = params.get("tech") || "";

    console.log(`[Bank] Loading for domain="${d}" tech="${t}"`);

    if (!d && !t) {
      console.warn("[Bank] No domain or tech in URL");
      return;
    }

    fetch("/api/generate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: d,
        tech: t,
        previous: [],
        loadBankOnly: true,
      }),
    })
      .then(async (r) => {
        const text = await r.text();
        console.log(`[Bank] Raw response (100 chars): ${text.slice(0, 100)}`);
        return JSON.parse(text);
      })
      .then((data) => {
        const bank: string[] = Array.isArray(data.bank) ? data.bank : [];
        console.log(`[Bank] Questions received: ${bank.length}`);

        if (bank.length === 0) {
          console.warn("[Bank] Empty! Check generate-question route logs.");
          return;
        }

        // Shuffle with timestamp seed for different order every session
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
        console.log(
          `[Bank] ✅ Shuffled and ready: ${arr.length} questions. First 3: ${arr.slice(0, 3).join(" | ")}`,
        );
      })
      .catch((e) => console.error("[Bank] Fetch failed:", e));
  }, []); // runs once on mount

  const markAsked = (q: string) => {
    askedSet.current.add(normalizeQ(q));
  };

  const isAsked = (q: string): boolean => {
    const nq = normalizeQ(q);
    for (const a of askedSet.current) {
      if (isSimilar(nq, a)) return true;
    }
    return false;
  };

  const addQuestion = (content: string) => {
    if (!content?.trim()) return;
    markAsked(content);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content, msgType: "question" },
    ]);
    if (mode === "voice" || mode === "video") speakText(content);
  };

  const addFeedback = (content: string) => {
    if (!content?.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content, msgType: "feedback" },
    ]);
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const popFromBank = (): string | null => {
    while (bankQueueRef.current.length > 0) {
      const q = bankQueueRef.current.shift()!;
      if (!isAsked(q)) return q;
    }
    return null;
  };

  const getNextQuestion = (): string => {
    while (resumeQueueRef.current.length > 0) {
      const rq = resumeQueueRef.current.shift()!;
      if (!isAsked(rq)) return rq;
    }
    const fromBank = popFromBank();
    if (fromBank) return fromBank;
    const fallbacks = [
      `How do you handle performance optimization in ${tech}?`,
      `What is the most complex feature you built using ${tech}?`,
      `How do you approach debugging in ${tech}?`,
      `What best practices do you follow in ${tech}?`,
      `How have you structured large projects using ${tech}?`,
      `How do you handle errors in ${tech}?`,
      `What are common pitfalls in ${tech} you have encountered?`,
      `How does ${tech} compare to alternatives?`,
      `Walk me through how you would architect a new ${tech} project.`,
    ];
    return fallbacks.find((q) => !isAsked(q)) || fallbacks[0];
  };

  // Start interview
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tech") || tech;
    const fn = (params.get("candidateName") || candidateName).split(" ")[0];
    const intro = fn
      ? `Hi ${fn}! Let's begin. Please introduce yourself and tell me about your background in ${t}.`
      : `Let's begin. Please introduce yourself and tell me about your background in ${t}.`;
    addQuestion(intro);
  }, []);

  const endInterview = () => {
    sessionStorage.setItem(
      "interviewSummary",
      JSON.stringify({
        scores: scoresRef.current,
        domain,
        tech,
        candidateName,
      }),
    );
    router.push("/interview/summary");
  };

  const sendMessage = async () => {
    const answer = inputRef.current.trim();
    if (!answer || loading) return;

    const lastQuestion =
      [...messagesRef.current]
        .reverse()
        .find((m) => m.role === "assistant" && m.msgType === "question")
        ?.content || "";

    setMessages((prev) => [
      ...prev,
      { role: "user", content: answer, msgType: "question" },
    ]);
    setInput("");
    inputRef.current = "";
    setLoading(true);

    const currentStyle = styleRef.current;
    const currentCount = countRef.current;

    const conversationHistory = messagesRef.current.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const bankSnapshot = bankQueueRef.current
      .filter((q) => !isAsked(q))
      .slice(0, 8);
    console.log(
      `[Send] style=${currentStyle} qCount=${currentCount} bankSnap=${bankSnapshot.length} bankTotal=${bankQueueRef.current.length}`,
    );

    let evalData: any = null;
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: lastQuestion,
          answer,
          domain,
          tech,
          interviewStyle: currentStyle,
          conversationHistory,
          candidateName,
          resumeContext: resumeText.slice(0, 500),
          questionBank: bankSnapshot,
          questionCount: currentCount,
        }),
      });
      evalData = await res.json();
      console.log("[Eval] received:", JSON.stringify(evalData).slice(0, 200));
    } catch (e) {
      console.error("[Eval] failed:", e);
    }

    const decision: string = evalData?.decision || "continue";
    const score: number = evalData?.confidenceScore || 5;
    const interviewerMessage: string = (
      evalData?.interviewerMessage || ""
    ).trim();
    const coachFeedback: string = (evalData?.coachFeedback || "").trim();
    const nextQuestion: string = (evalData?.nextQuestion || "").trim();

    setScores((prev) => [
      ...prev,
      {
        question: lastQuestion,
        answer,
        score,
        feedback: currentStyle === "advice" ? coachFeedback : "",
      },
    ]);

    const shouldAdvance = decision === "continue" || decision === "switch";
    const nextCount = shouldAdvance ? currentCount + 1 : currentCount;
    if (shouldAdvance) setCount(nextCount);

    // ── FORMAL ────────────────────────────────────────────────────────────────
    if (currentStyle === "formal") {
      if (interviewerMessage && !isAsked(interviewerMessage)) {
        addQuestion(interviewerMessage);
      } else {
        addQuestion(getNextQuestion());
      }
      setLoading(false);
      if (nextCount >= MAX_QUESTIONS) setTimeout(endInterview, 2500);
      return;
    }

    // ── ADVICE ────────────────────────────────────────────────────────────────
    if (coachFeedback) addFeedback(coachFeedback);

    setTimeout(() => {
      if (decision === "retry") {
        addQuestion(lastQuestion);
      } else if (nextQuestion && !isAsked(nextQuestion)) {
        addQuestion(nextQuestion);
      } else {
        addQuestion(getNextQuestion());
      }
      setLoading(false);
      if (nextCount >= MAX_QUESTIONS) setTimeout(endInterview, 2500);
    }, 900);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0a0f", fontFamily: "'Segoe UI', sans-serif" }}
    >
      <div
        style={{
          background: "#111118",
          borderBottom: "1px solid #1e1e2e",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🤖
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
              PrepBuddy Interviewer
            </div>
            <div style={{ color: "#6366f1", fontSize: 12 }}>
              {domain} • {tech}
              {firstName ? ` • ${firstName}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background: interviewStyle === s ? "#6366f1" : "transparent",
                  color: interviewStyle === s ? "#fff" : "#888",
                  transition: "all 0.2s",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div
            style={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              color: "#aaa",
            }}
          >
            {Math.min(count + 1, MAX_QUESTIONS)}/{MAX_QUESTIONS}
          </div>
          <button
            onClick={endInterview}
            style={{
              background: "transparent",
              border: "1px solid #ef4444",
              color: "#ef4444",
              padding: "6px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            End Interview
          </button>
        </div>
      </div>

      <div style={{ height: 2, background: "#1a1a2e" }}>
        <div
          style={{
            height: "100%",
            width: `${(count / MAX_QUESTIONS) * 100}%`,
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
            transition: "width 0.6s ease",
          }}
        />
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "7px",
          fontSize: 11,
          color: "#555",
          background: "#0d0d14",
        }}
      >
        {interviewStyle === "formal"
          ? "🎯 Formal — Real interview experience, no feedback during session"
          : "📚 Advice — Coaching feedback after each answer"}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "0 20px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
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
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 5,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color:
                    msg.role === "user"
                      ? "#6366f1"
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
                  padding: "13px 18px",
                  fontSize: 14,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  borderRadius:
                    msg.role === "user"
                      ? "18px 18px 4px 18px"
                      : "18px 18px 18px 4px",
                  ...(msg.role === "user"
                    ? {
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
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
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 5,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: styleRef.current === "advice" ? "#f59e0b" : "#10b981",
                }}
              >
                {styleRef.current === "advice" ? "Coach" : "Interviewer"}
              </div>
              <div
                style={{
                  background: "#131320",
                  border: "1px solid #2a2a4a",
                  borderRadius: "18px 18px 18px 4px",
                  padding: "13px 20px",
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
                      background: "#6366f1",
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

      <div
        style={{
          background: "#111118",
          borderTop: "1px solid #1e1e2e",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 760,
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
                sendMessage();
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
            onClick={sendMessage}
            disabled={loading}
            style={{
              background: loading
                ? "#2a2a4a"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: 14,
              width: 46,
              height: 46,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {loading ? "⏳" : "➤"}
          </button>
        </div>
        <p
          style={{
            textAlign: "center",
            color: "#444",
            fontSize: 11,
            marginTop: 8,
          }}
        >
          Press{" "}
          <kbd
            style={{
              background: "#1a1a2e",
              padding: "1px 5px",
              borderRadius: 4,
              border: "1px solid #333",
            }}
          >
            Enter
          </kbd>{" "}
          to send
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        textarea::placeholder { color: #444; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }
      `}</style>
    </div>
  );
}
