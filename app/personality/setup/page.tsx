"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PersonalitySetupPage() {
  const router = useRouter();

  const [focus, setFocus] = useState("communication");
  const [confidence, setConfidence] = useState(true);
  const [hrRound, setHrRound] = useState(false);

  const focusAreas = [
    "communication",
    "public speaking",
    "hr round",
    "confidence building",
    "leadership",
  ];

  const startPractice = () => {
    router.push(
      `/personality/chat?focus=${focus}&confidence=${confidence}&hr=${hrRound}`,
    );
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-4xl font-bold text-center mb-10">
        Personality Development 🧠
      </h1>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Focus Area */}
        <div>
          <h2 className="text-lg mb-3">Choose Focus Area</h2>

          <div className="flex flex-wrap gap-3">
            {focusAreas.map((item) => (
              <button
                key={item}
                onClick={() => setFocus(item)}
                className={`px-4 py-2 rounded-lg border ${
                  focus === item ? "bg-white text-black" : "border-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div>
          <h2 className="text-lg mb-3">Practice Goals</h2>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setConfidence(!confidence)}
              className={`px-4 py-2 rounded-lg border ${
                confidence ? "bg-white text-black" : "border-gray-700"
              }`}
            >
              Confidence Improvement
            </button>

            <button
              onClick={() => setHrRound(!hrRound)}
              className={`px-4 py-2 rounded-lg border ${
                hrRound ? "bg-white text-black" : "border-gray-700"
              }`}
            >
              HR Round Practice
            </button>
          </div>
        </div>

        <button
          onClick={startPractice}
          className="w-full bg-white text-black py-4 rounded-xl font-semibold"
        >
          Start Practice 🚀
        </button>
      </div>
    </div>
  );
}
