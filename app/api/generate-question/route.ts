import { NextResponse } from "next/server";
import { questionBank } from "@/data/questions";

export async function POST(req: Request) {
  const {
    domain = "frontend",
    type = "technical",
    previous = [],
  } = await req.json();

  const baseQuestions = questionBank[domain]?.[type] || [
    "Tell me about yourself",
  ];

  // 🚫 Remove already asked
  const filtered = baseQuestions.filter((q: string) => !previous.includes(q));

  const base =
    filtered.length > 0
      ? filtered[Math.floor(Math.random() * filtered.length)]
      : baseQuestions[Math.floor(Math.random() * baseQuestions.length)];

  // 🤖 Gemini call
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

                Given this real interview question:

                "${base}"

                Generate ONLY ONE improved interview question that tests the same concept.

                Rules:
                - Return only the final interview question
                - No explanation
                - No multiple options
                - No markdown
                - No bullet points
                - Keep it short and realistic
                - Sound like a real interviewer

                Example good output:
                How does React's Virtual DOM improve rendering performance?

                Example bad output:
                Here are 3 possible ways to ask...
                `,
              },
            ],
          },
        ],
      }),
    },
  );

  const data = await response.json();

  const question = data?.candidates?.[0]?.content?.parts?.[0]?.text || base;

  return NextResponse.json({ question });
}
