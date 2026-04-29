import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { examType, subject, high, weak } = await req.json();

    const prompt = `
You are an expert exam preparation mentor.

Generate ONE important expected exam question for:

Subject: ${subject}
Exam Type: ${examType}

Focus:
- High scoring topics: ${high}
- Weak areas: ${weak}

Rules:
- Return only ONE question
- No explanation
- No markdown
- Keep it realistic and exam-focused
`;

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
                  text: prompt,
                },
              ],
            },
          ],
        }),
      },
    );

    const result = await response.json();

    const question =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Explain the core concepts of this subject.";

    return NextResponse.json({
      question,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      question: "Explain the most important concept of your subject.",
    });
  }
}
