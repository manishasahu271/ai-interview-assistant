// NOTE: We intentionally use CommonJS `require('pdf-parse')` (via `createRequire`)
// because Next/webpack sometimes chokes on the ESM build of pdf-parse/pdfjs-dist.
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const COMMON_SKILLS = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node.js",
  "express",
  "postgresql",
  "mysql",
  "mongodb",
  "redis",
  "prisma",
  "docker",
  "kubernetes",
  "aws",
  "gcp",
  "azure",
  "graphql",
  "rest",
  "jest",
  "cypress",
  "playwright",
  "python",
  "java",
  "go",
  "rust",
  "system design",
  "microservices",
  "ci/cd",
];

function normalizeText(s) {
  return (s || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractSkills(rawText) {
  const text = (rawText || "").toLowerCase();
  const hits = new Set();

  for (const skill of COMMON_SKILLS) {
    const needle = skill.toLowerCase();
    if (needle.includes(".")) {
      // handle next.js/node.js as plain substring
      if (text.includes(needle)) hits.add(skill);
      continue;
    }
    const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) hits.add(skill);
  }

  // Lightweight extractions: "Skills: A, B, C"
  const skillsSection = rawText.match(/skills\s*[:\-]\s*([\s\S]{0,500})/i)?.[1] ?? "";
  for (const token of skillsSection.split(/[,•|/]\s*/g)) {
    const t = token.trim();
    if (t.length >= 2 && t.length <= 32) hits.add(t);
  }

  return Array.from(hits)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export async function parsePdfToText(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const mod = require("pdf-parse");
  const PDFParse = mod.PDFParse;
  // In Next.js, bundlers can break pdf-parse's internal worker loading.
  // Configure the worker explicitly to a stable CDN URL.
  if (PDFParse && typeof PDFParse.setWorker === "function") {
    const key = "__pdfparse_worker_set__";
    if (!globalThis[key]) {
      const path = require("path");
      const { pathToFileURL } = require("url");
      const workerPath = path.join(
        process.cwd(),
        "node_modules/pdf-parse/dist/pdf-parse/web/pdf.worker.mjs",
      );
      const workerUrl = pathToFileURL(workerPath).toString();
      PDFParse.setWorker(
        // Use a local absolute path so Next/webpack doesn't have to resolve
        // relative worker modules at runtime.
        workerUrl,
      );
      globalThis[key] = true;
    }
  }
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return normalizeText(result.text || "");
  } finally {
    // pdf-parse v2 exposes destroy() for cleanup
    if (typeof parser.destroy === "function") parser.destroy();
  }
}

