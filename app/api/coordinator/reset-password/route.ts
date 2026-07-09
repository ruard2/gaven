import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signCoordinatorToken, COORDINATOR_COOKIE } from "@/lib/coordinatorAuth";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const reset = await prisma.coordinatorResetToken.findUnique({ where: { token } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link ongeldig of verlopen" }, { status: 410 });
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.coordinator.update({ where: { id: reset.coordinatorId }, data: { passwordHash: hash } });
  await prisma.coordinatorResetToken.update({ where: { token }, data: { usedAt: new Date() } });

  const jwt = signCoordinatorToken(reset.coordinatorId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COORDINATOR_COOKIE, jwt, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
