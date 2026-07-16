import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signAdminToken } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { blocked, retryAfterSeconds } = checkRateLimit(`admin:${ip}`);
  if (blocked) {
    const min = Math.ceil(retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `Te veel pogingen. Probeer het over ${min} minuut${min === 1 ? "" : "en"} opnieuw.` },
      { status: 429 }
    );
  }

  const { email, password } = await req.json();

  let admin = await prisma.admin.findUnique({ where: { email } });

  // Auto-create first admin if none exist
  if (!admin) {
    const count = await prisma.admin.count();
    if (count === 0 && email === process.env.ADMIN_EMAIL) {
      const hash = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || "admin123",
        10
      );
      admin = await prisma.admin.create({
        data: { email, passwordHash: hash },
      });
    }
  }

  if (!admin) {
    return NextResponse.json({ error: "Ongeldig e-mailadres of wachtwoord" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Ongeldig e-mailadres of wachtwoord" }, { status: 401 });
  }

  resetRateLimit(`admin:${ip}`);
  const token = signAdminToken(admin.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
