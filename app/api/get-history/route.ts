import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) return NextResponse.json({ sessions: [] });

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      include: {
        scores: {
          select: {
            id: true,
            question: true,
            answer: true,
            score: true,
            feedback: true,
            wordCount: true,
            wordsPerMinute: true,
            fillerCount: true,
            eyeContactPct: true,
            headStraightPct: true,
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
