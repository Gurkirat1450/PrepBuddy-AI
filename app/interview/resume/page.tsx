"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResumeUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get("mode");
  const domain = searchParams.get("domain");
  const track = searchParams.get("track");
  const tech = searchParams.get("tech");

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const continueInterview = async () => {
    if (!file) {
      alert("Please upload your resume DOCX first.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("resume", file);

    const res = await fetch("/api/parse-resume", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!data.success) {
      alert("Failed to read resume. Please try again.");
      setLoading(false);
      return;
    }

    const questionRes = await fetch("/api/generate-resume-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: data.text }),
    });

    const questionData = await questionRes.json();

    setLoading(false);

    const params = new URLSearchParams({
      mode: mode || "text",
      domain: domain || "",
      track: track || "",
      tech: tech || "",
      resume: data.text.slice(0, 3000), // keep URL manageable
      candidateName: data.candidateName || "",
      resumeQuestions: JSON.stringify(questionData.questions || []),
    });

    router.push(`/interview/chat?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">
          Upload Resume 📄
        </h1>
        <p className="text-gray-400 mb-6 text-center">
          Upload your resume so AI can create a personalized interview
          experience.
        </p>

        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <label className="block text-lg font-medium mb-4">
            Upload Resume DOCX
          </label>
          <label className="cursor-pointer block">
            <div className="bg-black border border-gray-700 rounded-xl p-4 text-center hover:border-white transition">
              {file ? file.name : "Click to upload your DOCX resume"}
            </div>
            <input
              type="file"
              accept=".docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={continueInterview}
          disabled={loading || !file}
          className="w-full mt-6 bg-white text-black py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Reading Resume..." : "Continue to Interview 🚀"}
        </button>
      </div>
    </div>
  );
}
