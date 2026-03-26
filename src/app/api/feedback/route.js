import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a senior technical interviewer providing feedback on an interview answer.

Your entire response must be a single valid JSON object. No markdown fences. No text before or after.

Be HONEST and SPECIFIC to what the candidate actually said:
- Vague or very short answer (1-2 sentences) → score 2-4
- Decent answer with some detail → score 5-7  
- Detailed, well-structured answer with concrete examples → score 8-10
- "I don't know" or irrelevant answer → score 1-2

JSON schema:
{
  "score": <number 1-10>,
  "summary": "<2-3 sentence assessment SPECIFIC to their actual answer>",
  "strengths": ["<specific thing they did well>"],
  "weaknesses": ["<specific thing they should improve>"],
  "improvedAnswer": "<rewritten version of their answer that would score 9-10>",
  "criteriaScores": {
    "completeness": <1-10>,
    "depth": <1-10>,
    "structure": <1-10>,
    "communication": <1-10>,
    "technicalAccuracy": <1-10>
  }
}`;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const question = String(body?.question ?? "").trim();
    const answer = String(body?.answer ?? "").trim();
    const type = String(body?.type ?? "general");
    const difficulty = String(body?.difficulty ?? "mid");
    const skills = Array.isArray(body?.skills) ? body.skills.map(String).slice(0, 20) : [];

    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }
    if (!answer) {
      return NextResponse.json({ error: "Missing answer" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Feedback failed", detail: "OPENAI_API_KEY is not set in .env.local" },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log("[api/feedback] Using OpenAI. Question:", question.slice(0, 60), "| Answer length:", answer.length);

    const userMessage = `Question: "${question}"
Type: ${type || "general"} | Difficulty: ${difficulty || "mid"}
${skills.length ? `Candidate skills: ${skills.join(", ")}` : ""}

Candidate's answer:
"""
${answer.trim()}
"""

Evaluate this answer. Respond with ONLY a JSON object.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_FEEDBACK_MODEL || "gpt-4o-mini",
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Empty OpenAI response");
    }
    console.log("[api/feedback] OpenAI raw:", raw.slice(0, 200));

    const parsed = JSON.parse(raw);

    if (typeof parsed.score !== "number" || !parsed.summary) {
      throw new Error("Invalid feedback structure from OpenAI");
    }

    console.log("[api/feedback] Success! Score:", parsed.score);
    return NextResponse.json({ ...parsed, provider: "openai" });
  } catch (err) {
    console.error("[api/feedback] ERROR:", err?.message || err);
    return NextResponse.json(
      { error: "Feedback failed", detail: err?.message || String(err) },
      { status: 500 },
    );
  }
}
