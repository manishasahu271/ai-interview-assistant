import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = (body?.token ?? "").trim();
  const password = body?.password ?? "";

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const prt = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!prt || prt.usedAt || prt.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: prt.email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

