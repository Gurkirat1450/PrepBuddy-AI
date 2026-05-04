import { NextResponse } from "next/server";
import mammoth from "mammoth";

function extractName(text: string): string {
  // Name is almost always the first non-empty line of a resume
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const first = lines[0] || "";

  // Basic check: first line is likely a name if it's 2-4 words, no digits, no special chars
  const words = first.split(/\s+/);
  const looksLikeName =
    words.length >= 2 &&
    words.length <= 5 &&
    !/\d/.test(first) &&
    !/[@|:|\/|\\]/.test(first) &&
    first.length < 50;

  return looksLikeName ? first : "";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file uploaded" });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || "";
    const candidateName = extractName(text);

    return NextResponse.json({
      success: true,
      text,
      candidateName,
    });
  } catch (error) {
    console.error("Resume parse error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to parse resume",
    });
  }
}
