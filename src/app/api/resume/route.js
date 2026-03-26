import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromPDF, extractSkills } from "@/lib/pdf-parser";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("resume") || formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const name = file.name || "resume.pdf";
    if (!name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    let rawText;
    try {
      rawText = await extractTextFromPDF(buffer);
    } catch (pdfErr) {
      console.error("[resume] PDF parse error:", pdfErr?.message || pdfErr);
      return NextResponse.json(
        { error: "Could not parse this PDF. Make sure it contains selectable text (not a scanned image)." },
        { status: 422 },
      );
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text. The PDF may be a scanned image — try a text-based PDF." },
        { status: 422 },
      );
    }

    const skills = extractSkills(rawText);
    const resume = await prisma.resume.upsert({
      where: { userId: session.user.id },
      update: { fileName: name, rawText, skills },
      create: { userId: session.user.id, fileName: name, rawText, skills },
    });

    console.log("[resume] Parsed:", name, "| Skills:", skills.length, "| Text:", rawText.length, "chars");
    return NextResponse.json({
      id: resume.id,
      fileName: resume.fileName,
      skills: resume.skills,
      skillCount: resume.skills.length,
    });
  } catch (err) {
    console.error("[resume] Error:", err?.message || err);
    return NextResponse.json({ error: `Failed to process resume: ${err?.message || String(err)}` }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await prisma.resume.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fileName: true, skills: true, updatedAt: true },
    });

    return NextResponse.json({ resume: resume || null });
  } catch (err) {
    console.error("[resume] GET error:", err?.message || err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

