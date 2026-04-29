"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function SummaryPage() {
  const params = useSearchParams();
  const router = useRouter();

  const scores = JSON.parse(params.get("scores") || "[]");

  const avg =
    scores.reduce((a: number, b: number) => a + b, 0) / (scores.length || 1);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-6">Interview Summary 📊</h1>

      <div className="bg-gray-900 p-6 rounded-2xl w-full max-w-md space-y-4">
        <div>
          <h2 className="text-lg">⭐ Average Score</h2>
          <p className="text-2xl font-bold">{avg.toFixed(1)}/10</p>
        </div>

        <div>
          <h2 className="text-lg">👍 Performance</h2>
          <p className="text-gray-400">
            {avg >= 7
              ? "Strong performance. You're interview ready!"
              : "Needs improvement. Keep practicing!"}
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
