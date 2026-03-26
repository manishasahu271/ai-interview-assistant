import crypto from "crypto";

const SKILL_PATTERNS = {
  languages: [
    "javascript", "typescript", "python", "java", "c\\+\\+", "c#",
    "go", "rust", "ruby", "php", "swift", "kotlin", "scala",
    "sql", "html", "css", "bash", "shell",
  ],
  frameworks: [
    "react", "next\\.?js", "vue", "angular", "svelte", "express",
    "fastapi", "django", "flask", "spring boot", "rails",
    "node\\.?js", "nest\\.?js", "remix", "gatsby", "nuxt",
  ],
  databases: [
    "postgresql", "postgres", "mysql", "mongodb", "redis",
    "dynamodb", "cassandra", "elasticsearch", "sqlite", "neo4j",
    "supabase", "firebase", "prisma", "drizzle",
  ],
  cloud: [
    "aws", "gcp", "azure", "vercel", "netlify", "heroku",
    "docker", "kubernetes", "k8s", "terraform",
    "github actions", "jenkins", "circleci",
  ],
  concepts: [
    "machine learning", "deep learning", "nlp", "computer vision",
    "microservices", "rest api", "graphql", "grpc", "websocket",
    "system design", "distributed systems", "data structures",
    "algorithms", "agile", "scrum", "tdd",
    "oauth", "jwt", "authentication", "authorization",
  ],
};

export async function extractTextFromPDF(buffer) {
  const { extractText } = await import("unpdf");
  const uint8 = new Uint8Array(buffer);
  const result = await extractText(uint8);

  // unpdf can return { text } as either a string or array of page strings.
  let raw = result.text;
  if (Array.isArray(raw)) {
    raw = raw.join("\n");
  }
  if (typeof raw !== "string") {
    raw = String(raw || "");
  }
  return raw;
}

export function extractSkills(text) {
  const normalized = text.toLowerCase();
  const found = new Set();

  for (const [, patterns] of Object.entries(SKILL_PATTERNS)) {
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, "gi");
      if (regex.test(normalized)) {
        const clean = pattern
          .replace(/\\\+/g, "+")
          .replace(/\\\./g, ".")
          .replace(/\\b/g, "")
          .replace(/\\.\\?/g, ".");
        found.add(clean);
      }
    }
  }

  return Array.from(found).sort();
}

export function hashQuestion(text) {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

export function estimateExperience(text) {
  const yearPattern = /(\d{4})\s*[-–—to]+\s*(\d{4}|present|current)/gi;
  let totalMonths = 0;
  let match;

  while ((match = yearPattern.exec(text)) !== null) {
    const start = parseInt(match[1]);
    const end =
      match[2].toLowerCase() === "present" || match[2].toLowerCase() === "current"
        ? new Date().getFullYear()
        : parseInt(match[2]);
    if (end >= start && start > 1990 && end <= new Date().getFullYear() + 1) {
      totalMonths += (end - start) * 12;
    }
  }

  return Math.round(totalMonths / 12);
}

export function buildResumeContext(rawText, skills) {
  const yoe = estimateExperience(rawText);
  return [
    `Candidate Skills: ${skills.join(", ")}`,
    `Estimated Experience: ~${yoe} years`,
    `Resume Summary (first 1500 chars): ${rawText.slice(0, 1500)}`,
  ].join("\n");
}

