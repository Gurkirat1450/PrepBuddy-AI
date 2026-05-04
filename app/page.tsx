"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      {/* Title */}
      <h1 className="text-5xl font-bold mb-4">PrepBuddy 🚀</h1>

      <p className="text-gray-400 mb-10 text-center max-w-xl">
        Your AI-powered buddy to prepare for interviews, exams, and improve
        confidence.
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {/* Interview */}
        <div
          onClick={() => router.push("/interview/setup")}
          className="cursor-pointer bg-gray-900 hover:bg-gray-800 transition p-6 rounded-2xl border border-gray-800"
        >
          <h2 className="text-xl font-semibold mb-2">🎤 Interview Prep</h2>
          <p className="text-gray-400">
            Practice real interview questions in a live AI conversation.
          </p>
        </div>

        {/* Exam */}
        <div
          onClick={() => router.push("/exam/setup")}
          className="bg-gray-900 p-6 rounded-2xl border border-gray-800 cursor-pointer hover:border-white transition"
        >
          <h2 className="text-xl font-semibold mb-2">📚 Exam Prep</h2>
          <p className="text-gray-400">
            Prepare subjects, important questions, theory revision, and high
            scoring topics.
          </p>
        </div>

        {/* Personality */}
        <div
          onClick={() => router.push("/personality/setup")}
          className="bg-gray-900 p-6 rounded-2xl border border-gray-800 cursor-pointer hover:border-white transition"
        >
          <h2 className="text-xl font-semibold mb-2">
            🧠 Personality Development
          </h2>

          <p className="text-gray-400">
            Improve confidence, communication skills, HR round preparation, and
            public speaking.
          </p>
        </div>
      </div>
    </div>
  );
}
