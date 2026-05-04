import { NextResponse } from "next/server";

const INTRO_QUESTIONS: Record<string, string> = {
  communication:
    "Tell me about a time you had to explain a complex idea to someone with no technical background. How did you approach it?",
  "public speaking":
    "Describe a public speaking experience you've had — what went well and what would you do differently?",
  "hr round":
    "Give me a brief introduction about yourself — your background, strengths, and what you're looking for.",
  "confidence building":
    "Tell me about a situation where you had to step out of your comfort zone. What did you do?",
  leadership:
    "Tell me about a time you led a team or project. What was your approach?",
  default:
    "Tell me about yourself — your background, strengths, and what brings you here today.",
};

export async function POST(req: Request) {
  try {
    const {
      focus,
      confidence,
      hr,
      previous = [],
      isFirst = false,
    } = await req.json();

    if (isFirst || (Array.isArray(previous) && previous.length === 0)) {
      const introKey = (focus || "").toLowerCase();
      const question = INTRO_QUESTIONS[introKey] || INTRO_QUESTIONS.default;
      return NextResponse.json({ question });
    }

    const goals: string[] = [];
    if (confidence === "true" || confidence === true)
      goals.push("confidence improvement");
    if (hr === "true" || hr === true) goals.push("HR round preparation");

    const prompt = `You are a personality development and HR interview coach.

Session focus: ${focus || "communication"}
Goals: ${goals.join(", ") || "general personality development"}

Questions already asked (DO NOT repeat these):
${
  (Array.isArray(previous) ? previous : [])
    .slice(-8)
    .map((q: string, i: number) => `${i + 1}. ${q}`)
    .join("\n") || "None yet."
}

Generate ONE practical coaching question that:
- Is completely different from all previously asked questions
- Is relevant to the focus area: ${focus}
- Helps practice a real-world scenario
- Goes progressively deeper (not surface level)

Return JSON only:
{"question": "your question here"}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({
        question:
          parsed.question ||
          "Describe a recent situation where you showed strong communication skills.",
      });
    } catch {
      return NextResponse.json({
        question: "Tell me about a challenge you overcame recently.",
      });
    }
  } catch (error) {
    console.error("Personality question error:", error);
    return NextResponse.json({
      question: "Tell me about a challenge you overcame recently.",
    });
  }
}
