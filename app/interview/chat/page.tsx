"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type GeneratedQuestion = {
  question: string;
  sourceQuestion: string;
  reused: boolean;
};

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase();
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const domain = searchParams.get("domain");
  const type = searchParams.get("type");
  const mode = searchParams.get("mode");
  const tech = searchParams.get("tech");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const initialized = useRef(false);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef("");
  const messagesRef = useRef<ChatMessage[]>([]);
  const askedQuestionsRef = useRef<string[]>([]);
  const manualStopRef = useRef(false);
  const suppressAutoSubmitRef = useRef(false);
  const speakingRef = useRef(false);
  const [lastQuestion, setLastQuestion] = useState("");

  const isFirstQuestion = count === 0;

  const MAX_QUESTIONS = 6;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    askedQuestionsRef.current = askedQuestions;
  }, [askedQuestions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const rememberQuestion = (...questions: string[]) => {
    setAskedQuestions((prev) => {
      const next = [...prev];
      const seen = new Set(prev.map(normalizeQuestion));

      questions.forEach((question) => {
        const normalized = normalizeQuestion(question);

        if (normalized && !seen.has(normalized)) {
          seen.add(normalized);
          next.push(question);
        }
      });

      askedQuestionsRef.current = next;
      return next;
    });
  };

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);

    // 🔥 Track last question
    setLastQuestion(content);

    if (mode === "voice" || mode === "video") {
      speakText(content);
    }
  };

  const generateQuestion = async (): Promise<GeneratedQuestion> => {
    const res = await fetch("/api/generate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain,
        tech,
        previous: Array.from(
          new Set(askedQuestionsRef.current.map((q) => normalizeQuestion(q))),
        ),
      }),
    });

    const data = await res.json();
    const question = data.question || "";

    return {
      question,
      sourceQuestion: data.sourceQuestion || question,
      reused: Boolean(data.reused),
    };
  };

  const getGeneratedQuestionText = async () => {
    const generated = await generateQuestion();
    rememberQuestion(generated.question, generated.sourceQuestion);
    return generated.question;
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    speakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onend = () => {
      speakingRef.current = false;
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const loadQuestion = async () => {
    if (loading) return;
    const nextQuestion = await getGeneratedQuestionText();
    appendAssistantMessage(nextQuestion);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // interview start
    loadQuestion();
  }, []);

  const sendMessage = async () => {
    const answer = inputRef.current.trim();
    if (!answer) return;

    const currentQuestion =
      messagesRef.current[messagesRef.current.length - 1]?.content || "";

    // Push user message
    setMessages((prev) => [...prev, { role: "user", content: answer }]);

    setInput("");
    inputRef.current = "";
    setLoading(true);

    const res = await fetch("/api/evaluate-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: currentQuestion, answer, domain }),
    });

    const data = await res.json();

    // 🧠 Step 1: Show feedback
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.response },
    ]);

    setLoading(false);

    // 🧠 Step 2: Count logic
    const shouldAdvance =
      data.decision === "continue" || data.decision === "switch";

    const nextCount = shouldAdvance ? count + 1 : count;

    if (shouldAdvance) setCount(nextCount);

    // 🧠 Step 3: End condition
    if (nextCount >= MAX_QUESTIONS) {
      setTimeout(() => {
        window.location.href = "/interview/summary";
      }, 2000);
      return;
    }

    // 🧠 Step 4: Decide next question (CLEAN LOGIC)
    setTimeout(async () => {
      let nextQuestion = "";

      const followUp =
        typeof data.followUp === "string" ? data.followUp.trim() : "";

      // 🔥 Collect ALL previous assistant questions
      const previousQuestions = messagesRef.current
        .filter((msg) => msg.role === "assistant" && msg.content.endsWith("?"))
        .map((msg) => normalizeQuestion(msg.content));

      // 🔥 Check if follow-up already asked ANYTIME
      const isRepeated =
        followUp && previousQuestions.includes(normalizeQuestion(followUp));

      if (data.decision === "continue" && followUp && !isRepeated) {
        nextQuestion = followUp;
        rememberQuestion(nextQuestion);
      } else if (data.decision === "retry") {
        nextQuestion = currentQuestion;
      } else {
        nextQuestion = await getGeneratedQuestionText();
      }

      const lastFewQuestions = messagesRef.current
        .filter((m) => m.role === "assistant" && m.content.endsWith("?"))
        .slice(-3)
        .map((m) => normalizeQuestion(m.content));

      if (
        nextQuestion &&
        lastFewQuestions.includes(normalizeQuestion(nextQuestion))
      ) {
        nextQuestion = await getGeneratedQuestionText();
      }

      if (followUp && followUp.toLowerCase().includes("hardest part")) {
        nextQuestion = await getGeneratedQuestionText();
      }

      // BLOCK INTRO QUESTIONS MID-INTERVIEW
      if (
        !isFirstQuestion &&
        nextQuestion &&
        normalizeQuestion(nextQuestion).includes("tell me about yourself")
      ) {
        nextQuestion = await getGeneratedQuestionText();
      }

      if (nextQuestion) {
        rememberQuestion(nextQuestion);

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: nextQuestion },
        ]);

        if (mode === "voice" || mode === "video") {
          speakText(nextQuestion);
        }
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold">
          {domain} • {type} Interview
        </h1>
      </div>

      {mode === "video" && (
        <div className="p-4 border-b border-gray-800 flex justify-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-72 rounded-2xl border border-gray-700"
          />
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-xl p-3 rounded-xl whitespace-pre-line ${
              msg.role === "user"
                ? "bg-white text-black ml-auto"
                : "bg-gray-900"
            }`}
          >
            {msg.content}
          </div>
        ))}

        {/* Loader */}
        {loading && (
          <div className="bg-gray-900 p-3 rounded-xl w-fit">Thinking...</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            inputRef.current = e.target.value;
          }}
          className="flex-1 bg-gray-900 p-3 rounded-xl outline-none"
          placeholder="Type your answer..."
        />

        <button
          onClick={() => {}}
          className={`px-4 rounded-xl ${
            listening ? "bg-red-500" : "bg-gray-700"
          }`}
        >
          🎤
        </button>

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-white text-black px-6 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
