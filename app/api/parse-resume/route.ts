import { NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        message: "No file uploaded",
      });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await mammoth.extractRawText({
      buffer,
    });

    return NextResponse.json({
      success: true,
      text: result.value,
    });
  } catch (error) {
    console.error("Resume parse error:", error);

    return NextResponse.json({
      success: false,
      message: "Failed to parse resume",
    });
  }
}
