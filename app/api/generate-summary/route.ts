import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { scores, domain, tech, candidateName } = await req.json();

    if (!scores || scores.length === 0) {
      return NextResponse.json({
        strengths: [],
        improvements: [],
        overallTip: "",
      });
    }

    const firstName = candidateName
      ? candidateName.split(" ")[0]
      : "the candidate";

    // Build a concise summary of answers for Groq
    const answerSummary = scores
      .map((s: any, i: number) => {
        let line = `Q${i + 1}: ${s.question.slice(0, 80)}\nAnswer: ${s.answer.slice(0, 200)}\nScore: ${s.score}/10`;
        if (s.audioMetrics) {
          line += `\nVoice: ${s.audioMetrics.wordsPerMinute} wpm, ${s.audioMetrics.fillerCount} filler words`;
        }
        if (s.videoMetrics && s.videoMetrics.samplesCount > 0) {
          line += `\nVideo: eye contact ${s.videoMetrics.eyeContactPercent}%, posture ${s.videoMetrics.headStraightPercent}%`;
          if (s.videoMetrics.expressionNotes?.length > 0) {
            line += `, expressions: ${s.videoMetrics.expressionNotes.join(", ")}`;
          }
        }
        return line;
      })
      .join("\n\n");

    // Check if this was a video interview
    const hasVideoData = scores.some(
      (s: any) => s.videoMetrics && s.videoMetrics.samplesCount > 0,
    );
    const hasAudioData = scores.some((s: any) => s.audioMetrics);

    const prompt = `You are an expert interview coach reviewing ${firstName} for ${domain} / ${tech} interview.

Here are their questions and answers:
${answerSummary}

IMPORTANT: Write everything in SECOND PERSON directly to the candidate (use "you", "your" — never "he", "she", "they", "Gurkirat", "the candidate").

Analyze the answers and return a JSON with:

1. strengths: array of 3-4 specific strengths observed across ALL answers. These should be about:
   - Communication clarity (how well they explained things)
   - Technical depth (specific concepts they demonstrated)
   - Structure (how organized their answers were)
   - Real-world experience (projects or examples they mentioned)
   - Any other genuine strength you observed
   Each strength should be 1 sentence, specific, not generic.

2. improvements: array of 3-4 specific areas to work on, each with:
   - topic: short label (e.g. "Concrete Examples", "Depth on X")
   - tip: 1-2 sentence actionable advice

3. overallTip: one strong piece of advice for their next interview (2-3 sentences)

${
  hasVideoData
    ? `
VIDEO/BODY LANGUAGE ANALYSIS:
Also evaluate the video metrics above and include:
- 1-2 strengths about body language, eye contact, or expressions if they were good
- 1-2 improvement areas about eye contact, posture, or expressions if they were poor
- Include specific video advice in overallTip (e.g., "maintain eye contact with the camera", "keep your head upright")
`
    : ""
}${
      hasAudioData
        ? `
VOICE DELIVERY ANALYSIS:
Also evaluate pace and filler words:
- Note if speaking pace was good or needs work
- Note if filler words were a problem
`
        : ""
    }

Return JSON only:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": [
    {"topic": "label", "tip": "actionable advice"},
    {"topic": "label", "tip": "actionable advice"}
  ],
  "overallTip": "overall advice for next interview"
}`;

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
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        overallTip: parsed.overallTip || "",
      });
    } catch {
      return NextResponse.json({
        strengths: [],
        improvements: [],
        overallTip: "",
      });
    }
  } catch (error) {
    console.error("Summary generation error:", error);
    return NextResponse.json({
      strengths: [],
      improvements: [],
      overallTip: "",
    });
  }
}
