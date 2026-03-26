import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractSkills, parsePdfToText } from "@/lib/pdf-parser";

export const runtime = "nodejs";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
  }

  const fileName = (file.name || "").toLowerCase();
  const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json({ error: "Only PDF uploads supported" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const rawText = await parsePdfToText(buf);
    const skills = extractSkills(rawText);

    const resume = await prisma.resume.upsert({
      where: { userId: session.user.id },
      update: {
        fileName: file.name || "resume.pdf",
        rawText,
        skills,
      },
      create: {
        userId: session.user.id,
        fileName: file.name || "resume.pdf",
        rawText,
        skills,
      },
      select: { id: true, fileName: true, skills: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, resume });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[resume] parse failed:", err);
    return NextResponse.json({ error: "Could not parse this PDF. Try another file." }, { status: 400 });
  }
}

