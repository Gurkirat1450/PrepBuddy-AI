import fs from "fs";
import path from "path";

const domainMap = {
  "web-development": "web",
  "web dev": "web",
  "ai-ml": "ai-ml",
  "machine-learning": "ai-ml",
  "data-science": "data-science",
  "cyber-security": "cyber-security",
};

function normalize(str) {
  return str.toLowerCase().replace(/\s/g, "-");
}

export function getInterviewQuestions(domain, tech) {
  try {
    const normalizedDomain = normalize(domain);
    const normalizedTech = normalize(tech);

    const mappedDomain = domainMap[normalizedDomain] || normalizedDomain;

    const basePath = path.join(
      process.cwd(),
      "data",
      "question-bank",
      "interview",
    );

    const possiblePaths = [
      path.join(basePath, normalizedDomain, `${normalizedTech}.json`),
      path.join(basePath, mappedDomain, `${normalizedTech}.json`),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        try {
          return JSON.parse(data);
        } catch (parseErr) {
          console.error("JSON parse error in file:", filePath);
          return [];
        }
      }
    }

    console.warn("No matching question file found:", possiblePaths);
    return [];
  } catch (err) {
    console.error("Question load error:", err);
    return [];
  }
}
