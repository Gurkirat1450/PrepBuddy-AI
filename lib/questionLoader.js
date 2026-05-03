import fs from "fs";
import path from "path";

export function getInterviewQuestions(domain: string, tech: string) {
  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "question-bank",
      "interview",
      domain.toLowerCase().replace(/\s/g, "-"),
      `${tech.toLowerCase().replace(/\s/g, "-")}.json`
    );

    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Question load error:", err);
    return [];
  }
}
