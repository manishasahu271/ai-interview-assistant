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

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));

  const due = await prisma.spacedRepetitionCard.findMany({
    where: {
      userId: session.user.id,
      nextReview: { lte: new Date() },
    },
    orderBy: [{ nextReview: "asc" }, { updatedAt: "asc" }],
    take: limit,
  });

  return NextResponse.json({ ok: true, cards: due });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const question = String(body?.question || "").trim();
  const qType = String(body?.qType || "Technical").trim();
  const roleId = String(body?.roleId || "swe").trim();
  const score = Number(body?.score);
  const reviewNow = Boolean(body?.reviewNow);

  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }
  if (!Number.isFinite(score) || score < 0 || score > 5) {
    return NextResponse.json({ error: "Score must be 0..5" }, { status: 400 });
  }

  const questionHash = sha256(question);
  const existing = await prisma.spacedRepetitionCard.findUnique({
    where: { userId_questionHash: { userId: session.user.id, questionHash } },
  });

  const base = existing || {
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
  };

  const next = sm2Update({
    interval: base.interval,
    easeFactor: base.easeFactor,
    repetitions: base.repetitions,
    quality: score,
  });

  const updated = await prisma.spacedRepetitionCard.upsert({
    where: { userId_questionHash: { userId: session.user.id, questionHash } },
    update: {
      question,
      qType,
      roleId,
      interval: next.interval,
      easeFactor: next.easeFactor,
      repetitions: next.repetitions,
      nextReview: reviewNow ? new Date() : addDays(new Date(), next.interval),
      lastScore: score,
    },
    create: {
      userId: session.user.id,
      questionHash,
      question,
      qType,
      roleId,
      interval: next.interval,
      easeFactor: next.easeFactor,
      repetitions: next.repetitions,
      nextReview: reviewNow ? new Date() : addDays(new Date(), next.interval),
      lastScore: score,
    },
  });

  return NextResponse.json({ ok: true, card: updated });
}

