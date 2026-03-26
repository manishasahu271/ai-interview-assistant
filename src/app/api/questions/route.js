import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BANK = {
  swe: [
    {
      qType: "Technical",
      difficulty: "junior",
      question: "Explain the difference between a stack and a queue. When would you use each?",
    },
    {
      qType: "Technical",
      difficulty: "mid",
      question: "How does JavaScript’s event loop work? Walk through microtasks vs macrotasks.",
    },
    {
      qType: "System Design",
      difficulty: "senior",
      question: "Design a rate limiter for a public API. Discuss trade-offs and failure modes.",
    },
    {
      qType: "Behavioral",
      difficulty: "junior",
      question: "Tell me about a time you received critical feedback. What did you do next?",
    },
  ],
  frontend: [
    {
      qType: "Technical",
      difficulty: "mid",
      question: "How would you structure state management in a large React app?",
    },
    {
      qType: "System Design",
      difficulty: "senior",
      question: "Design a component library for multiple teams. How do you handle versioning and theming?",
    },
  ],
  backend: [
    {
      qType: "Technical",
      difficulty: "mid",
      question: "What are the differences between ACID transactions and eventual consistency?",
    },
    {
      qType: "System Design",
      difficulty: "senior",
      question: "Design an idempotent payments API. How do you prevent double charges?",
    },
  ],
};

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roleId = (searchParams.get("roleId") || "swe").toLowerCase();
  const difficulty = (searchParams.get("difficulty") || "").toLowerCase();
  const list = BANK[roleId] || BANK.swe;

  const filtered =
    difficulty && ["junior", "mid", "senior"].includes(difficulty)
      ? list.filter((q) => q.difficulty === difficulty)
      : list;

  return NextResponse.json({ ok: true, roleId, questions: filtered });
}

