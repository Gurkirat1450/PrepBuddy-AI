"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const domain = searchParams.get("domain");
  const type = searchParams.get("type");
  const mode = searchParams.get("mode");
  const resume = searchParams.get("resume");
  const track = searchParams.get("track");
  const tech = searchParams.get("tech");

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);
  const [scores, setScores] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [introAsked, setIntroAsked] = useState(false);

  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const manualStopRef = useRef(false);

  let resumeQuestions: string[] = [];

  try {
    const rawQuestions = searchParams.get("resumeQuestions") || "[]";

    resumeQuestions = JSON.parse(rawQuestions);
  } catch (error) {
    console.error("Resume questions parse error:", error);
    resumeQuestions = [];
  }

  const MAX_QUESTIONS = 3;

  const startCamera = async () => {
    if (mode !== "video") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera access denied:", error);
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    // 🔥 When AI finishes speaking,
    // automatically start listening
    utterance.onend = () => {
      if (mode === "voice" || mode === "video") {
        setTimeout(() => {
          startListening();
        }, 1200);
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (listening && recognitionRef.current) {
      manualStopRef.current = true;

      recognitionRef.current.abort();
      recognitionRef.current = null;

      setListening(false);
      setCurrentTranscript("");
      setInput("");

      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    if (!listening) {
      setCurrentTranscript("");
    }

    setListening(true);

    window.speechSynthesis.cancel();
    recognition.start();

    recognition.onresult = (event: any) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      const combined = finalTranscript + interimTranscript;

      setCurrentTranscript(combined);
      setInput(combined);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        setListening(false);
        return;
      }

      console.error("Speech error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);

      // If user manually stopped → do nothing
      if (manualStopRef.current) {
        manualStopRef.current = false;
        return;
      }

      if (mode === "voice" || mode === "video") {
        const cleanAnswer = input.trim();

        // Valid answer → submit
        if (cleanAnswer.length > 15) {
          setTimeout(() => {
            sendMessage();
          }, 500);
        }

        // Silence / stuck → move ahead naturally
        else {
          const aiMessage = {
            role: "ai",
            content: "Okay, no worries — let's move to the next question.",
          };

          setMessages((prev) => [...prev, aiMessage]);

          setTimeout(() => {
            loadQuestion();
          }, 1000);
        }
      }
    };
  };

  // 🔁 Load question
  const loadQuestion = async () => {
    if (loading) return;
    try {
      let nextQuestion = "";

      // First question always intro
      if (!introAsked && (mode === "voice" || mode === "video")) {
        nextQuestion = "Tell me about yourself.";
        setIntroAsked(true);
      }

      // Random resume question injection
      else if (
        resumeQuestions.length > 0 &&
        Math.random() < 0.4 // 40% chance
      ) {
        const randomIndex = Math.floor(Math.random() * resumeQuestions.length);

        nextQuestion = resumeQuestions[randomIndex];
      }

      // Otherwise normal AI-generated technical question
      else {
        const res = await fetch("/api/generate-question", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domain,
            tech,
            track,
          }),
        });

        const data = await res.json();
        nextQuestion = data.question;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: nextQuestion,
        },
      ]);

      if (mode === "voice" || mode === "video") {
        speakText(nextQuestion);
      }

      setQuestionCount((prev) => prev + 1);
    } catch (error) {
      console.error(error);
    }
  };

  // First question
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    loadQuestion();
    startCamera();
  }, []);

  // 🚀 Send answer
  const sendMessage = async () => {
    if (!input.trim()) return;

    const currentQuestion = messages[messages.length - 1]?.content;

    const userMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Evaluate
    const res = await fetch("/api/evaluate-answer", {
      method: "POST",
      body: JSON.stringify({
        question: currentQuestion,
        answer: input,
        domain,
      }),
    });

    const data = await res.json();

    setScores((prev) => [...prev, data.score]);

    const aiMessage = {
      role: "ai",
      content: `⭐ Technical Score: ${data.score}/10

    🎯 Confidence Score: ${data.confidenceScore}/10

    📝 Feedback:
    ${data.feedback}

    ✅ Strengths:
    ${(data.strengths || []).map((item: string) => `• ${item}`).join("\n")}

    🗣 Speaking Analysis:
    ${(data.speakingAnalysis || [])
      .map((item: string) => `• ${item}`)
      .join("\n")}

    🔧 Improvements:
    ${(data.improvements || []).map((item: string) => `• ${item}`).join("\n")}
    `,
    };

    setMessages((prev) => [...prev, aiMessage]);

    if (mode === "voice" || mode === "video") {
      window.speechSynthesis.cancel();

      speakText(`Your score is ${data.score} out of 10. ${data.feedback}`);
    }

    setLoading(false);

    // Increase count
    setCount((prev) => prev + 1);

    // Stop interview
    if (count + 1 >= MAX_QUESTIONS) {
      const allScores = [...scores, data.score];

      const query = encodeURIComponent(JSON.stringify(allScores));

      window.location.href = `/interview/summary?scores=${query}`;
      return;
    }

    // Load next question
    setTimeout(() => {
      loadQuestion();
    }, 1500);
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
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-gray-900 p-3 rounded-xl outline-none"
          placeholder="Type your answer..."
        />
        <button
          onClick={startListening}
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
