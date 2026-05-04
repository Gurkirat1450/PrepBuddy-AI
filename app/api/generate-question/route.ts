import { NextResponse } from "next/server";
import { getInterviewQuestions } from "@/lib/questionLoader";

const FALLBACK_QUESTIONS = [
  "Tell me about yourself.",
  "Walk me through a recent project you worked on.",
  "What was a technical challenge you solved recently?",
  "How do you approach debugging a difficult issue?",
  "What would you improve in one of your recent projects?",
];

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const { domain, tech, previous: previousQuestions = [] } = await req.json();

    const questions = getInterviewQuestions(domain, tech);

    const askedQuestionSet = new Set(
      (Array.isArray(previousQuestions) ? previousQuestions : [])
        .filter((q): q is string => typeof q === "string")
        .map(normalizeQuestion),
    );

    const questionBank = questions.length > 0 ? questions : FALLBACK_QUESTIONS;

    const introQuestions = ["Tell me about yourself", "Introduce yourself"];

    const filteredQuestionBank = questionBank.filter(
      (q) => !introQuestions.includes(normalizeQuestion(q)),
    );

    const filtered = filteredQuestionBank.filter(
      (q) => !askedQuestionSet.has(normalizeQuestion(q)),
    );

    const basePool = filtered.length > 0 ? filtered : questionBank;

    const shuffled = basePool.sort(() => Math.random() - 0.5);

    const base = shuffled[0];

    // 🔥 Gemini prompt FIXED (NO REPETITION)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
                  You are a professional interviewer.

                  Given this base question:
                  "${base}"

                  Generate a DIFFERENT interview question.

                  STRICT RULES:
                  - Do NOT repeat the same question
                  - Do NOT rephrase the same wording
                  - Ask a different angle or concept
                  - Keep it natural and realistic
                  - Return ONLY one question

                  Examples:
                  Instead of repeating:
                  "What was the hardest part?"

                  Ask:
                  - "What trade-offs did you consider?"
                  - "How did you validate your approach?"
                  - "What would you improve next time?"
                  `,
                },
              ],
            },
          ],
        }),
      },
    );

    const data = await response.json();

    const question =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || base;

    return NextResponse.json({
      question,
      sourceQuestion: base,
      reused: filtered.length === 0,
    });
  } catch (error) {
    console.error("Question API error:", error);

    return NextResponse.json({
      question: "Tell me about your recent experience.",
      sourceQuestion: "Tell me about your recent experience.",
      reused: false,
    });
  }
}
