import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";

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

export const runtime = "nodejs";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (limited(session.user.id, "transcribe", 10, 60_000)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!audio || typeof audio === "string") {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio file exceeds 25MB limit" }, { status: 400 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcript = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      response_format: "text",
      language: "en",
    });
    return NextResponse.json({ transcript: String(transcript || "").trim() });
  } catch (err) {
    return NextResponse.json(
      { error: "Transcription failed. Please try again." },
      { status: 500 },
    );
  }
}

