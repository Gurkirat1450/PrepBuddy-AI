import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const EXAM_FILE_MAP: Record<string, string> = {
  "operating systems": "competitive/gate-cse",
  dbms: "competitive/gate-cse",
  "compiler design": "competitive/gate-cse",
  "cloud computing": "certifications/aws-certification",
  "computer networks": "competitive/gate-cse",
  "software engineering": "competitive/gate-cse",
  "artificial intelligence": "competitive/gate-cse",
  "machine learning": "competitive/gate-cse",
  upsc: "government/upsc",
  "ssc cgl": "government/ssc-cgl",
  "bank po": "government/bank-po",
  gate: "competitive/gate-cse",
  cat: "competitive/cat",
  gre: "competitive/gre",
  "aws certification": "certifications/aws-certification",
  ccna: "certifications/ccna",
};

function getExamQuestions(examType: string, subject: string): string[] {
  const key = (subject || examType || "").trim().toLowerCase();
  const fileKey = EXAM_FILE_MAP[key];
  const basePath = path.join(process.cwd(), "data", "question-bank", "exam");
  if (fileKey) {
    const p = path.join(basePath, `${fileKey}.json`);
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, "utf-8"));
      } catch {}
    }
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const { examType, subject, high, weak, previous = [] } = await req.json();

    const bank = getExamQuestions(examType, subject);
    const norm = (s: string) => s.trim().toLowerCase();
    const askedSet = new Set(
      (Array.isArray(previous) ? previous : []).map(norm),
    );
    const filtered = bank.filter((q) => !askedSet.has(norm(q)));
    const pool = filtered.length > 0 ? filtered : bank;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const baseQuestion =
      shuffled[0] || `Explain a key concept in ${subject || examType}.`;

    const focusHint =
      high === "true"
        ? "Focus on high-scoring, frequently tested topics."
        : weak === "true"
          ? "Focus on commonly misunderstood or tricky concepts."
          : "Cover a variety of important topics.";

    const prompt = `You are an exam preparation tutor for ${examType} - ${subject}.

Base question from question bank: "${baseQuestion}"

Previously asked (DO NOT repeat):
${
  (Array.isArray(previous) ? previous : [])
    .slice(-6)
    .map((q: string, i: number) => `${i + 1}. ${q}`)
    .join("\n") || "None yet."
}

${focusHint}

Generate ONE exam prep question inspired by the base but from a different angle. Must be:
- Different from all previously asked questions
- Specific to ${subject || examType}
- Tests understanding, not just memorization

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
        temperature: 0.85,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({ question: parsed.question || baseQuestion });
    } catch {
      return NextResponse.json({ question: baseQuestion });
    }
  } catch (error) {
    console.error("Exam question error:", error);
    return NextResponse.json({
      question: "Explain a key concept from this subject with an example.",
    });
  }
}
