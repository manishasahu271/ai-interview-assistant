import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function fallbackQuestions({ skills, roleId, difficulty }) {
  const skillList = (skills || []).slice(0, 8);
  const diffHint =
    difficulty === "junior"
      ? "focus on fundamentals"
      : difficulty === "senior"
        ? "go deep on architecture and trade-offs"
        : "balance fundamentals and real-world trade-offs";

  const out = [];
  for (const s of skillList.length ? skillList : ["your recent projects"]) {
    out.push({
      qType: "Technical",
      question: `Based on ${s}, explain a real problem you solved and the key decisions you made (${diffHint}).`,
      roleId,
    });
  }
  out.push({
    qType: "Behavioral",
    question:
      "Pick a project on your resume with the biggest constraints (time, scope, stakeholders). How did you prioritize and communicate trade-offs?",
    roleId,
  });
  out.push({
    qType: "System Design",
    question:
      "Choose a system you’ve worked on. Describe the architecture, bottlenecks you hit, and what you would change at 10× scale.",
    roleId,
  });
  return out.slice(0, 12);
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roleId = (searchParams.get("roleId") || "swe").toLowerCase();
  const difficulty = (searchParams.get("difficulty") || "mid").toLowerCase();

  const resume = await prisma.resume.findUnique({
    where: { userId: session.user.id },
    select: { rawText: true, skills: true, fileName: true, updatedAt: true },
  });
  if (!resume) {
    return NextResponse.json({ error: "No resume uploaded yet" }, { status: 404 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: true,
      source: "fallback",
      questions: fallbackQuestions({ skills: resume.skills, roleId, difficulty }),
      skills: resume.skills,
      resumeMeta: { fileName: resume.fileName, updatedAt: resume.updatedAt },
    });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_FEEDBACK_MODEL || "gpt-4o-mini";

  const userContent = [
    "You are an interview coach.",
    "Generate 10 interview questions tailored to the candidate’s resume and target role.",
    "Return JSON only with this shape: { \"questions\": [ { \"qType\": string, \"question\": string } ] }.",
    `Target roleId: ${roleId}`,
    `Difficulty: ${difficulty}`,
    `Extracted skills: ${JSON.stringify(resume.skills)}`,
    "Resume text (truncated):",
    resume.rawText.slice(0, 8000),
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model,
      max_tokens: 1200,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You output only valid JSON: { \"questions\": [ { \"qType\": string, \"question\": string } ] }. No markdown.",
        },
        { role: "user", content: userContent },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty OpenAI response");

    const parsed = JSON.parse(raw);
    const questions =
      parsed?.questions?.filter?.((q) => q?.question)?.map((q) => ({
        qType: q.qType || "Technical",
        question: String(q.question),
        roleId,
      })) ?? fallbackQuestions({ skills: resume.skills, roleId, difficulty });

    return NextResponse.json({
      ok: true,
      source: "openai",
      questions: questions.slice(0, 12),
      skills: resume.skills,
      resumeMeta: { fileName: resume.fileName, updatedAt: resume.updatedAt },
    });
  } catch (err) {
    console.error("[questions/resume] OpenAI error:", err?.message || err);
    const questions = fallbackQuestions({ skills: resume.skills, roleId, difficulty });
    return NextResponse.json({
      ok: true,
      source: "fallback_on_openai_error",
      questions: questions.slice(0, 12),
      skills: resume.skills,
      resumeMeta: { fileName: resume.fileName, updatedAt: resume.updatedAt },
    });
  }
}
