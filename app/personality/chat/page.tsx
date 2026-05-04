"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PersonalityChatPage() {
  const searchParams = useSearchParams();

  const focus = searchParams.get("focus");
  const confidence = searchParams.get("confidence");
  const hr = searchParams.get("hr");

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  const loadQuestion = async () => {
    const res = await fetch("/api/generate-personality-question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        focus,
        confidence,
        hr,
      }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: data.question,
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/evaluate-answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: messages[messages.length - 1]?.content || "",
        answer: input,
        domain: focus,
        type: "personality",
      }),
    });

    const data = await res.json();

    const aiMessage = {
      role: "ai",
      content: data.response,
    };

    setMessages((prev) => [...prev, aiMessage]);
    setLoading(false);

    if (data.decision !== "switch" && data.followUp) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: data.followUp,
          },
        ]);
      }, 1000);

      return;
    }

    setTimeout(() => {
      loadQuestion();
    }, 1000);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    loadQuestion();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Personality Development 🧠</h1>
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
      </div>

      <div className="p-4 border-t border-gray-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-gray-900 p-3 rounded-xl outline-none"
          placeholder="Type your answer..."
        />

        <button
          onClick={sendMessage}
          className="bg-white text-black px-6 rounded-xl font-semibold"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
