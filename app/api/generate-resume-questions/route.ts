import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { resumeText } = await req.json();

    if (!resumeText) {
      return NextResponse.json({ success: false, questions: [] });
    }

    const prompt = `You are a professional technical interviewer. Read this resume carefully and generate 5 realistic interview questions based ONLY on what's in the resume.

Resume:
${resumeText.slice(0, 2000)}

Focus on:
- Specific projects mentioned
- Technologies and tools used
- Work experience or internships
- Achievements and metrics
- Technical decisions made

Rules:
- Questions must reference specific things from the resume
- Make them conversational, like a real interviewer would ask
- Do NOT ask generic questions like "Tell me about yourself"

Return a JSON array of exactly 5 questions:
{"questions": ["question 1", "question 2", "question 3", "question 4", "question 5"]}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(text);
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      return NextResponse.json({ success: true, questions });
    } catch {
      return NextResponse.json({
        success: true,
        questions: [
          "Can you walk me through one of the projects on your resume?",
          "What was the most challenging technical problem you solved?",
          "Tell me about a technology you used and why you chose it.",
          "What was your role and contribution in your most recent project?",
          "How did you handle a difficult situation in one of your projects?",
        ],
      });
    }
  } catch (error) {
    console.error("Resume question API error:", error);
    return NextResponse.json({ success: false, questions: [] });
  }
}
