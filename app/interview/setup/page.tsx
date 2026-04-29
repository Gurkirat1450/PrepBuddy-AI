"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { interviewOptions } from "@/data/options";

export default function InterviewSetupPage() {
  const router = useRouter();

  const domains = Object.keys(interviewOptions.domains);

  const [mode, setMode] = useState("voice");
  const [domain, setDomain] = useState(domains[0]);

  const tracks = Object.keys(
    interviewOptions.domains[domain as keyof typeof interviewOptions.domains]
      .tracks,
  );

  const [track, setTrack] = useState(tracks[0]);

  const technologies =
    interviewOptions.domains[domain as keyof typeof interviewOptions.domains]
      .tracks[
      track as keyof (typeof interviewOptions.domains)[keyof typeof interviewOptions.domains]["tracks"]
    ];

  const [tech, setTech] = useState(technologies[0] || "");

  const startInterview = () => {
    router.push(
      `/interview/resume?mode=${mode}&domain=${domain}&track=${track}&tech=${tech}`,
    );
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-4xl font-bold text-center mb-10">
        AI Interview Preparation 🎯
      </h1>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Mode */}
        <div>
          <h2 className="text-lg mb-3">Choose Interview Mode</h2>

          <div className="flex flex-wrap gap-3">
            {["Text", "Voice", "Video"].map((item) => (
              <button
                key={item}
                onClick={() => setMode(item.toLowerCase())}
                className={`px-4 py-2 rounded-lg border ${
                  mode === item.toLowerCase()
                    ? "bg-white text-black"
                    : "border-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Domain */}
        <div>
          <h2 className="text-lg mb-3">Choose Domain</h2>

          <div className="flex flex-wrap gap-3">
            {domains.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setDomain(item);
                  const newTracks = Object.keys(
                    interviewOptions.domains[
                      item as keyof typeof interviewOptions.domains
                    ].tracks,
                  );

                  setTrack(newTracks[0]);

                  const firstTech =
                    interviewOptions.domains[
                      item as keyof typeof interviewOptions.domains
                    ].tracks[
                      newTracks[0] as keyof (typeof interviewOptions.domains)[keyof typeof interviewOptions.domains]["tracks"]
                    ][0];

                  setTech(firstTech);
                }}
                className={`px-4 py-2 rounded-lg border ${
                  domain === item ? "bg-white text-black" : "border-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Track */}
        <div>
          <h2 className="text-lg mb-3">Choose Track</h2>

          <div className="flex flex-wrap gap-3">
            {tracks.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setTrack(item);

                  const firstTech =
                    interviewOptions.domains[
                      domain as keyof typeof interviewOptions.domains
                    ].tracks[
                      item as keyof (typeof interviewOptions.domains)[keyof typeof interviewOptions.domains]["tracks"]
                    ][0];

                  setTech(firstTech);
                }}
                className={`px-4 py-2 rounded-lg border ${
                  track === item ? "bg-white text-black" : "border-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Technology */}
        <div>
          <h2 className="text-lg mb-3">Choose Technology</h2>

          <div className="flex flex-wrap gap-3">
            {technologies.map((item) => (
              <button
                key={item}
                onClick={() => setTech(item)}
                className={`px-4 py-2 rounded-lg border ${
                  tech === item ? "bg-white text-black" : "border-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startInterview}
          className="w-full bg-white text-black py-4 rounded-xl font-semibold"
        >
          Continue to Interview 🚀
        </button>
      </div>
    </div>
  );
}
