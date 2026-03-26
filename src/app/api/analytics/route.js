import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function toDayKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const since = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);

  const [sessions, last10, dueCount] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, avgScore: true, totalQ: true, roleLabel: true },
    }),
    prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, avgScore: true, createdAt: true },
    }),
    prisma.spacedRepetitionCard.count({
      where: { userId, nextReview: { lte: now } },
    }),
  ]);

  const byDay = new Map();
  for (const s of sessions) {
    const key = toDayKey(s.createdAt);
    const prev = byDay.get(key) || { day: key, sessions: 0, avgScoreSum: 0 };
    prev.sessions += 1;
    prev.avgScoreSum += s.avgScore;
    byDay.set(key, prev);
  }

  const trend = Array.from(byDay.values())
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((d) => ({
      day: d.day,
      sessions: d.sessions,
      avgScore: d.sessions ? Number((d.avgScoreSum / d.sessions).toFixed(2)) : 0,
    }));

  // Weak spots: average score by qType over last 10 sessions
  const sessionIds = last10.map((s) => s.id);
  const results = sessionIds.length
    ? await prisma.interviewResult.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { qType: true, score: true },
      })
    : [];

  const byType = new Map();
  for (const r of results) {
    const key = r.qType || "Other";
    const prev = byType.get(key) || { qType: key, n: 0, sum: 0 };
    prev.n += 1;
    prev.sum += r.score;
    byType.set(key, prev);
  }

  const weakSpots = Array.from(byType.values())
    .map((x) => ({ qType: x.qType, avgScore: x.n ? x.sum / x.n : 0 }))
    .filter((x) => x.avgScore < 6)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3)
    .map((x) => ({ ...x, avgScore: Number(x.avgScore.toFixed(2)) }));

  const overallAvg =
    sessions.length ? sessions.reduce((a, s) => a + s.avgScore, 0) / sessions.length : 0;
  const benchmarkPercentile = Math.round(clamp((overallAvg / 10) * 100, 1, 99));

  return NextResponse.json({
    ok: true,
    trend,
    totals: {
      sessionsLast30d: sessions.length,
      dueCards: dueCount,
      overallAvgScore: Number(overallAvg.toFixed(2)),
    },
    weakSpots,
    benchmarkPercentile,
  });
}

