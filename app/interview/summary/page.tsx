"use client";

import { useRouter } from "next/navigation";

export default function SummaryPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-6">Interview Complete</h1>

      <div className="bg-gray-900 p-6 rounded-2xl w-full max-w-md space-y-4">
        <div>
          <h2 className="text-lg">Conversation Review</h2>
          <p className="text-gray-400">
            You completed the practice interview. Keep reviewing the assistant
            responses and follow-up questions to improve your answers.
          </p>
        </div>

        <div>
          <h2 className="text-lg">Next Step</h2>
          <p className="text-gray-400">
            Start another session when you are ready to practice a new
            conversation.
          </p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full bg-white text-black py-3 rounded-xl font-semibold mt-4"
        >
          Restart 🔁
        </button>
      </div>
    </div>
  );
}
