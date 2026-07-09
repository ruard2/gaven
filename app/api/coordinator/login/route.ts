import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signCoordinatorToken, COORDINATOR_COOKIE } from "@/lib/coordinatorAuth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Vul e-mail en wachtwoord in" }, { status: 400 });

  const coord = await prisma.coordinator.findFirst({
    where: { email: email.trim().toLowerCase(), status: "active" },
  });
  if (!coord?.passwordHash) {
    return NextResponse.json({ error: "Onbekend e-mailadres of account nog niet geactiveerd" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, coord.passwordHash);
  if (!valid) return NextResponse.json({ error: "Onjuist wachtwoord" }, { status: 401 });

  const token = signCoordinatorToken(coord.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COORDINATOR_COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
