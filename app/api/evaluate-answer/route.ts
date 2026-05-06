import { NextResponse } from "next/server";

const ACK_PHRASES = [
  "Right.",
  "Got it.",
  "Okay.",
  "Alright.",
  "Hmm.",
  "Interesting.",
  "Nice.",
  "Fair enough.",
  "That makes sense.",
  "Good.",
  "Sure.",
  "Right, makes sense.",
];

const TRANSITION_PHRASES = [
  "Let me ask you something else —",
  "Okay, so moving on —",
  "Good. Now tell me —",
  "Let's shift gears a bit —",
  "Now, I'm curious —",
  "Let me dig into something else —",
  "Okay, next up —",
  "Alright, so —",
];

function randomFrom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function callGroq(prompt: string, temperature = 0.9): Promise<string> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error(`Groq ${res.status}`);
      return "";
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    console.log(`✅ Groq: ${text.slice(0, 120)}`);
    return text;
  } catch (e) {
    console.error("Groq failed:", e);
    return "";
  }
}

function parseJSON(raw: string): Record<string, any> | null {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Build audio context string for prompt
function buildAudioContext(audioMetrics: any): string {
  if (!audioMetrics) return "";

  const {
    fillerCount,
    fillerWords,
    wordCount,
    wordsPerMinute,
    speakingTimeSeconds,
  } = audioMetrics;

  const paceNote =
    wordsPerMinute > 180
      ? "spoke very fast (may seem rushed)"
      : wordsPerMinute < 90
        ? "spoke very slowly (may seem hesitant)"
        : "spoke at a good pace";

  const fillerNote =
    fillerCount > 5
      ? `used many filler words (${fillerCount} times: ${fillerWords?.join(", ")})`
      : fillerCount > 2
        ? `used some filler words (${fillerCount} times: ${fillerWords?.join(", ")})`
        : fillerCount > 0
          ? `used few filler words (${fillerCount})`
          : "no filler words detected";

  const lengthNote =
    wordCount < 30
      ? "very short answer"
      : wordCount < 60
        ? "brief answer"
        : wordCount > 200
          ? "detailed answer"
          : "appropriate length";

  return `
VOICE DELIVERY METRICS (from speech recognition):
- Speaking pace: ${wordsPerMinute} words/min (${paceNote})
- Filler words: ${fillerNote}
- Answer length: ${wordCount} words (${lengthNote})
- Speaking duration: ${speakingTimeSeconds} seconds`;
}

export async function POST(req: Request) {
  try {
    const {
      question = "",
      answer = "",
      domain = "",
      tech = "",
      interviewStyle = "formal",
      conversationHistory = [],
      candidateName = "",
      resumeContext = "",
      questionBank = [],
      questionCount = 0,
      audioMetrics = null,
      videoMetrics = null,
      inputMode = "text", // "text" | "voice" | "video"
    } = await req.json();

    const candidateAnswer = typeof answer === "string" ? answer.trim() : "";
    const firstName = candidateName ? candidateName.split(" ")[0] : "";
    const isVoiceMode = inputMode === "voice";
    const isVideoMode = inputMode === "video";

    // Build video context for prompt
    const buildVideoContext = (vm: any): string => {
      if (!vm || vm.samplesCount === 0) return "";
      const eyeNote =
        vm.eyeContactPercent > 70
          ? "good — maintained strong eye contact"
          : vm.eyeContactPercent > 40
            ? "inconsistent — looked away frequently"
            : "poor — mostly looked away from camera";
      const postureNote =
        vm.headStraightPercent > 80
          ? "good — head upright throughout"
          : vm.headStraightPercent > 50
            ? "some head tilting"
            : "frequent head tilting detected";
      const expressionNote =
        vm.expressionNotes?.length > 0
          ? vm.expressionNotes.join(", ")
          : "neutral";
      return `
VIDEO ANALYSIS (from webcam during answer):
- Eye contact: ${vm.eyeContactPercent}% (${eyeNote})
- Head posture: ${vm.headStraightPercent}% upright (${postureNote})
- Detected expressions: ${expressionNote}`;
    };
    const videoContext = buildVideoContext(videoMetrics);

    console.log(
      `\n--- evaluate | style=${interviewStyle} | mode=${inputMode} | qCount=${questionCount} | bankLen=${questionBank.length} ---`,
    );

    if (!candidateAnswer || candidateAnswer.length < 5) {
      return NextResponse.json({
        interviewerMessage: "",
        coachFeedback: "",
        nextQuestion: "",
        internalFeedback: "Answer was too short to evaluate.",
        confidenceScore: 3,
        decision: "switch",
      });
    }

    const historyLines = conversationHistory
      .slice(-8)
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content.slice(0, 120)}`,
      )
      .join("\n");

    const askedQuestions: string[] = conversationHistory
      .filter((m: { role: string; content: string }) => m.role === "assistant")
      .map((m: { content: string }) => m.content.trim())
      .slice(-6);

    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const askedNorm = new Set(askedQuestions.map(norm));
    const unusedBank = (questionBank as string[]).filter(
      (q) => !askedNorm.has(norm(q)),
    );
    const bankSuggestion =
      unusedBank.length > 0
        ? unusedBank[Math.floor(Math.random() * unusedBank.length)]
        : null;

    const resumeHint = resumeContext
      ? `Resume context: ${resumeContext.slice(0, 200)}\n`
      : "";
    const audioContext = buildAudioContext(audioMetrics);
    const combinedContext = [audioContext, videoContext]
      .filter(Boolean)
      .join("\n");

    const ack = randomFrom(ACK_PHRASES);
    const transition =
      questionCount === 1
        ? "Alright, let me ask some technical questions now —"
        : questionCount > 0 && questionCount % 3 === 0
          ? "Okay, let's switch gears —"
          : randomFrom(TRANSITION_PHRASES);

    const askedList =
      askedQuestions.map((q, i) => `${i + 1}. ${q.slice(0, 60)}`).join("\n") ||
      "None yet.";

    // ── SCORING RUBRIC ────────────────────────────────────────────────────────
    const textScoringRubric = `
Score STRICTLY on 5 parameters (0-2 each, total /10). Do NOT default to 6 or 7.

1. Technical Accuracy (0-2)
   0 = Wrong or missing. 1 = Partially correct, key gaps. 2 = Fully correct, no errors.

2. Depth & Detail (0-2)
   0 = Surface/buzzwords only ("it improves performance").
   1 = Some explanation but vague ("it uses virtual DOM to reduce updates").
   2 = Deep explanation with mechanism ("React diffs the virtual DOM tree, finds minimal changes, batches DOM updates").

3. Real-world Application (0-2)
   0 = No example or project mentioned.
   1 = Vague reference ("I've used it in projects").
   2 = Specific: project name, what they built, concrete outcome.

4. Communication Clarity (0-2)
   0 = Rambling, hard to follow. 1 = Mostly clear but unstructured. 2 = Concise, well-organized.

5. Completeness (0-2)
   0 = Answered a different question or missed main point.
   1 = Partial — answered part of the question.
   2 = Fully addressed everything asked.

STRICT BENCHMARKS (to prevent score inflation):
- Score 4-5: Vague, surface-level, no examples, partially correct
- Score 6-7: Mostly correct, some depth, weak or no real example
- Score 8-9: Correct, specific, clear example with outcome
- Score 10: Exceptional — deep, precise, insightful, strong example

CRITICAL: Vary your scores. If you gave 6 to a previous answer, this one should be different unless identical quality. Typical interview = 4-7 range.`;

    const voiceScoringRubric = `
Score STRICTLY on 7 parameters (total /10). Do NOT default to 6.

1. Technical Accuracy (0-2)
   0=wrong/missing, 1=partially correct, 2=fully correct

2. Depth & Detail (0-2)
   0=buzzwords only, 1=some explanation, 2=deep mechanism explained

3. Real-world Application (0-1)
   0=no example, 1=specific project/outcome mentioned

4. Communication Clarity (0-1)
   0=rambling/hard to follow, 1=structured and clear

5. Completeness (0-1)
   0=missed main point, 1=fully answered

6. Fluency (0-2) — based on voice metrics below
   2=natural flow, few/no fillers, good pace
   1=some fillers OR slightly fast/slow
   0=many fillers (5+) OR very unnatural pace (<80 or >200 wpm)

7. Confidence (0-1)
   0=very hesitant, many pauses, weak delivery
   1=assertive and clear delivery

${combinedContext}

STRICT BENCHMARKS:
- 4-5: Vague, surface-level, many fillers, no example
- 6-7: Mostly correct, some depth, average delivery
- 8-9: Correct + specific example + natural delivery
- 10: Exceptional content AND excellent delivery

Vary scores — don't give everyone 6.`;

    const scoringRubric =
      isVoiceMode || isVideoMode ? voiceScoringRubric : textScoringRubric;

    const buildFormalFallback = () =>
      `${ack} ${transition} ${bankSuggestion || `Tell me about your approach to ${tech} best practices.`}`;

    const buildAdviceFallback = () => ({
      coachFeedback: `You covered the basics. To score higher, add a specific real-world example — mention a project where you applied this and what the outcome was.${isVoiceMode && audioMetrics?.fillerCount > 2 ? ` Also, try to reduce filler words like "${audioMetrics.fillerWords?.[0]}" — they can distract from your message.` : ""}`,
      nextQuestion: `Alright, let's keep going — ${bankSuggestion || `How do you handle errors in ${tech}?`}`,
    });

    // ── FORMAL MODE ──────────────────────────────────────────────────────────
    if (interviewStyle === "formal") {
      const prompt = `You are a senior technical interviewer for ${domain} / ${tech}.
${resumeHint}${combinedContext ? combinedContext + "\n" : ""}
Recent conversation:
${historyLines}

Candidate answered: "${candidateAnswer.slice(0, 300)}"

DO NOT repeat:
${askedList}
${bankSuggestion ? `\nSuggested next topic: "${bankSuggestion}"` : ""}

${scoringRubric}

Write:
- interviewerMessage: natural 2-3 sentence reply. Start with "${ack}", then "${transition}", end with ONE new question.
- internalFeedback: 2-3 sentence honest evaluation for summary page (NOT shown during interview).${isVoiceMode ? " Include 1 note about their voice delivery (pace, fillers, confidence) if relevant." : ""}

JSON only:
{
  "interviewerMessage": "ack + transition + question",
  "internalFeedback": "honest evaluation${isVoiceMode ? " including voice delivery note" : ""}",
  "confidenceScore": 6,
  "decision": "continue"
}`;

      const raw = await callGroq(prompt, 0.9);
      const parsed = parseJSON(raw);

      return NextResponse.json({
        interviewerMessage:
          parsed?.interviewerMessage?.trim() || buildFormalFallback(),
        coachFeedback: "",
        nextQuestion: "",
        internalFeedback: parsed?.internalFeedback?.trim() || "",
        confidenceScore: parsed?.confidenceScore || 5,
        decision: parsed?.decision || "continue",
      });
    }

    // ── ADVICE MODE ───────────────────────────────────────────────────────────
    if (interviewStyle === "advice") {
      const prompt = `You are a friendly interview coach for ${domain} / ${tech}.
${resumeHint}${combinedContext ? combinedContext + "\n" : ""}
Q: "${question.slice(0, 150)}"
A: "${candidateAnswer.slice(0, 300)}"

DO NOT repeat:
${askedList}
${bankSuggestion ? `\nSuggested next topic: "${bankSuggestion}"` : ""}

${scoringRubric}

Write:
1. coachFeedback: 3 sentences. Reference something specific they said. One strength + one concrete improvement.${isVoiceMode ? " If voice metrics show issues (many fillers, bad pace), include a delivery tip." : ""} Use "${firstName || "you"}" naturally. No generic openers.
2. nextQuestion: natural transition + new question not from the list above.

JSON only:
{
  "coachFeedback": "specific 3-sentence coaching${isVoiceMode ? " with optional voice tip" : ""}",
  "nextQuestion": "transition + question",
  "confidenceScore": 6,
  "decision": "continue"
}`;

      const raw = await callGroq(prompt, 0.88);
      const parsed = parseJSON(raw);
      const fallback = buildAdviceFallback();

      return NextResponse.json({
        interviewerMessage: "",
        coachFeedback: parsed?.coachFeedback?.trim() || fallback.coachFeedback,
        nextQuestion: parsed?.nextQuestion?.trim() || fallback.nextQuestion,
        internalFeedback:
          parsed?.coachFeedback?.trim() || fallback.coachFeedback,
        confidenceScore: parsed?.confidenceScore || 5,
        decision: parsed?.decision || "continue",
      });
    }

    return NextResponse.json({
      interviewerMessage: "",
      coachFeedback: "",
      nextQuestion: "",
      internalFeedback: "",
      confidenceScore: 5,
      decision: "continue",
    });
  } catch (error) {
    console.error("evaluate-answer error:", error);
    return NextResponse.json({
      interviewerMessage: "",
      coachFeedback: "",
      nextQuestion: "",
      internalFeedback: "",
      confidenceScore: 5,
      decision: "retry",
    });
  }
}
