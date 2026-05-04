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

// ── Groq API call ─────────────────────────────────────────────────────────────
// Free tier: 30 req/min, 14,400 req/day — way more than enough
async function callGroq(prompt: string, temperature = 0.9): Promise<string> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // best free model on Groq
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: 500,
        response_format: { type: "json_object" }, // forces JSON output
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Groq error ${res.status}:`, err.slice(0, 200));
      return "";
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    console.log(`✅ Groq response (150 chars): ${text.slice(0, 150)}`);
    return text;
  } catch (e) {
    console.error("Groq call failed:", e);
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
    } = await req.json();

    const candidateAnswer = typeof answer === "string" ? answer.trim() : "";
    const firstName = candidateName ? candidateName.split(" ")[0] : "";

    console.log(
      `\n--- evaluate | style=${interviewStyle} | qCount=${questionCount} | bankLen=${questionBank.length} ---`,
    );

    if (!candidateAnswer || candidateAnswer.length < 5) {
      return NextResponse.json({
        interviewerMessage: "",
        coachFeedback: "",
        nextQuestion: "",
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

    // Fallbacks when API fails
    const buildFormalFallback = (): string => {
      const q =
        bankSuggestion ||
        `Tell me about your approach to ${tech} best practices.`;
      return `${ack} ${transition} ${q}`;
    };

    const buildAdviceFallback = () => ({
      coachFeedback: `You gave a solid answer${firstName ? `, ${firstName}` : ""}. To make it stronger, add a specific example with a measurable outcome — numbers and concrete results make answers much more memorable to interviewers.`,
      nextQuestion: `Alright, let's keep going — ${bankSuggestion || `How do you handle errors in ${tech}?`}`,
    });

    // ── FORMAL MODE ──────────────────────────────────────────────────────────
    if (interviewStyle === "formal") {
      const prompt = `You are a senior technical interviewer interviewing ${firstName || "a candidate"} for a ${domain} / ${tech} role.
${resumeHint}
Recent conversation:
${historyLines}

Candidate's answer: "${candidateAnswer.slice(0, 300)}"

Questions already asked (DO NOT repeat any of these):
${askedList}

${bankSuggestion ? `Suggested next question topic: "${bankSuggestion}"` : ""}

Write your next interviewer message. It must:
1. Start with a short acknowledgment: "${ack}" or similar
2. Then a natural transition: "${transition}" or similar
3. End with ONE new interview question (not from the already-asked list)

Keep it 2-3 sentences. Sound like a real human interviewer — casual, natural.
Never say "Great answer!" or "Excellent!" — too fake.
${firstName ? `Occasionally use "${firstName}" naturally.` : ""}

Also rate the answer 1-10 and set decision to "continue", "retry" (vague answer), or "switch" (wrong/blank).

Respond with valid JSON only:
{"interviewerMessage": "your 2-3 sentence reply ending with a question", "confidenceScore": 7, "decision": "continue"}`;

      const raw = await callGroq(prompt, 0.9);
      const parsed = parseJSON(raw);
      const msg = parsed?.interviewerMessage?.trim() || buildFormalFallback();
      console.log(`formal msg: ${msg.slice(0, 100)}`);

      return NextResponse.json({
        interviewerMessage: msg,
        coachFeedback: "",
        nextQuestion: "",
        confidenceScore: parsed?.confidenceScore || 6,
        decision: parsed?.decision || "continue",
      });
    }

    // ── ADVICE MODE ───────────────────────────────────────────────────────────
    if (interviewStyle === "advice") {
      const prompt = `You are a friendly interview coach helping ${firstName || "a student"} prepare for a ${domain} / ${tech} interview.
${resumeHint}
Question asked: "${question.slice(0, 150)}"
Candidate's answer: "${candidateAnswer.slice(0, 300)}"

Questions already asked (DO NOT repeat any of these):
${askedList}

${bankSuggestion ? `Suggested next question topic: "${bankSuggestion}"` : ""}

Write two things:

1. coachFeedback: 3 sentences of specific coaching.
   - Reference something they actually said
   - Point out one strength and one concrete improvement
   - Give a tip: "Next time, try..." or "You could strengthen this by..."
   - Use their name "${firstName || "you"}" naturally
   - Do NOT start with "Good answer" or any generic opener

2. nextQuestion: a natural transition + one new question.
   - Start with "Alright, next —" or "Okay, let's keep going —" or similar
   - Ask one new question NOT from the already-asked list above

Also rate the answer 1-10 and set decision to "continue", "retry", or "switch".

Respond with valid JSON only:
{"coachFeedback": "3 sentences of specific feedback", "nextQuestion": "transition + question", "confidenceScore": 7, "decision": "continue"}`;

      const raw = await callGroq(prompt, 0.88);
      const parsed = parseJSON(raw);
      const fallback = buildAdviceFallback();

      const coachFeedback =
        parsed?.coachFeedback?.trim() || fallback.coachFeedback;
      const nextQuestion =
        parsed?.nextQuestion?.trim() || fallback.nextQuestion;

      console.log(`advice feedback: ${coachFeedback.slice(0, 100)}`);
      console.log(`advice nextQ: ${nextQuestion.slice(0, 80)}`);

      return NextResponse.json({
        interviewerMessage: "",
        coachFeedback,
        nextQuestion,
        confidenceScore: parsed?.confidenceScore || 6,
        decision: parsed?.decision || "continue",
      });
    }

    return NextResponse.json({
      interviewerMessage: "",
      coachFeedback: "",
      nextQuestion: "",
      confidenceScore: 5,
      decision: "continue",
    });
  } catch (error) {
    console.error("evaluate-answer error:", error);
    return NextResponse.json({
      interviewerMessage: "",
      coachFeedback: "",
      nextQuestion: "",
      confidenceScore: 5,
      decision: "retry",
    });
  }
}
