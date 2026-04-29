import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question, answer, domain, type } = await req.json();

    const prompt = `
You are a strict professional interviewer.

Question:
${question}

Candidate Answer:
${answer}

Evaluate this answer and return ONLY valid JSON.

Do NOT explain anything.
Do NOT use markdown.
Do NOT add text before or after JSON.

Return ONLY valid JSON in this format:

{
  "score": number between 1 and 10,
  "confidenceScore": number between 1 and 10,
  "feedback": "Short professional feedback",
  "strengths": [
    "Short point 1",
    "Short point 2"
  ],
  "improvements": [
    "Short point 1",
    "Short point 2"
  ],
  "speakingAnalysis": [
    "Short speaking point 1",
    "Short speaking point 2"
  ]
}

Rules:
- confidenceScore should reflect speaking confidence
- consider clarity, structure, hesitation, and filler words
- feedback should be short
- strengths should be short
- improvements should be short
- speakingAnalysis should be short
- realistic interviewer tone only
- no markdown
- no explanation outside JSON
- feedback must be specific to the candidate answer
- do not repeat same feedback for every answer
- evaluate based on actual content quality

IMPORTANT:
Return dynamic feedback based on the actual answer.
Do NOT repeat generic responses.
Evaluate the real quality of the answer.
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
          generationConfig: {
            temperature: 0.2,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 500,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    const result = await response.json();

    let rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Remove markdown wrappers if Gemini adds them
    rawText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Extract JSON safely
    const cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const match = cleanedText.match(/\{[\s\S]*\}/);

    // Filler word detection
    const fillerWords = [
      "um",
      "uh",
      "like",
      "actually",
      "basically",
      "you know",
    ];

    const lowerAnswer = answer.toLowerCase();

    const fillerCount = fillerWords.reduce((count, word) => {
      const matches = lowerAnswer.match(new RegExp(`\\b${word}\\b`, "g"));

      return count + (matches ? matches.length : 0);
    }, 0);

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);

        return NextResponse.json({
          score: parsed.score || 6,

          confidenceScore:
            parsed.confidenceScore || Math.max(5, 10 - fillerCount),

          feedback:
            parsed.feedback ||
            "Good attempt, but stronger structure is needed.",

          strengths: parsed.strengths || [],

          improvements: parsed.improvements || [],

          speakingAnalysis: parsed.speakingAnalysis || [
            fillerCount > 3
              ? "Too many filler words detected"
              : "Good speaking clarity",

            answer.length < 80
              ? "Answer could be more detailed"
              : "Good answer length",
          ],
        });
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
      }
    }

    // Safe fallback
    return NextResponse.json({
      score: 6,
      confidenceScore: Math.max(5, 10 - fillerCount),

      feedback:
        "Decent answer, but it needs better structure and stronger examples.",

      strengths: ["Basic understanding shown", "Attempted to answer clearly"],

      improvements: [
        "Add more practical examples",
        "Improve explanation depth",
      ],

      speakingAnalysis: [
        fillerCount > 3
          ? "Too many filler words detected"
          : "Good speaking clarity",

        answer.length < 80
          ? "Answer could be more detailed"
          : "Good answer length",
      ],
    });
  } catch (error) {
    console.error("Evaluation API Error:", error);

    return NextResponse.json({
      score: 5,
      confidenceScore: 5,

      feedback: "Something went wrong during evaluation.",

      strengths: [],

      improvements: ["Please try again"],

      speakingAnalysis: ["Unable to analyze speaking confidence"],
    });
  }
}
