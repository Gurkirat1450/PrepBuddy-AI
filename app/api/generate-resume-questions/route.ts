import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { resumeText } = await req.json();

    if (!resumeText) {
      return NextResponse.json({
        success: false,
        questions: [],
      });
    }

    const prompt = `
You are a professional technical interviewer.

Read this candidate's resume carefully.

Resume:
${resumeText}

Generate 5 realistic interview questions based ONLY on the resume.

Focus on:
- projects
- internships
- education
- technical decisions
- problem solving
- achievements

Rules:
- Return ONLY JSON array
- No explanation
- No markdown
- No headings

Example:

[
  "Tell me about your Sign Language Recognition project.",
  "Why did you choose CNN for gesture recognition?",
  "What challenges did you face while training your model?"
]
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

    let rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    rawText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const match = rawText.match(/\[[\s\S]*\]/);

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);

        return NextResponse.json({
          success: true,
          questions: parsed,
        });
      } catch (error) {
        console.error("Resume question parse error:", error);
      }
    }

    return NextResponse.json({
      success: true,
      questions: [
        "Tell me about yourself.",
        "Can you explain one major project from your resume?",
        "What technical challenge did you face recently?",
      ],
    });
  } catch (error) {
    console.error("Resume question API error:", error);

    return NextResponse.json({
      success: false,
      questions: [],
    });
  }
}
