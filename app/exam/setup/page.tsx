"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { examOptions } from "@/data/options";

export default function ExamSetupPage() {
  const router = useRouter();

  const examTypes = Object.keys(examOptions.examTypes);

  const [examType, setExamType] = useState(examTypes[0]);

  const selectedType =
    examOptions.examTypes[examType as keyof typeof examOptions.examTypes];

  const examNames =
    "exams" in selectedType ? Object.keys(selectedType.exams) : [];

  const [examName, setExamName] = useState(examNames[0] || "");

  const subjects =
    "subjects" in selectedType
      ? selectedType.subjects
      : examName
        ? selectedType.exams[examName as keyof typeof selectedType.exams]
        : [];

  const [subject, setSubject] = useState(subjects[0] || "");

  const [highScoring, setHighScoring] = useState(true);

  const [weakAreas, setWeakAreas] = useState(false);

  const startPreparation = () => {
    router.push(
      `/exam/chat?examType=${examType}&examName=${examName}&subject=${subject}&high=${highScoring}&weak=${weakAreas}`,
    );
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-4xl font-bold text-center mb-10">
        Smart Exam Preparation 📚
      </h1>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Exam Type */}
        <div>
          <h2 className="text-lg mb-3">Choose Exam Type</h2>

          <div className="flex flex-wrap gap-3">
            {examTypes.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setExamType(item);

                  const nextType =
                    examOptions.examTypes[
                      item as keyof typeof examOptions.examTypes
                    ];

                  if ("exams" in nextType) {
                    const firstExam = Object.keys(nextType.exams)[0];

                    setExamName(firstExam);
                    setSubject(
                      nextType.exams[
                        firstExam as keyof typeof nextType.exams
                      ][0],
                    );
                  } else {
                    setExamName("");
                    setSubject(nextType.subjects[0]);
                  }
                }}
                className={`px-4 py-2 rounded-lg border ${
                  examType === item ? "bg-white text-black" : "border-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Exam Name */}
        {examNames.length > 0 && (
          <div>
            <h2 className="text-lg mb-3">Choose Exam</h2>

            <div className="flex flex-wrap gap-3">
              {examNames.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setExamName(item);

                    setSubject(
                      selectedType.exams[
                        item as keyof typeof selectedType.exams
                      ][0],
                    );
                  }}
                  className={`px-4 py-2 rounded-lg border ${
                    examName === item
                      ? "bg-white text-black"
                      : "border-gray-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <h2 className="text-lg mb-3">Choose Subject</h2>

          <div className="flex flex-wrap gap-3">
            {subjects.map((item) => (
              <button
                key={item}
                onClick={() => setSubject(item)}
                className={`px-4 py-2 rounded-lg border ${
                  subject === item ? "bg-white text-black" : "border-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Focus */}
        <div>
          <h2 className="text-lg mb-3">Topic Focus</h2>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setHighScoring(!highScoring)}
              className={`px-4 py-2 rounded-lg border ${
                highScoring ? "bg-white text-black" : "border-gray-700"
              }`}
            >
              High Scoring Topics
            </button>

            <button
              onClick={() => setWeakAreas(!weakAreas)}
              className={`px-4 py-2 rounded-lg border ${
                weakAreas ? "bg-white text-black" : "border-gray-700"
              }`}
            >
              Weak Areas
            </button>
          </div>
        </div>

        <button
          onClick={startPreparation}
          className="w-full bg-white text-black py-4 rounded-xl font-semibold"
        >
          Start Preparation 🚀
        </button>
      </div>
    </div>
  );
}
