import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

function appBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL?.startsWith("http")
      ? process.env.VERCEL_URL
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").toLowerCase().trim();

  // Always return ok to avoid account enumeration
  if (!email) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  });

  const resetUrl = `${appBaseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;

  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (process.env.RESEND_API_KEY && fromEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Reset your password",
      html: `<p>Reset link (valid 30 min):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  } else {
    // In dev, it's still useful to see the link in server logs.
    // eslint-disable-next-line no-console
    console.log("[forgot-password] reset url:", resetUrl);
  }

  return NextResponse.json({ ok: true });
}

