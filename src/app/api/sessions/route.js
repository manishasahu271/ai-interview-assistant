import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, sm2Update } from "@/lib/sm2";

export const runtime = "nodejs";

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function normalizeDifficultyFromAvg(avgScore10) {
  if (avgScore10 < 6) return "junior";
  if (avgScore10 > 8) return "senior";
  return "mid";
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const roleId = String(body?.roleId || "swe");
  const roleLabel = String(body?.roleLabel || roleId);
  const difficulty = String(body?.difficulty || "mid");
  const results = Array.isArray(body?.results) ? body.results : [];

  if (!results.length) {
    return NextResponse.json({ error: "Missing results" }, { status: 400 });
  }

  const scores = results.map((r) => Number(r?.score)).filter((n) => Number.isFinite(n));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const created = await prisma.interviewSession.create({
    data: {
      userId: session.user.id,
      roleId,
      roleLabel,
      difficulty,
      totalQ: results.length,
      avgScore,
      results: {
        create: results.map((r) => ({
          question: String(r.question || ""),
          qType: String(r.qType || "Technical"),
          answer: String(r.answer || ""),
          score: Number(r.score || 0),
          grade: String(r.grade || ""),
          summary: String(r.summary || ""),
        })),
      },
    },
    include: { results: true },
  });

  // Adaptive difficulty recalculation (simple heuristic)
  const nextDifficulty = normalizeDifficultyFromAvg(avgScore);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { difficulty: nextDifficulty },
  });

  // Store spaced repetition cards from the session results
  const now = new Date();
  await Promise.all(
    created.results.map(async (r) => {
      const question = r.question.trim();
      if (!question) return;

      // Map 0..10 score -> 0..5 SM-2 quality
      const quality = Math.max(0, Math.min(5, Math.round(Number(r.score || 0) / 2)));
      const questionHash = sha256(question);

      const existing = await prisma.spacedRepetitionCard.findUnique({
        where: { userId_questionHash: { userId: session.user.id, questionHash } },
      });

      const base = existing || { interval: 1, easeFactor: 2.5, repetitions: 0 };
      const next = sm2Update({
        interval: base.interval,
        easeFactor: base.easeFactor,
        repetitions: base.repetitions,
        quality,
      });

      await prisma.spacedRepetitionCard.upsert({
        where: { userId_questionHash: { userId: session.user.id, questionHash } },
        update: {
          question,
          qType: r.qType,
          roleId,
          interval: next.interval,
          easeFactor: next.easeFactor,
          repetitions: next.repetitions,
          nextReview: addDays(now, next.interval),
          lastScore: quality,
        },
        create: {
          userId: session.user.id,
          questionHash,
          question,
          qType: r.qType,
          roleId,
          interval: next.interval,
          easeFactor: next.easeFactor,
          repetitions: next.repetitions,
          nextReview: addDays(now, next.interval),
          lastScore: quality,
        },
      });
    }),
  );

  return NextResponse.json({
    ok: true,
    session: { id: created.id, avgScore: created.avgScore, totalQ: created.totalQ },
    nextDifficulty,
  });
}

