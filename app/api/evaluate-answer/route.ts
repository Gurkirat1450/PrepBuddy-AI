import { NextResponse } from "next/server";

type EvaluationDecision = "continue" | "retry" | "switch";

type ConversationalEvaluation = {
  response: string;
  followUp: string;
  confidenceScore: number;
  decision: EvaluationDecision;
};

const VALID_DECISIONS: EvaluationDecision[] = ["continue", "retry", "switch"];

function clampConfidenceScore(value: unknown, fallback: number) {
  const numericScore =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(10, Math.max(1, Math.round(numericScore)));
}

function getFallbackDecision(answer: string): EvaluationDecision {
  const trimmedAnswer = answer.trim();

  if (!trimmedAnswer || trimmedAnswer.length < 15) {
    return "switch";
  }

  if (trimmedAnswer.length < 80) {
    return "retry";
  }

  return "continue";
}

function buildFallbackEvaluation(
  answer: string,
  fillerCount: number,
): ConversationalEvaluation {
  const decision = getFallbackDecision(answer);

  if (decision === "switch") {
    return {
      response:
        "That's okay, it sounds like you may need a moment on this one. Let's move to a nearby question and keep the conversation flowing.",
      followUp: "Can you walk me through a related example you know well?",
      confidenceScore: clampConfidenceScore(10 - fillerCount, 4),
      decision,
    };
  }

  if (decision === "retry") {
    return {
      response:
        "You have the start of an answer, but it needs a clearer example and a stronger ending. Try framing it as situation, action, and result.",
      followUp: "Can you answer that again with one concrete example?",
      confidenceScore: clampConfidenceScore(10 - fillerCount, 6),
      decision,
    };
  }

  return {
    response:
      "That answer is clear enough to build on, especially if you add one measurable outcome. I would like to hear a bit more about your specific contribution.",
    followUp:
      "What was the hardest part of that work, and how did you handle it?",
    confidenceScore: clampConfidenceScore(10 - fillerCount, 7),
    decision,
  };
}

function normalizeEvaluation(
  parsed: Record<string, unknown>,
  fallback: ConversationalEvaluation,
): ConversationalEvaluation {
  const decision = VALID_DECISIONS.includes(
    parsed.decision as EvaluationDecision,
  )
    ? (parsed.decision as EvaluationDecision)
    : fallback.decision;

  return {
    response:
      typeof parsed.response === "string" && parsed.response.trim()
        ? parsed.response.trim()
        : fallback.response,
    followUp:
      typeof parsed.followUp === "string" && parsed.followUp.trim()
        ? parsed.followUp.trim()
        : fallback.followUp,
    confidenceScore: clampConfidenceScore(
      parsed.confidenceScore,
      fallback.confidenceScore,
    ),
    decision,
  };
}

export async function POST(req: Request) {
  try {
    const { question, answer, domain, type } = await req.json();
    const candidateAnswer = typeof answer === "string" ? answer : "";

    const prompt = `
    You are a real interviewer conducting a conversation.

    Question:
    ${question}

    Candidate Answer:
    ${answer}

    IMPORTANT:
    - The candidate has already answered previous questions.
    - NEVER repeat a previous question.
    - NEVER go back to earlier questions like "hardest part".

    Your task:
    1. Give short, specific feedback (2–3 lines)
    2. Ask a NEW follow-up question

    NEVER ask:
    "What was the hardest part of that work"

    NEVER reuse any previously asked question.

    If unsure, ask about:
    - performance evaluation
    - trade-offs
    - improvements
    - edge cases
    - scalability

    Each follow-up MUST be different from all previous questions.

    STRICT RULES:
    - Do NOT repeat or rephrase previous questions
    - Each follow-up must explore a NEW angle
    - Always go deeper or move forward

    GOOD follow-ups:
    - "How did you evaluate your model performance?"
    - "What limitations did your approach have?"
    - "What would you improve next time?"
    - "How did you handle edge cases?"

    BAD follow-ups:
    - repeating "What was the hardest part"
    - reusing earlier questions

    Return ONLY JSON:

    {
      "response": "short feedback",
      "followUp": "new unique question",
      "confidenceScore": number,
      "decision": "continue"
    }
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

    const lowerAnswer = candidateAnswer.toLowerCase();

    const fillerCount = fillerWords.reduce((count, word) => {
      const matches = lowerAnswer.match(new RegExp(`\\b${word}\\b`, "g"));

      return count + (matches ? matches.length : 0);
    }, 0);

    const fallbackEvaluation = buildFallbackEvaluation(
      candidateAnswer,
      fillerCount,
    );

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);

        return NextResponse.json(
          normalizeEvaluation(parsed, fallbackEvaluation),
        );
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
      }
    }

    // Safe fallback
    return NextResponse.json(fallbackEvaluation);
  } catch (error) {
    console.error("Evaluation API Error:", error);

    return NextResponse.json({
      response:
        "I couldn't evaluate that properly because something went wrong. Please answer once more so we can continue from the same point.",
      followUp: "Could you try answering that question again?",
      confidenceScore: 5,
      decision: "retry",
    });
  }
}
