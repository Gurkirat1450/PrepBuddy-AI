import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DOMAIN_MAP: Record<string, string> = {
  "web development": "web",
  "android development": "android",
  "artificial intelligence / machine learning": "ai-ml",
  "ai/ml": "ai-ml",
  "cloud computing": "cloud",
  "cyber security": "cyber-security",
  devops: "devops",
  "data science": "data-science",
  "ui/ux": "ui-ux",
  "software testing": "software-testing",
  blockchain: "blockchain",
};

const TECH_MAP: Record<string, string> = {
  "next.js": "nextjs",
  "node.js": "nodejs",
  "express.js": "expressjs",
  "vue.js": "vuejs",
  "react native": "react-native",
  "tailwind css": "frontend",
  "rest apis": "backend",
  graphql: "backend",
  postgresql: "sql",
  mysql: "sql",
  redis: "backend",
  mongodb: "mongodb",
  "mern stack": "fullstack",
  "mean stack": "fullstack",
  "next.js full stack": "fullstack",
  "django full stack": "fullstack",
  "spring + react": "fullstack",
  "jetpack compose": "kotlin",
  "xml layouts": "android-studio",
  "room db": "android-studio",
  firebase: "android-studio",
  mvvm: "android-studio",
  dart: "flutter",
  expo: "react-native",
  "scikit-learn": "machine-learning",
  numpy: "python",
  pandas: "python",
  tensorflow: "deep-learning",
  pytorch: "deep-learning",
  cnn: "deep-learning",
  opencv: "computer-vision",
  mediapipe: "computer-vision",
  spacy: "nlp",
  nltk: "nlp",
  bert: "nlp",
  "llm applications": "llm-applications",
  langchain: "rag-systems",
  "rag systems": "rag-systems",
  "vector databases": "rag-systems",
  ec2: "aws",
  s3: "aws",
  lambda: "aws",
  "google cloud platform": "gcp",
  "ci/cd": "github-actions",
  jenkins: "jenkins",
  terraform: "terraform",
  linux: "linux",
  "kali linux": "ethical-hacking",
  nmap: "ethical-hacking",
  "burp suite": "ethical-hacking",
  siem: "soc-analyst",
  splunk: "soc-analyst",
};

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

function loadBank(domain: string, tech: string): string[] {
  console.log(`\n[loadBank] called with domain="${domain}" tech="${tech}"`);
  console.log(`[loadBank] process.cwd() = ${process.cwd()}`);

  const domainKey = normalize(domain);
  const techKey = normalize(tech);

  const folder = DOMAIN_MAP[domainKey] || domainKey.replace(/\s+/g, "-");
  const file =
    TECH_MAP[techKey] || techKey.replace(/[\s.]+/g, "").replace(/\//g, "-");

  console.log(`[loadBank] folder="${folder}" file="${file}"`);

  const base = path.join(process.cwd(), "data", "question-bank", "interview");
  console.log(`[loadBank] base path = ${base}`);

  const tries = [
    path.join(base, folder, `${file}.json`),
    path.join(base, folder, `${techKey.replace(/[\s.]+/g, "-")}.json`),
    path.join(base, folder, `${techKey.replace(/[\s./]+/g, "")}.json`),
  ];

  for (const p of tries) {
    console.log(`[loadBank] trying: ${p}`);
    const exists = fs.existsSync(p);
    console.log(`[loadBank] exists: ${exists}`);

    if (exists) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        console.log(`[loadBank] file size: ${raw.length} chars`);
        const data = JSON.parse(raw);
        console.log(`[loadBank] ✅ loaded ${data.length} questions from ${p}`);
        return data;
      } catch (e) {
        console.error(`[loadBank] parse error:`, e);
        return [];
      }
    }
  }

  // Fallback: load all from domain folder
  const folderPath = path.join(base, folder);
  console.log(`[loadBank] trying folder fallback: ${folderPath}`);
  const folderExists = fs.existsSync(folderPath);
  console.log(`[loadBank] folder exists: ${folderExists}`);

  if (folderExists) {
    const all: string[] = [];
    const files = fs.readdirSync(folderPath);
    console.log(`[loadBank] folder contains: ${files.join(", ")}`);
    for (const f of files) {
      if (f.endsWith(".json")) {
        try {
          const q = JSON.parse(
            fs.readFileSync(path.join(folderPath, f), "utf-8"),
          );
          all.push(...q);
        } catch {}
      }
    }
    console.log(`[loadBank] fallback loaded ${all.length} total questions`);
    return all;
  }

  console.warn(
    `[loadBank] ❌ nothing found for domain="${domain}" tech="${tech}"`,
  );
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log(
      `\n[generate-question] body: ${JSON.stringify(body).slice(0, 100)}`,
    );

    const {
      domain = "",
      tech = "",
      previous = [],
      loadBankOnly = false,
    } = body;

    const bank = loadBank(domain, tech);
    console.log(`[generate-question] bank.length = ${bank.length}`);

    if (loadBankOnly) {
      return NextResponse.json({ bank });
    }

    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const prevNorm = new Set(
      (Array.isArray(previous) ? previous : []).map(norm),
    );
    const filtered = bank.filter((q) => !prevNorm.has(norm(q)));
    const pool = filtered.length > 0 ? filtered : bank;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const question =
      shuffled[0] || `Tell me about your experience with ${tech || domain}.`;

    return NextResponse.json({ question, bank });
  } catch (err) {
    console.error("[generate-question] error:", err);
    return NextResponse.json({
      question: "Walk me through a challenging project you built recently.",
      bank: [],
    });
  }
}
