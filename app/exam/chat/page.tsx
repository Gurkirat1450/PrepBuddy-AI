"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Message = { role: "ai" | "user"; content: string };

export default function ExamChatPage() {
  const searchParams = useSearchParams();
  const examType = searchParams.get("examType") || "";
  const subject = searchParams.get("subject") || "";
  const high = searchParams.get("high") || "false";
  const weak = searchParams.get("weak") || "false";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const initialized = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const askedQuestionsRef = useRef<string[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const loadQuestion = async () => {
    try {
      const res = await fetch("/api/generate-exam-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType,
          subject,
          high,
          weak,
          previous: askedQuestionsRef.current,
        }),
      });
      const data = await res.json();
      const q = data.question || "";
      if (q) {
        askedQuestionsRef.current = [...askedQuestionsRef.current, q];
        setMessages((prev) => [...prev, { role: "ai", content: q }]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const currentQuestion =
      messagesRef.current.filter((m) => m.role === "ai").slice(-1)[0]
        ?.content || "";

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Build conversation history
    const conversationHistory = messagesRef.current.slice(-8).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    const res = await fetch("/api/evaluate-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: currentQuestion,
        answer: input,
        domain: subject || examType,
        type: "exam",
        conversationHistory,
      }),
    });

    const data = await res.json();
    setMessages((prev) => [...prev, { role: "ai", content: data.response }]);
    setLoading(false);

    // Follow-up or new question
    if (data.decision !== "switch" && data.followUp) {
      const followUp = data.followUp.trim();
      const alreadyAsked = askedQuestionsRef.current
        .map((q) => q.trim().toLowerCase())
        .includes(followUp.toLowerCase());

      if (!alreadyAsked) {
        setTimeout(() => {
          askedQuestionsRef.current = [...askedQuestionsRef.current, followUp];
          setMessages((prev) => [...prev, { role: "ai", content: followUp }]);
        }, 1000);
        return;
      }
    }

    setTimeout(() => loadQuestion(), 1000);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadQuestion();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">
          {subject || examType} Preparation 📚
        </h1>
        <p className="text-gray-400 mt-1">
          Smart revision for {examType} exams
        </p>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-2xl p-4 rounded-2xl ${
              msg.role === "user"
                ? "ml-auto bg-white text-black"
                : "bg-gray-900"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="bg-gray-900 p-4 rounded-2xl animate-pulse w-fit">
            Thinking...
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 bg-gray-900 p-3 rounded-xl outline-none"
          placeholder="Type your answer..."
          disabled={loading}
        />
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
