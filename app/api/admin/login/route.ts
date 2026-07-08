import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signAdminToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
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
