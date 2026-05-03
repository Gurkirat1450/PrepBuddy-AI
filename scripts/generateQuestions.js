const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

console.log("API KEY:", process.env.GEMINI_API_KEY);

const BASE_PATH = path.join(process.cwd(), "data", "question-bank");

// 🔁 Recursively get all JSON files
function getAllFiles(dir) {
  let results = [];

  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (file.endsWith(".json")) {
      results.push(fullPath);
    }
  });

  return results;
}

// 🤖 Generate questions using Gemini
async function generateQuestions(domain, tech, existingQuestions) {
  const prompt = `
You are an expert interviewer.

Generate 10 high-quality interview questions for:

Domain: ${domain}
Technology: ${tech}

Rules:
- Questions must be realistic
- Avoid duplicates from this list:
${existingQuestions.slice(0, 20).join("\n")}
- Return ONLY a valid JSON array.
Do NOT include backticks, explanations, or text.
Example format:
["Question 1", "Question 2"]
- No explanation
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  const data = await res.json();

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  try {
    // 🧹 Clean response
    let cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Extract JSON array safely
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");

    if (start !== -1 && end !== -1) {
      cleaned = cleaned.slice(start, end + 1);
    }

    return JSON.parse(cleaned);
  } catch (e) {
    console.log("❌ Parse error, raw response:\n", text);
    return [];
  }
}

// 🚀 Main runner
async function run() {
  const files = getAllFiles(BASE_PATH);

  for (const file of files) {
    console.log("Processing:", file);

    const parts = file.split(path.sep);
    const tech = parts[parts.length - 1].replace(".json", "");
    const domain = parts[parts.length - 2];

    const raw = fs.readFileSync(file, "utf-8");
    let existing = [];

    try {
      existing = JSON.parse(raw);
    } catch {
      existing = [];
    }

    const newQuestions = await generateQuestions(domain, tech, existing);

    const updated = Array.from(new Set([...existing, ...newQuestions]));

    fs.writeFileSync(file, JSON.stringify(updated, null, 2));

    console.log(`Added ${newQuestions.length} questions\n`);

    // ⏳ delay to avoid API rate limits
    await new Promise((res) => setTimeout(res, 2000));
  }

  console.log("✅ All question banks updated!");
}

run();
