import { NextResponse } from "next/server";
import { getInterviewQuestions } from "@/lib/questionLoader";

export async function POST(req: Request) {
  try {
    const { domain = "web", tech = "react", previous = [] } = await req.json();

    // 📦 Load from JSON question bank
    const questions = getInterviewQuestions(domain, tech);

    if (!questions.length) {
      return NextResponse.json({
        question: "Tell me about yourself",
      });
    }

    // 🚫 Remove already asked questions
    const filtered = questions.filter((q: string) => !previous.includes(q));

    const base =
      filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : questions[Math.floor(Math.random() * questions.length)];

    // 🤖 Improve with Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are a professional interviewer.

Given this interview question:
"${base}"

Rewrite it slightly to sound natural and conversational.

Rules:
- Return ONLY one question
- No explanation
- No formatting
- Keep it short and realistic
- Do NOT repeat the exact same wording
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

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Question API error:", error);

    return NextResponse.json({
      question: "Tell me about your recent experience.",
    });
  }
}
