import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { focus, confidence, hr } = await req.json();

    const prompt = `
You are a personality development coach.

Generate ONE practical coaching question for:

Focus Area: ${focus}

Goals:
- Confidence improvement: ${confidence}
- HR Round Practice: ${hr}

Rules:
- Return only ONE question
- No explanation
- No markdown
- Keep it realistic and helpful
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
      "Introduce yourself confidently.";

    return NextResponse.json({
      question,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      question: "Tell me about yourself confidently.",
    });
  }
}
