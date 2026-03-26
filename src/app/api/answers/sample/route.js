import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const rl = new Map();

function limited(userId, key, limit, windowMs) {
  const now = Date.now();
  const k = `${userId}:${key}`;
  const item = rl.get(k) || { count: 0, resetAt: now + windowMs };
  if (now > item.resetAt) {
    item.count = 0;
    item.resetAt = now + windowMs;
  }
  item.count += 1;
  rl.set(k, item);
  return item.count > limit;
}

const SAMPLE_SYSTEM = `You are a senior technical interviewer.
Provide a strong sample answer to the interview question given in the user message.
Be specific, use concrete examples, and use STAR for behavioral questions or a clear technical framework for technical questions.
Keep the sample answer under 300 words.

Respond with ONLY a JSON object (no markdown) in this exact shape:
{ "sampleAnswer": string, "keyPoints": string[] }`;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (limited(session.user.id, "sample-answer", 20, 60_000)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const question = String(body?.question || "").trim();
    const type = String(body?.type || "Technical");
    const difficulty = String(body?.difficulty || "mid");
    const skills = Array.isArray(body?.skills) ? body.skills.slice(0, 20) : [];
    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Sample answer generation failed", detail: "OPENAI_API_KEY is not set in .env.local" },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_FEEDBACK_MODEL || "gpt-4o-mini";

    const userMessage = [
      `Question type: ${type}`,
      `Difficulty: ${difficulty}`,
      skills.length ? `Candidate skills: ${skills.join(", ")}` : "",
      `Question: ${question}`,
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model,
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SAMPLE_SYSTEM },
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Empty OpenAI response");
    }
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      sampleAnswer: String(parsed.sampleAnswer || ""),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String).slice(0, 8) : [],
      provider: "openai",
    });
  } catch (err) {
    console.error("[api/answers/sample]", err?.message || err);
    return NextResponse.json(
      { error: "Sample answer generation failed", detail: err?.message || String(err) },
      { status: 500 },
    );
  }
}
