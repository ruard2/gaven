import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signAdminToken } from "@/lib/auth";
import { signCoordinatorToken, COORDINATOR_COOKIE } from "@/lib/coordinatorAuth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Vul e-mail en wachtwoord in" }, { status: 400 });
  }

  // Try admin first
  let admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    const count = await prisma.admin.count();
    if (count === 0 && email === process.env.ADMIN_EMAIL) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10);
      admin = await prisma.admin.create({ data: { email, passwordHash: hash } });
    }
  }
  if (admin && await bcrypt.compare(password, admin.passwordHash)) {
    const token = signAdminToken(admin.id);
    const res = NextResponse.json({ role: "admin" });
    res.cookies.set("admin_token", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
    return res;
  }

  // Try coordinator
  const coord = await prisma.coordinator.findFirst({
    where: { email: email.trim().toLowerCase(), status: "active" },
  });
  if (coord?.passwordHash && await bcrypt.compare(password, coord.passwordHash)) {
    const token = signCoordinatorToken(coord.id);
    const res = NextResponse.json({ role: "coordinator" });
    res.cookies.set(COORDINATOR_COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return res;
  }

  return NextResponse.json({ error: "Onbekend e-mailadres of onjuist wachtwoord" }, { status: 401 });
}
