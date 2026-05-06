import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { config, scores, completedAt } = body;

    // Upsert user (create if doesn't exist)
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    if (!clerkUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
      },
    });

    // Calculate average score
    const avgScore =
      scores.length > 0
        ? scores.reduce((sum: number, s: any) => sum + s.score, 0) /
          scores.length
        : null;

    // Save session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        type: config.type,
        mode: config.mode,
        domain: config.domain || null,
        track: config.track || null,
        tech: config.tech || null,
        examType: config.examType || null,
        subject: config.subject || null,
        focusArea: config.focusArea || null,
        avgScore,
        totalQ: scores.length,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        scores: {
          create: scores.map((s: any) => ({
            question: s.question,
            answer: s.answer,
            score: s.score,
            feedback: s.feedback || null,
            wordCount: s.audioMetrics?.wordCount || null,
            wordsPerMinute: s.audioMetrics?.wordsPerMinute || null,
            fillerCount: s.audioMetrics?.fillerCount || null,
            eyeContactPct: s.videoMetrics?.eyeContactPercent || null,
            headStraightPct: s.videoMetrics?.headStraightPercent || null,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    console.error("Save session error:", error);
    return NextResponse.json(
      { error: "Failed to save session" },
      { status: 500 },
    );
  }
}
